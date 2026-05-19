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

`backend/` —— Go + Gin，部署于 `ddxy.xiaoyuanzhu.com`。

设计文档：[docs/superpowers/specs/2026-05-12-backend-design.md](docs/superpowers/specs/2026-05-12-backend-design.md)

四个 GET 接口（全部公开免鉴权）：

- `GET /api/v1/cities` — 城市列表 + 每城市的 schools 数量 / openRate
- `GET /api/v1/schools[?city=<id>]` — 学校列表（精简字段）
- `GET /api/v1/schools/:id` — 学校详情（含 facilities / reservation）
- `GET /api/v1/dump.json` — 全量导出

JSON 字段：API + 磁盘存储统一 camelCase（`cityId`, `lastUpdate`）。

本地起后端：

```bash
cd backend
make run        # :8080 启动；读取 ../data/ 下所有 JSON 到内存
```

数据真理来源是仓库根 `data/` 目录（详见下节）。新增 / 编辑学校通过前端 UI
(`POST` / `PUT /api/v1/schools`)：handler 同时更新内存 map 并 atomic 写回
对应 JSON 文件。**没有 seed 机制**——`data/schools/` 已经是源代码的一部分，
直接读取即可。

## 数据存储（仓库根 `data/`）

```
data/
  cities.json                       # 城市列表（reference data）
  schools/
    cn/
      pku.json                      # 一所学校一个 JSON
      pku.svg                       # 校徽源文件，sibling 放置；CDN 上传后由
      fudan.json                    #   静态站点 https://static.ddxy.xiaoyuanzhu.com 提供
      fudan.svg
      ...
```

- **slug = 文件名**：`data/schools/<country>/<slug>.json`。`<country>` 是 ISO
  小写代码，从 cityId → cities.json → country 推导出来，写入时由后端自动选择
  目录。
- **没有 DB**：所有学校 JSON 在 server 启动时一次性 load 进
  `map[slug]School`。读 hits-内存，写 hits-内存-and-disk。重启不丢数据，因为
  数据本身就是 git 跟踪的文件。
- **logo 文件**：committed 到仓库（与 JSON 同目录），但后端**不**直接 serve；
  `logo` 字段仍是 `https://static.ddxy.xiaoyuanzhu.com/schools/<country>/<slug>.<ext>`
  这种 CDN URL。上传是离线步骤，前端 `<img onError>` 容忍 CDN 暂时 404。
- **写流程 atomic**：handler 写一个 `data/schools/cn/.<slug>.*.tmp` 然后
  `rename` 到目标，避免半写入文件。
- **数据目录**：固定为 cwd 下的 `./data`，没有 env var 可调。`make run` 用
  `cd .. && exec backend/bin/ddxy` 从仓库根启动。容器里 `WORKDIR=/app`，数据
  baked 在 `/app/data/`；生产部署把宿主机的 `data/` bind-mount 到
  `/app/data` 即可，避免镜像内 baked 数据被新版本覆盖丢失。

## 数据模型核心约定

- **学校 ID 用 slug**：规则是「学校官网 `https://www.<X>.edu.cn` 中的 `<X>`」（pku / tsinghua / ruc / bnu …）。这保证全局唯一,不需要额外消歧。
- **status 枚举（5 值）**：`open` 完全开放 / `appt` 开放预约 / `restricted` 限制预约 / `alumni` 仅限校友 / `closed` 暂不开放。学校级和设施级共用同一套枚举。视觉上 `open`+`appt` 共用绿，`restricted`+`alumni` 共用橙，`closed` 灰。
- **设施（固定 5 项）**：`campus` / `library` / `track` / `gym` / `canteen`。`campus` 代表整个校园的开放状态(原 root 级 `status` / `reservation`),其余四项为具体设施。客户端渲染时建议把 `campus` 放第一位。长尾设施（游泳馆等）放在 `others` JSON 数组,带 `kind` slug + 中文 `name`。
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
