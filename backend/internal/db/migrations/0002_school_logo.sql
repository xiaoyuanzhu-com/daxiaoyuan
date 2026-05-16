-- +goose Up
ALTER TABLE schools ADD COLUMN logo TEXT;

-- +goose Down
ALTER TABLE schools DROP COLUMN logo;
