# 大大校园 Backend

Go + Gin. Serves the `/api/v1/` endpoints described in
[`../docs/superpowers/specs/2026-05-12-backend-design.md`](../docs/superpowers/specs/2026-05-12-backend-design.md).

## Storage

Data lives at repo-root [`../data/`](../data/) — one JSON file per school
under `data/schools/<country>/<slug>.json` plus `data/cities.json`. The server
loads every JSON into memory at startup; reads are served from memory, writes
(POST / PUT) update the in-memory map and persist to the same file on disk
(atomic temp+rename). Logo image files live next to their JSON for archival
and version control; they are not served by this backend — `logo` URLs point
at the static CDN as before.

## Quick start

```bash
make run           # start server on :8080 (reads ../data/)
curl localhost:8080/api/v1/cities
```

Add schools through the frontend (`POST /api/v1/schools`) or via curl. There
is no seed step — `data/schools/` is the source of truth.

## Tests

```bash
make test
```

## Embedded web UI

In production builds the backend also serves the React frontend from
`backend/web/dist/` (embedded via `//go:embed`). The Docker build at the repo
root handles this for you. For local dev, run `make dev` from the repo root —
Vite serves the UI on `:5173` and proxies `/api/*` to the Go server on `:8080`.

If you `make run` the backend by itself without a frontend build, requests for
`/` return 404 — only the API is served. To build a self-contained binary
locally:

```bash
(cd ../frontend && npm ci && npm run build)
rm -rf web/dist && cp -r ../frontend/dist web/dist
make build
./bin/ddxy
```

## Docker

See the repo-root README for the fullstack Docker image (web UI + API).

## Env vars

| Var | Default | |
|---|---|---|
| `DDXY_ADDR` | `:8080` | HTTP listen address |
| `DDXY_DATA_DIR` | `./data` | Directory containing `cities.json` and `schools/<country>/*.json` |
| `DDXY_LOG_LEVEL` | `info` | log level (debug/info/warn/error) |
| `DDXY_ADMIN_TOKEN` | (unset) | Bearer token required for POST/PUT; if unset, writes return 401 |
