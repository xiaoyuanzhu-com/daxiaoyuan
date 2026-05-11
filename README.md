# 大校园 (daxiaoyuan)

「大」取大同、大公、有容乃大之意,主张大学应向所有人敞开。

记录与展示国内大学校园对外开放状况的应用。数据通过公开 API 免费访问。

详见 [docs/PRD.md](docs/PRD.md)。

## 结构

| 目录 | 用途 |
|------|------|
| `backend/` | Go + Gin + SQLite,API 服务 |
| `frontend/` | Vite + React + React Router,Web 站点 |
| `wechat/` | 微信小程序原生 |
| `ios/` | 占位,后续 |
| `android/` | 占位,后续 |
| `docs/` | PRD 与设计文档 |

## 部署

单 Docker 镜像,前端编译后由后端 `go:embed` 一起打包,后端同时承担 API (`/api/*`) 和 SPA fallback。
