# 大大校园 Backend

Go + Gin + SQLite. Serves the `/api/v1/` endpoints described in
[`../docs/superpowers/specs/2026-05-12-backend-design.md`](../docs/superpowers/specs/2026-05-12-backend-design.md).

## Quick start

```bash
make run           # start server on :8080 (auto-runs migrations on first boot)
curl localhost:8080/api/v1/cities
```

The DB starts empty. Add schools through the frontend (`POST /api/v1/schools`)
or via curl. There is no seed step — `ddxy.db` is the source of truth.

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
| `DDXY_DB_PATH` | `./ddxy.db` | SQLite file path |
| `DDXY_LOG_LEVEL` | `info` | log level (debug/info/warn/error) |
