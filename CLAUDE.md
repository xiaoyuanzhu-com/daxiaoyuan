# 大大校园 — Repo guidance for Claude

## 项目使命

大大校园是一个推动大学向社会开放的信息透明工具。详见 [docs/PRD.md](docs/PRD.md)。两条使命：(1) 帮助公众获取大学开放信息；(2) 推动大学向社会开放。具体定位与价值观见 PRD。

## 客户端独立性（架构原则）

> **各客户端永远不共享代码,只通过中心 backend API 共享数据。**

当前与未来的客户端：
- `frontend/` — Web (Vite + React)
- `wechat/` — 微信小程序（原生）
- 未来：iOS、Android — 各自原生

**这意味着：**

- 不要为多端共享而引入 cross-client 的 lib / npm 包 / git submodule / monorepo workspace 共享
- 每个客户端用自己最合适的原生技术栈实现（Web → React、wechat → 原生小程序、iOS → Swift、Android → Kotlin）
- 同一份数据 / 业务逻辑在每个客户端会被独立实现一遍 —— 这是有意的设计 trade-off，换来的是每端可以最大化利用平台原生能力（小程序的 picker plugin、iOS 的 widget、Android 的 intent 等）
- 跨端的一致性由 backend 的 HTTP API contract 保证（`/api/v1/...`）—— 客户端通过调相同的接口拿到相同的数据
- 如果某段逻辑在多端都需要（比如「Haversine 距离计算」），在每端各写一份，不抽公共 npm/包

**为什么这样选：**

- 多端共享代码的诱惑是真的（DRY），但代价是把所有端绑到同一套抽象 / 同一个发布节奏 / 同一种 bug。对一个小项目来说收益不抵成本。
- 客户端 UI 代码本就高度平台依赖，强行抽象出来的「shared component」最后总会成为一个谁也用不顺手的妥协方案
- 后端 API 是真正的「single source of truth」—— 这是 PRD §透明 的技术体现

## 后端

`backend/` —— Go + Gin + SQLite，部署于 `ddxy.xiaoyuanzhu.com`。

设计文档：[docs/superpowers/specs/2026-05-12-backend-design.md](docs/superpowers/specs/2026-05-12-backend-design.md)

四个 GET 接口（全部公开免鉴权）：

- `GET /api/v1/cities` — 城市列表 + 每城市的 schools 数量 / openRate
- `GET /api/v1/schools[?city=<id>]` — 学校列表（精简字段）
- `GET /api/v1/schools/:id` — 学校详情（含 facilities / reservation）
- `GET /api/v1/dump.json` — 全量导出

JSON 字段：API 层 camelCase（`cityId`, `lastUpdate`），DB 层 snake_case（`city_id`, `last_update`）。

本地起后端：

```bash
cd backend
make run        # :8080 启动；首次会自动建库 + 跑 migration
```

DB 是数据真理来源(`backend/ddxy.db`)。新增 / 编辑学校通过前端 UI(`POST` / `PUT
/api/v1/schools`)。**没有 seed 机制**——避免误跑覆盖已有数据；首次起服务时 DB
为空，从 UI 添加学校即可。

## 数据模型核心约定

- **学校 ID 用 slug**：规则是「学校官网 `https://www.<X>.edu.cn` 中的 `<X>`」（pku / tsinghua / ruc / bnu …）。这保证全局唯一,不需要额外消歧。
- **status 枚举（4 值）**：`open` / `appt` / `alumni` / `closed`。学校级和设施级共用同一套枚举。
- **设施（固定 4 项）**：`library` / `track` / `gym` / `canteen`。长尾设施（游泳馆等）放在 `others` JSON 数组,带 `kind` slug + 中文 `name`。
- **「校园」不是设施**：校园整体的开放状态 = 学校的 `status` 字段本身。详情页设施列表只显示 4 项。
- **城市配置静态化**：`backend/internal/data/cities.json`,不在 DB 里。GB/T 2260 adcode 用作跨平台 picker 映射键。
- **内容默认中文**：学校名、地址、提示文案全部只存中文。英文文案作为前端 i18n 层维护,不入库。

## 用户共建（暂不实施）

PRD §核心功能 把「用户共建」列为长期目标,但当前迭代不做。涉及的字段（notes / confirms / 提交者身份）都不在 schema 里。如果用户提到「共建」「用户反馈」「提交修正」相关需求,先确认这是不是要重新开启该方向 —— 重启则需要新一轮 schema 设计。

## 工作习惯

- 当前所有开发在 `main` 分支上进行（小项目,solo dev）。涉及多步实现的工作可以用 superpowers 的 brainstorming → spec → plan → execute 流程,但 brand new 想法 / 探索性问题不需要。
- 不要在不必要的地方加注释 / 文档 / fallback 逻辑。YAGNI。
- 看到「scope A / scope B」类历史用语,知道那是 backend 第一版的内部用语,新文档别再用。

## 当前迭代

- ✅ Backend MVP 完成（GET 接口 + PUT/POST 编辑接口）
- ✅ Web 端可直接编辑 / 新建学校（无鉴权 / 无审计，maintainer 自用）
- 🚧 wechat 接入后端 API,替换硬编码 `data.js`
- 📋 后续：把项目部署到 `ddxy.xiaoyuanzhu.com`、扩到更多城市
