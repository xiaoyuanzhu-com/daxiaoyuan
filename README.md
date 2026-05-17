# 大大校园 (daxiaoyuan)

「大」取大同、大公、有容乃大之意,主张大学应向所有人敞开。

记录与展示国内大学校园对外开放状况的应用。数据通过公开 API 免费访问。

详见 [docs/PRD.md](docs/PRD.md)。

## 结构

| 目录 | 用途 |
|------|------|
| `backend/` | Go + Gin,API 服务（数据存在仓库 `data/` 下的 JSON 文件里，无 DB） |
| `frontend/` | Vite + React + React Router,Web 站点 |
| `wechat/` | 微信小程序原生 |
| `ios/` | 占位,后续 |
| `android/` | 占位,后续 |
| `docs/` | PRD 与设计文档 |

## 部署

单 Docker 镜像，前端 build 后由后端 `go:embed` 打进同一个二进制，后端同时
承担 API (`/api/*`) 和 SPA fallback。镜像默认 `WORKDIR=/app`，数据 baked
在 `/app/data/`，运行时由 nonroot (UID 65532) 用户启动。

### 本地

```bash
make docker-build
make docker-run     # :8080，repo 根的 data/ 挂到 /app/data
```

### 生产（首次部署）

```bash
# 1. 准备宿主机数据目录（持久化用户在 web UI 上的编辑）
sudo mkdir -p /srv/ddxy/data

# 2. 用镜像里 baked 的数据 seed 一次
docker create --name ddxy-seed ghcr.io/xiaoyuanzhu-com/dadaxiaoyuan:latest
docker cp ddxy-seed:/app/data/. /srv/ddxy/data/
docker rm ddxy-seed

# 3. 设置权限：镜像里跑 nonroot (UID 65532)，要让它能写回
sudo chown -R 65532:65532 /srv/ddxy/data

# 4. 启动
docker run -d --name ddxy \
  -p 8080:8080 \
  -v /srv/ddxy/data:/app/data \
  -e DDXY_ADMIN_TOKEN=<long-random-string> \
  --restart unless-stopped \
  ghcr.io/xiaoyuanzhu-com/dadaxiaoyuan:latest
```

前面挂 nginx / Caddy 做 HTTPS termination 反代到 `:8080`。

### 更新

```bash
docker pull ghcr.io/xiaoyuanzhu-com/dadaxiaoyuan:latest
docker stop ddxy && docker rm ddxy
# 重跑上面的 docker run（环境变量、端口、挂载都一样）
```

数据在 `/srv/ddxy/data`，镜像换了不会动。

### 把生产数据回流到仓库

`data/` 既是仓库源代码也是运行时数据。生产上通过 web UI 改的内容定期 rsync
回开发机，commit 进仓库即可：

```bash
rsync -av --delete user@host:/srv/ddxy/data/ ./data/
git add data && git commit -m "data: sync from prod $(date -I)"
```

### 备份

数据就是 JSON + logo 图片，直接 tar 就行：

```bash
sudo tar -czf ddxy-$(date +%Y%m%d).tar.gz -C /srv/ddxy data
```

### CI / 镜像发布

`.github/workflows/docker.yml` 推 GHCR。触发条件：push 到 `main` 且改了
`backend/**` / `frontend/**` / `Dockerfile`，或打 `v*` tag，或手动
`workflow_dispatch`。多架构：`linux/amd64` + `linux/arm64`。

### 环境变量

| Var | 说明 |
|---|---|
| `DDXY_ADDR` | 监听地址，默认 `:8080` |
| `DDXY_LOG_LEVEL` | `debug` 会让 gin 进 debug 模式，默认 `info` |
| `DDXY_ADMIN_TOKEN` | 写接口 (POST/PUT `/api/v1/schools`) 的 Bearer token。**不设的话所有写请求会 401**，等于只读模式。 |
