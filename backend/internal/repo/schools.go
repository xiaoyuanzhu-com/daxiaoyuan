package repo

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
)

type Schools struct {
	db *sql.DB
}

func NewSchools(db *sql.DB) *Schools {
	return &Schools{db: db}
}

// CityStats holds aggregate counts for one city.
type CityStats struct {
	Total int
	Open  int // schools where status='open'
}

const summaryCols = `id, city_id, name, address, lat, lng, status, last_update`

func (s *Schools) List(ctx context.Context, cityID string) ([]models.SchoolSummary, error) {
	q := `SELECT ` + summaryCols + ` FROM schools`
	args := []any{}
	if cityID != "" {
		q += ` WHERE city_id = ?`
		args = append(args, cityID)
	}
	q += ` ORDER BY id`
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query schools: %w", err)
	}
	defer rows.Close()
	out := []models.SchoolSummary{}
	for rows.Next() {
		sch, err := scanSummary(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sch)
	}
	return out, rows.Err()
}

func scanSummary(rows *sql.Rows) (models.SchoolSummary, error) {
	var sch models.SchoolSummary
	var addr sql.NullString
	if err := rows.Scan(&sch.ID, &sch.CityID, &sch.Name, &addr, &sch.Lat, &sch.Lng, &sch.Status, &sch.LastUpdate); err != nil {
		return sch, err
	}
	if addr.Valid {
		sch.Address = addr.String
	}
	return sch, nil
}

const detailCols = `
	id, city_id, name, address, lat, lng, status, reservation,
	library_status, library_reservation,
	track_status, track_reservation,
	gym_status, gym_reservation,
	canteen_status, canteen_reservation,
	others, last_update`

func (s *Schools) Get(ctx context.Context, id string) (*models.School, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+detailCols+` FROM schools WHERE id = ?`, id)
	sch, err := scanDetail(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return sch, nil
}

// ListAllDetail returns every school in full detail form (used by dump endpoint).
func (s *Schools) ListAllDetail(ctx context.Context) ([]*models.School, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT `+detailCols+` FROM schools ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("query schools detail: %w", err)
	}
	defer rows.Close()
	out := []*models.School{}
	for rows.Next() {
		sch, err := scanDetail(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sch)
	}
	return out, rows.Err()
}

// scanner is satisfied by both *sql.Row and *sql.Rows.
type scanner interface {
	Scan(dest ...any) error
}

func scanDetail(sc scanner) (*models.School, error) {
	var sch models.School
	var addr, resv, libRes, trkRes, gymRes, canRes, others sql.NullString
	var libStat, trkStat, gymStat, canStat string

	if err := sc.Scan(
		&sch.ID, &sch.CityID, &sch.Name, &addr, &sch.Lat, &sch.Lng, &sch.Status, &resv,
		&libStat, &libRes,
		&trkStat, &trkRes,
		&gymStat, &gymRes,
		&canStat, &canRes,
		&others, &sch.LastUpdate,
	); err != nil {
		return nil, err
	}
	if addr.Valid {
		sch.Address = addr.String
	}
	if resv.Valid {
		var r models.Reservation
		if err := json.Unmarshal([]byte(resv.String), &r); err != nil {
			return nil, fmt.Errorf("decode school.reservation: %w", err)
		}
		sch.Reservation = &r
	}
	sch.Facilities = map[string]models.Facility{}
	for _, p := range []struct {
		key    string
		status string
		resv   sql.NullString
	}{
		{"library", libStat, libRes},
		{"track", trkStat, trkRes},
		{"gym", gymStat, gymRes},
		{"canteen", canStat, canRes},
	} {
		f, err := parseFacility(p.status, p.resv)
		if err != nil {
			return nil, err
		}
		sch.Facilities[p.key] = f
	}
	sch.Others = []models.Other{}
	if others.Valid {
		if err := json.Unmarshal([]byte(others.String), &sch.Others); err != nil {
			return nil, fmt.Errorf("decode school.others: %w", err)
		}
	}
	return &sch, nil
}

func parseFacility(status string, resv sql.NullString) (models.Facility, error) {
	f := models.Facility{Status: status}
	if resv.Valid {
		var r models.Reservation
		if err := json.Unmarshal([]byte(resv.String), &r); err != nil {
			return f, fmt.Errorf("decode facility.reservation: %w", err)
		}
		f.Reservation = &r
	}
	return f, nil
}

func (s *Schools) Insert(ctx context.Context, sch *models.School) error {
	resvJSON, err := marshalNull(sch.Reservation)
	if err != nil {
		return err
	}
	libRes, err := marshalNull(sch.Facilities["library"].Reservation)
	if err != nil {
		return err
	}
	trkRes, err := marshalNull(sch.Facilities["track"].Reservation)
	if err != nil {
		return err
	}
	gymRes, err := marshalNull(sch.Facilities["gym"].Reservation)
	if err != nil {
		return err
	}
	canRes, err := marshalNull(sch.Facilities["canteen"].Reservation)
	if err != nil {
		return err
	}
	var othersJSON sql.NullString
	if len(sch.Others) > 0 {
		b, err := json.Marshal(sch.Others)
		if err != nil {
			return err
		}
		othersJSON = sql.NullString{String: string(b), Valid: true}
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT OR REPLACE INTO schools (
			id, city_id, name, address, lat, lng, status, reservation,
			library_status, library_reservation,
			track_status, track_reservation,
			gym_status, gym_reservation,
			canteen_status, canteen_reservation,
			others, last_update
		) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		sch.ID, sch.CityID, sch.Name, nullStr(sch.Address), sch.Lat, sch.Lng, sch.Status, resvJSON,
		sch.Facilities["library"].Status, libRes,
		sch.Facilities["track"].Status, trkRes,
		sch.Facilities["gym"].Status, gymRes,
		sch.Facilities["canteen"].Status, canRes,
		othersJSON, sch.LastUpdate.UTC(),
	)
	return err
}

func marshalNull(r *models.Reservation) (sql.NullString, error) {
	if r == nil {
		return sql.NullString{}, nil
	}
	b, err := json.Marshal(r)
	if err != nil {
		return sql.NullString{}, err
	}
	return sql.NullString{String: string(b), Valid: true}, nil
}

func nullStr(v string) sql.NullString {
	if v == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: v, Valid: true}
}

// CountByCity returns total + open-status counts per city_id present in
// the schools table.
func (s *Schools) CountByCity(ctx context.Context) (map[string]CityStats, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT city_id,
		       COUNT(*) AS total,
		       SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open
		FROM schools
		GROUP BY city_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]CityStats{}
	for rows.Next() {
		var cid string
		var total, openN int
		if err := rows.Scan(&cid, &total, &openN); err != nil {
			return nil, err
		}
		out[cid] = CityStats{Total: total, Open: openN}
	}
	return out, rows.Err()
}
