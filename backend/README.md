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

## Env vars

| Var | Default | |
|---|---|---|
| `DDXY_ADDR` | `:8080` | HTTP listen address |
| `DDXY_DB_PATH` | `./ddxy.db` | SQLite file path |
| `DDXY_LOG_LEVEL` | `info` | log level (debug/info/warn/error) |
