# 大大校园 Backend — 设计

> **历史文档说明**：本文档是后端第一版的设计 spec(SQLite + 宽表 + 校园级 root `status`)。仓库后续做了两次重要演进:
>
> 1. **存储**：SQLite 被替换为文件式 JSON(`data/schools/<country>/<slug>.json`),启动时全量读入内存 map。详见 [CLAUDE.md](../../../CLAUDE.md) §数据存储。
> 2. **数据模型**：root 级 `status` / `reservation` 字段被并入 `facilities.campus`,设施由 4 项变为 5 项(`campus` / `library` / `track` / `gym` / `canteen`)。详见 [CLAUDE.md](../../../CLAUDE.md) §数据模型核心约定。
>
> 阅读本文档下面的 SQL schema / API shape 时请脑补这两处差异。当前数据模型 source of truth 是 [CLAUDE.md](../../../CLAUDE.md) 与 `backend/internal/models/`。

## 背景

到目前为止，学校与城市数据各自硬编码在两个客户端里（`frontend/src/data/seed.js` 与 `wechat/utils/data.js`），shape 已经偷偷分叉，无法在 Web、小程序、未来的 iOS/Android 之间共用。

PRD §数据来源与存储 已明确：中心化后端，Go + Gin + SQLite，部署于 `ddxy.xiaoyuanzhu.com`，全部 `GET` 接口公开免鉴权。

本 spec 定义这个后端的**第一版**——只读接口 + 静态城市配置 + 学校表。

## 范围

### 在范围内

- SQLite schema：`schools` 表
- 静态城市配置：`internal/data/cities.json`
- HTTP API（全部 GET）：城市列表 / 学校列表 / 学校详情 / 全量数据导出
- 单 binary 部署 + SQLite 文件持久化
- 学校种子数据导入流程（替换两个客户端里的硬编码）

### 非目标

- **用户共建**（notes / confirms / 提交反馈）—— 暂不实施。PRD §核心功能 仍把它列为长期目标，但当前迭代不做。
- **审核 / 后台 / 写接口** —— 同上,暂不实施
- **账号体系 / openid 收集** —— 同上,暂不实施
- **i18n 字段**：内容默认中文，英文文案作为前端 i18n 层维护，不入库
- **入校说明 `entry` / 时间表 `schedule`**：把用户引到学校官方预约系统看权威信息
- **距离 `distance`**：是 per-user 计算量，前端从 lat/lng 算
- **简称 `short`（PKU/THU）**：中文优先 UI 直接用学校名第一个汉字做头像，未来英文 UI 回归时从 slug 派生

## 技术栈

| 维度 | 选型 | 理由 |
|---|---|---|
| 语言 | Go 1.25+ | PRD 指定。goose v3.27.1 要求 1.25.7,实际 `go.mod` 写 `go 1.25.7` |
| HTTP 框架 | Gin | PRD 指定 |
| 数据库 | SQLite（单文件） | PRD 指定。MVP 量级 < 1k 行学校,sqlite 足够 |
| SQLite 驱动 | `modernc.org/sqlite` | 纯 Go 实现,无 CGO,跨平台编译简单 |
| 迁移工具 | `pressly/goose` | 标准 SQL 文件 + 简单嵌入 |
| JSON 命名 | camelCase（API 层）/ snake_case（DB 层）| API 对齐 JS 客户端惯例,DB 对齐 SQL 惯例 |

## 项目结构

```
backend/
├── README.md
├── go.mod
├── go.sum
├── Makefile                          # build / run / seed / migrate 快捷命令
├── cmd/
│   └── server/
│       └── main.go                   # 入口
├── internal/
│   ├── config/
│   │   └── config.go                 # env: DB_PATH, ADDR, ...
│   ├── data/
│   │   ├── cities.json               # 静态城市配置
│   │   └── cities.go                 # 启动时加载 + 暴露 ByID / ByCode / All
│   ├── db/
│   │   ├── db.go                     # sqlite 打开 + 迁移
│   │   └── migrations/
│   │       └── 0001_init.sql
│   ├── models/
│   │   ├── school.go                 # School struct + JSON 序列化
│   │   ├── facility.go               # Facility / Reservation 结构
│   │   └── city.go
│   ├── handlers/
│   │   ├── cities.go                 # GET /api/v1/cities
│   │   ├── schools.go                # GET /api/v1/schools, /:id
│   │   └── dump.go                   # GET /api/v1/dump.json
│   └── server/
│       ├── router.go                 # gin 路由注册
│       └── middleware.go             # logging / CORS / recovery
└── seed/
    ├── schools.json                  # 学校种子数据(替换当前两端的硬编码)
    └── seed.go                       # 一次性导入工具,从 schools.json 写入 SQLite
```

## 数据模型

### `schools` 表

```sql
CREATE TABLE schools (
    id                    TEXT    PRIMARY KEY,           -- slug, 域名规则: <X>.edu.cn 的 X
    city_id               TEXT    NOT NULL,              -- 引用 cities.json 中的 id
    name                  TEXT    NOT NULL,              -- 中文,如 "北京大学"
    address               TEXT,                          -- 完整地址,如 "北京市海淀区颐和园路 5 号"
    lat                   REAL    NOT NULL,              -- GCJ-02 国测局坐标
    lng                   REAL    NOT NULL,              -- GCJ-02 国测局坐标

    -- 学校整体开放状态(列表卡片上的"一眼标签")
    status                TEXT    NOT NULL CHECK (status IN ('open', 'appt', 'alumni', 'closed')),
    reservation           TEXT,                          -- JSON: 学校级预约入口, NULL 表示无

    -- 4 个固定设施: 每个一对 status + reservation 列
    library_status        TEXT    NOT NULL CHECK (library_status IN ('open', 'appt', 'alumni', 'closed')),
    library_reservation   TEXT,
    track_status          TEXT    NOT NULL CHECK (track_status IN ('open', 'appt', 'alumni', 'closed')),
    track_reservation     TEXT,
    gym_status            TEXT    NOT NULL CHECK (gym_status IN ('open', 'appt', 'alumni', 'closed')),
    gym_reservation       TEXT,
    canteen_status        TEXT    NOT NULL CHECK (canteen_status IN ('open', 'appt', 'alumni', 'closed')),
    canteen_reservation   TEXT,

    -- 长尾设施(游泳馆/博物馆/礼堂...) JSON 数组
    others                TEXT,                          -- JSON: [{kind, name, status, reservation?}]

    last_update           TIMESTAMP NOT NULL,            -- 学校信息最后一次维护时间
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_city ON schools(city_id);
CREATE INDEX idx_schools_status ON schools(status);
```

**status 枚举**（4 值）：

| 值 | 中文标签 | 含义 |
|---|---|---|
| `open` | 完全开放 | 自由出入,无须预约 |
| `appt` | 预约开放 | 需通过预约系统进入 |
| `alumni` | 仅校友 | 只对师生 / 校友开放 |
| `closed` | 未开放 | 暂不对外开放 |

这一套枚举**同时用在学校级和每个设施级**。

### Reservation JSON shape

存在 `reservation` 和 4 个 `*_reservation` 列里：

```json
{
  "qrcodeUrl": "https://placehold.co/600x600/png?text=QR",
  "hint": "关注「参观北大」公众号 → 菜单「个人预约」",
  "link": "https://visit.pku.edu.cn"
}
```

- `qrcodeUrl` 必填：二维码 / 小程序码图片 URL（前端 `<image>` 渲染，长按识别）
- `hint` 必填：人类可读的操作指引
- `link` 可选：H5 / 网页链接（小程序"复制链接"使用；小程序不能直接打开任意 URL）

### `others` JSON 数组 shape

```json
[
  {
    "kind": "swim",
    "name": "游泳馆",
    "status": "appt",
    "reservation": { "qrcodeUrl": "...", "hint": "..." }
  }
]
```

- `kind`：短 slug，稳定标识，作为 i18n key 与图标 key（如 `swim` / `museum` / `auditorium`）
- `name`：中文展示名
- `status`：复用同一套 4 值枚举
- `reservation`：可选，与上文同结构

如果某个 `kind` 用得多了想"晋升"为固定列，一条 SQL 迁移就能搬过去——不破坏现有数据。

## 城市静态配置

`internal/data/cities.json`：

```json
[
  { "id": "bj", "name": "北京", "country": "CN", "code": "110100", "lat": 39.96, "lng": 116.34, "active": true  },
  { "id": "sh", "name": "上海", "country": "CN", "code": "310100", "lat": 31.23, "lng": 121.47, "active": false },
  { "id": "gz", "name": "广州", "country": "CN", "code": "440100", "lat": 23.13, "lng": 113.27, "active": false },
  { "id": "sz", "name": "深圳", "country": "CN", "code": "440300", "lat": 22.54, "lng": 114.06, "active": false },
  { "id": "nj", "name": "南京", "country": "CN", "code": "320100", "lat": 32.06, "lng": 118.79, "active": false },
  { "id": "hz", "name": "杭州", "country": "CN", "code": "330100", "lat": 30.27, "lng": 120.15, "active": false },
  { "id": "wh", "name": "武汉", "country": "CN", "code": "420100", "lat": 30.59, "lng": 114.30, "active": false },
  { "id": "cd", "name": "成都", "country": "CN", "code": "510100", "lat": 30.66, "lng": 104.06, "active": false }
]
```

**字段约定：**

| 字段 | 用途 |
|---|---|
| `id` | 内部 slug，URL / 外键 / 种子数据引用 |
| `name` | 中文展示名，**不带"市"后缀**（与腾讯位置插件 `cityInfo.name` 对齐） |
| `country` | ISO 3166-1 alpha-2，MVP 全是 `"CN"` |
| `code` | GB/T 2260 6 位市级行政区划码（adcode），跨平台映射键 |
| `lat` / `lng` | 城市中心 GCJ-02 坐标，作为地图初始视图 |
| `active` | 是否上线（首期只有北京 = true） |

**为什么用静态文件而不是 DB 表**：城市数据每年变化频率约等于零，全国一线 + 新一线一共十几个；放进 git 比放进 sqlite 更透明（变更走 PR review）、不需要 CRUD 接口、测试时不需要 fixture。

**与 wechat picker 的映射**（[腾讯位置服务城市选择器](https://mp.weixin.qq.com/wxopen/plugindevdoc?appid=wx63ffb7b7894e99ae)）：

```js
// 1. 启动时拉取
const { cities } = await fetch('/api/v1/cities').then(r => r.json());

// 2. 用户点开 picker,选完返回
const cityInfo = citySelector.getCity();
// cityInfo = { id: "110100", name: "北京", fullname: "北京市", location: {...}, pinyin: [...] }

// 3. 用 cityInfo.id (adcode) 查我们的 city
const ourCity = cities.find(c => c.code === cityInfo.id);
// → { id: "bj", name: "北京", code: "110100", ... }

// 4. 用 ourCity.id (slug) 走后续 API
wx.navigateTo({ url: `/pages/city/city?id=${ourCity.id}` });
```

未来其他平台用别的 picker，只要它能吐 adcode 或城市名，同样查 `code` 或 `name` 即可。如果碰到怪平台死活只吐别的格式，再加 `aliases` 字段做兜底。

## HTTP API

所有端点：
- 路径前缀 `/api/v1/`
- 方法：仅 `GET`
- 鉴权：无（PRD §透明）
- Response：`application/json; charset=utf-8`，camelCase 字段
- 错误：HTTP 4xx/5xx + `{ "error": "..." }` body

### `GET /api/v1/cities`

返回所有城市。

```json
{
  "cities": [
    {
      "id": "bj",
      "name": "北京",
      "country": "CN",
      "code": "110100",
      "lat": 39.96,
      "lng": 116.34,
      "active": true,
      "schools": 10,
      "openRate": 0.30
    },
    { "id": "sh", "name": "上海", ..., "schools": 0, "openRate": 0 }
  ]
}
```

`schools`（数量）和 `openRate`（status='open' 占比）由后端从 schools 表实时聚合算出，不存进 cities.json。

### `GET /api/v1/schools`

可选 query 参数：`?city=bj`（按城市过滤）。

```json
{
  "schools": [
    {
      "id": "pku",
      "cityId": "bj",
      "name": "北京大学",
      "address": "北京市海淀区颐和园路 5 号",
      "lat": 39.992,
      "lng": 116.305,
      "status": "appt",
      "lastUpdate": "2026-05-09T08:30:00Z"
    }
  ]
}
```

**注意**：列表端点返回的是**精简字段**——只够卡片渲染（id / name / address / lat / lng / status / lastUpdate）。设施详情和预约入口要拿单个学校才返回，避免列表 payload 膨胀。

### `GET /api/v1/schools/:id`

返回单个学校的完整信息。

```json
{
  "school": {
    "id": "pku",
    "cityId": "bj",
    "name": "北京大学",
    "address": "北京市海淀区颐和园路 5 号",
    "lat": 39.992,
    "lng": 116.305,
    "status": "appt",
    "reservation": {
      "qrcodeUrl": "https://...",
      "hint": "关注「参观北大」公众号 → 菜单「个人预约」",
      "link": "https://visit.pku.edu.cn"
    },
    "facilities": {
      "library": { "status": "closed", "reservation": null },
      "track":   { "status": "closed", "reservation": null },
      "gym":     { "status": "closed", "reservation": null },
      "canteen": { "status": "closed", "reservation": null }
    },
    "others": [
      { "kind": "swim", "name": "游泳馆", "status": "appt", "reservation": { ... } }
    ],
    "lastUpdate": "2026-05-09T08:30:00Z"
  }
}
```

**API shape ≠ DB shape**：DB 是宽表（4×2 设施列），API 是 `facilities` 嵌套对象——更适合客户端渲染。Go handler 负责这一步转换。

学校不存在返回 `404` + `{ "error": "school not found" }`。

### `GET /api/v1/dump.json`

PRD §透明：全量数据导出端点。

```json
{
  "generatedAt": "2026-05-12T10:00:00Z",
  "cities": [...],   // 同 /api/v1/cities
  "schools": [...]   // 所有学校的完整字段 (同 /api/v1/schools/:id 的 school 对象,但是数组)
}
```

供研究者、记者、社区做独立分析。

## 配置 & 部署

**配置（环境变量）：**

| 变量 | 默认 | 含义 |
|---|---|---|
| `DDXY_ADDR` | `:8080` | HTTP 监听地址 |
| `DDXY_DB_PATH` | `./ddxy.db` | SQLite 文件路径 |
| `DDXY_LOG_LEVEL` | `info` | 日志级别 |

**部署形态**：

- 单 binary：`go build -o ddxy ./cmd/server`
- 反向代理（nginx / caddy）做 TLS 终结，转发到 `127.0.0.1:8080`
- SQLite 文件存在持久卷 `/var/lib/ddxy/ddxy.db`
- 备份：每日 GitHub Action 拉数据库快照 push 到公开仓库存档（PRD §透明的承诺）
- 进程管理：systemd unit（具体配置在后续 plan 里）

## 种子数据导入流程

1. 把当前 `wechat/utils/data.js` 里的 10 所北京学校转写为 `backend/seed/schools.json`，shape 对齐 API 详情端点的 `school` 对象
2. 运行 `go run ./seed`（或 `make seed`）从 JSON 读入 + 写入 SQLite
3. `last_update` 由种子 JSON 里手动写 `"lastUpdate": "2026-05-09"`（给运维一个"我刚核对过北大"的手动开关）；缺失时退回到导入时刻

**导入时的字段转换：**

| 当前 `wechat/utils/data.js` | 目标 schools 表 | 处理 |
|---|---|---|
| `id: "thu"` | `id: "tsinghua"` | slug 改名（tsinghua.edu.cn） |
| `id: "minzu"` | `id: "muc"` | slug 改名（muc.edu.cn） |
| `status: "daytime"` (人大/民大/北师大) | `status: "open"` | daytime 从枚举里删了，重归类 |
| `name: "..."` | `name` | 直接搬 |
| `district: "海淀区"` | `address` 留空 | district 字段废弃；address 等真有数据时再补 |
| `distance: 2.4` | — | 删，per-user 由前端算 |
| `short: "PKU"` | — | 删 |
| `confirms: 47` | — | 删（无真共建数据） |
| `notes: [...]` | — | 删（共建暂不实施） |
| `entry: [...]` | — | 删（引用户去学校官方系统） |
| `schedule: {...}` | — | 删（同上） |
| `facilities.walk` | — | 删，校园即学校,语义并到 school.status |
| `facilities.{library,track,gym,canteen}.status` | `{kind}_status` | 直接搬 |
| `facilities.{library,track,gym,canteen}.reservation` | `{kind}_reservation` | 直接搬（JSON） |
| `reservation` (校园级) | `reservation` (学校级) | 直接搬（JSON） |
| `lat / lng` | `lat / lng` | 直接搬（确认是 GCJ-02） |
| (新增) | `city_id: "bj"` | 全部固定为 `"bj"`（北京） |
| `lastUpdate: "3 天前"` | `last_update: <ISO>` | 字符串相对时间 → 时间戳；种子 JSON 里手动指定 |

## 与现有前端的接入

本 spec 只覆盖后端实现。两端接入由独立的 plan 处理：

1. **wechat** 把 `wechat/utils/data.js` 改成调 `/api/v1/...`，封装一层 fetch helper
2. **frontend (Web)** 同上，替换 `frontend/src/data/seed.js`

## 待回答的问题

- `GET /api/v1/dump.json` 是否要做 ETag / Last-Modified 缓存？低频请求，先不做，等真有抓取者再加。
- CORS：是否对所有 Origin 开放？倾向 `Access-Control-Allow-Origin: *`（PRD §透明：任何人可调用），但需要确认。
