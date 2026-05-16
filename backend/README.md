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

## Docker

Build and run locally:

```bash
make docker-build
make docker-run    # mounts ./.docker-data to /data for DB persistence
```

Pull the latest published image from GHCR:

```bash
docker pull ghcr.io/xiaoyuanzhu-com/dadaxiaoyuan-backend:latest
docker run --rm -p 8080:8080 -v $(pwd)/data:/data \
  ghcr.io/xiaoyuanzhu-com/dadaxiaoyuan-backend:latest
```

Images are published by `.github/workflows/backend-docker.yml` on every push to
`main` that touches `backend/**`, and on `backend-v*` tags. Multi-arch:
`linux/amd64` + `linux/arm64`.

## Env vars

| Var | Default | |
|---|---|---|
| `DDXY_ADDR` | `:8080` | HTTP listen address |
| `DDXY_DB_PATH` | `./ddxy.db` | SQLite file path |
| `DDXY_LOG_LEVEL` | `info` | log level (debug/info/warn/error) |
