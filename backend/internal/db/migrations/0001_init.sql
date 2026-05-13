-- +goose Up
CREATE TABLE schools (
    id                    TEXT    PRIMARY KEY,
    city_id               TEXT    NOT NULL,
    name                  TEXT    NOT NULL,
    address               TEXT,
    lat                   REAL    NOT NULL,
    lng                   REAL    NOT NULL,
    status                TEXT    NOT NULL CHECK (status IN ('open', 'appt', 'alumni', 'closed')),
    reservation           TEXT,
    library_status        TEXT    NOT NULL CHECK (library_status IN ('open', 'appt', 'alumni', 'closed')),
    library_reservation   TEXT,
    track_status          TEXT    NOT NULL CHECK (track_status IN ('open', 'appt', 'alumni', 'closed')),
    track_reservation     TEXT,
    gym_status            TEXT    NOT NULL CHECK (gym_status IN ('open', 'appt', 'alumni', 'closed')),
    gym_reservation       TEXT,
    canteen_status        TEXT    NOT NULL CHECK (canteen_status IN ('open', 'appt', 'alumni', 'closed')),
    canteen_reservation   TEXT,
    others                TEXT,
    search_text           TEXT    NOT NULL DEFAULT '',
    last_update           TIMESTAMP NOT NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_city ON schools(city_id);
CREATE INDEX idx_schools_status ON schools(status);
CREATE INDEX idx_schools_search ON schools(search_text);

-- +goose Down
DROP INDEX IF EXISTS idx_schools_status;
DROP INDEX IF EXISTS idx_schools_city;
DROP TABLE IF EXISTS schools;
