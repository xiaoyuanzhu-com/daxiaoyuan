# 大大校园 Backend

Go + Gin + SQLite. Serves the read-only `/api/v1/` endpoints described in
[`../docs/superpowers/specs/2026-05-12-backend-design.md`](../docs/superpowers/specs/2026-05-12-backend-design.md).

## Quick start

```bash
make seed          # populate ddxy.db with the 10 Beijing schools
make run           # start server on :8080
curl localhost:8080/api/v1/cities
```

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
