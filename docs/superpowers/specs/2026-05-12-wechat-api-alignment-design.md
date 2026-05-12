# wechat 接入 backend API — 设计

## 背景

backend MVP 已经实现 ([backend-design.md](2026-05-12-backend-design.md))，公开 4 个 GET 接口。当前 wechat 小程序通过 `wechat/utils/data.js` 硬编码 10 所北京学校 + 8 个城市。

本 spec 把 wechat 客户端切换到走 backend API,作为数据源。

**配合 CLAUDE.md §客户端独立性**：本次改造只动 wechat,不引入跨端共享代码。其他客户端（web、未来的 iOS/Android）通过同样的 backend API 各自独立实现。

## 范围

### 在范围内

- 新增 `wechat/utils/api.js` —— 薄 HTTP 包装,封装 4 个 GET 接口
- 新增 `wechat/utils/distance.js` —— Haversine 距离计算
- 替换 4 个 Page（home / cities / detail / about）的数据来源,从硬编码 → API
- shape 调整以对齐 backend：
  - 设施从 5 项（含 walk）减到 4 项（library / track / gym / canteen）
  - status 从 5 值（含 daytime）减到 4 值（open / appt / alumni / closed）
  - 卡片副标题：`"海淀区 · 2.4km · 47人确认"` → `"北京 · 2.4km"`（城市名 + 实时距离）
  - 详情页头像首字符仍用 `name.charAt(0)`（中文优先,backend 不再提供 short）
- 加载态 + 错误态 + retry
- 删除 `wechat/utils/data.js`

### 非目标

- **跨城市学校列表的真实切换**：当前 home.js 切城市后只更新 chip + 地图中心,school list 不变（注释里有 TODO）。本 spec 借机修好——切城市重新拉 `/api/v1/schools?city=<id>`。这是 alignment 顺手做的小改进,不是新功能。
- **缓存层 / app 级状态**：每次进入页面 fetch 一次。Cities 列表在 picker 打开时拉。后续真的有性能问题再加。
- **搜索功能**：home.js 现状是个 toast 占位符（"搜索功能开发中"）。alignment 不动它。
- **wechat unit test 框架**：小程序生态里没有标准 unit test。验证靠 wechat dev tools 手动过流程。

## 配置 & 环境

### apiBase 切换

`wechat/app.js` 已经有 `globalData.apiBase = 'https://ddxy.xiaoyuanzhu.com'`。

dev 时需要打到本地后端。小程序没有标准的 build-time env 机制（不像 Vite 的 `.env.*`）。**用局域网 IP + 注释 + 发布 checklist**：

```js
// wechat/app.js
App({
  globalData: {
    // DEV: 'http://<your-LAN-IP>:8080'  (e.g. 'http://192.168.1.42:8080')
    // PROD: 'https://ddxy.xiaoyuanzhu.com'
    // 发布前必须改回 production!
    apiBase: 'http://192.168.1.42:8080',  // ← 改成你的机器局域网 IP
  },
});
```

**为什么用 LAN IP 而不是 localhost**：开发者工具的模拟器和 localhost 都能跑,但真机调试时手机走 wifi 访问开发机就必须走局域网 IP。一开始就用 LAN IP,模拟器和真机都通,省一次配置切换。

**怎么拿你的 LAN IP**：

```bash
# macOS
ipconfig getifaddr en0     # wifi 接口,通常返回 192.168.x.x 或 10.x.x.x

# Linux
hostname -I | awk '{print $1}'
```

`README.md`（wechat 目录下没有就新建）记一句"发布前 checklist：apiBase 设为 production"。

**为什么不更精巧**：用 `__wxConfig.envVersion` 区分 dev/release 是动态判断,可行但增加复杂度,而且 release 版本通常也要先在测试环境跑一遍 —— 那时仍然需要手动 toggle。MVP 阶段一行注释 + 一行配置足够。

### localhost 网络白名单

小程序默认禁止访问非备案域名（包括 localhost）。dev 环境下需要在 wechat 开发者工具的「详情 → 本地设置」勾选「不校验合法域名」。这一步进 wechat 接入 plan 的「dev 准备」段落。

## 架构

### 新文件 `wechat/utils/api.js`

```js
const app = getApp();

function url(path) {
  return app.globalData.apiBase + path;
}

function request(path) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: url(path),
      method: 'GET',
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.data && res.data.error || 'unknown'}`));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || 'request failed')),
    });
  });
}

exports.fetchCities  = () => request('/api/v1/cities').then((d) => d.cities);
exports.fetchSchools = (cityId) => request(`/api/v1/schools?city=${cityId}`).then((d) => d.schools);
exports.fetchSchool  = (id) => request(`/api/v1/schools/${id}`).then((d) => d.school);
```

调用方拿到 `Promise`,自己 `try/catch` + `setData`。错误返回 `Error` 实例。

### 新文件 `wechat/utils/distance.js`

```js
// Haversine — km between two GCJ-02 points. Good enough for short distances
// (< 100 km); we don't need WGS84 conversion since both ends are GCJ-02.
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

exports.distanceKm = distanceKm;
```

调用方拿到 km 数后 `toFixed(1)` 展示。如果用户位置未拿到,distance 字段 = `null`,卡片副标题降级为 `"北京"`（只显示城市名）。

### 数据流（首页）

```
onLoad:
  1. wx.getLocation()                  → 拿到 userLat/userLng
  2. fetchCities()                     → 拿到 cities,定位当前城市
  3. fetchSchools(currentCityId)       → 拿到 schools list
  4. schools.map(s => ({...s, distance: distanceKm(userLat, userLng, s.lat, s.lng)}))
  5. decorateSchool(school) →           带 statusKey / facilitiesList / 等渲染派生字段
  6. setData → 渲染地图 + 列表

切换城市:
  1. picker 返回 ourCity.id
  2. fetchSchools(ourCity.id)
  3. recompute markers + groups
```

`wx.getLocation` 失败时（用户拒绝授权）：跳过距离计算,卡片显示纯城市名。**不强求授权**。

### `decorate.js` 改动

当前的 `decorateSchool` 已经对每个 facility 做了 `STATUS[f.status]` 查表。接入 API 后入参就是 backend 详情 shape（`facilities: { library: {status, reservation?}, ... }`,4 项）—— `decorateSchool` 的逻辑几乎不变,只需要：

- 不再处理 walk 字段（API 不提供）
- 不再使用 `s.name.charAt(0)`(已经是中文了,保持不变)
- 加一个 `distance` 字段（如果调用方传入）

详情页的 decorate 还需要给 `facilitiesList` 排序成 `[library, track, gym, canteen]` 的稳定顺序（map 的 key 顺序在 JS 里不保证）。

### `status.js` 改动

```js
const STATUS = {
  open:   { ... },
  appt:   { ... },
  alumni: { ... },
  closed: { ... },
  // daytime 删除
};

const FACILITIES = {
  library: { ... },
  track:   { ... },
  gym:     { ... },
  canteen: { ... },
  // walk 删除
};

const STATUS_ORDER = ['open', 'appt', 'alumni', 'closed'];
```

`app.wxss` 中的 `.status-daytime` / `.dot-daytime` / `.bg-daytime` 类也清掉。地图 marker 的 `STATUS_COLOR` 表（home.js）也去掉 daytime 行。

### 加载 / 错误态

每个页面用同一种简单模式：

```js
data: {
  loading: true,
  error: '',
  // ... actual data
}

// 在 loading=true 时 WXML 渲染 "加载中…"
// error !== '' 时渲染错误提示 + "重试" 按钮（绑 onLoad）
// 都为 false 时渲染正常内容
```

`wx.showToast` 用于「切换城市失败」之类的非阻断错误。

## 关键文件改动清单

| 文件 | 操作 |
|---|---|
| `wechat/utils/api.js` | **新增** |
| `wechat/utils/distance.js` | **新增** |
| `wechat/utils/data.js` | **删除** |
| `wechat/app.js` | dev/prod apiBase 注释 |
| `wechat/utils/decorate.js` | 砍 walk 处理,加 distance 字段透传 |
| `wechat/utils/status.js` | 删 daytime + walk 枚举项 |
| `wechat/app.wxss` | 删 `.status-daytime` / `.bg-daytime` / `.dot-daytime` / `.bg-walk` 等不再用的 class |
| `wechat/pages/home/home.js` | 全面重写数据加载逻辑 |
| `wechat/pages/home/home.wxml` | 加 loading / error 视图 |
| `wechat/pages/cities/cities.js` | 从 `data.js` import → `fetchCities()` |
| `wechat/pages/detail/detail.js` | 从 `findSchool(id)` → `fetchSchool(id)` |
| `wechat/pages/about/about.js` | 不动（不依赖数据） |

## 测试策略

小程序没有 unit test 框架；用 wechat 开发者工具手动验证：

**Happy path 验证清单：**

1. 启动 dev backend（`cd backend && make seed && make run`）
2. 打开 wechat 开发者工具,运行小程序,授予 location
3. 首页：
   - [ ] 列表显示 10 所学校
   - [ ] 地图显示 10 个 markers,callout 展示学校简称 + 状态色
   - [ ] 每张卡片副标题显示"北京 · X.Xkm"格式
   - [ ] 状态筛选生效,设施筛选生效
4. 切换城市：
   - [ ] 城市列表显示 8 个（1 个 active + 7 个 soon）
   - [ ] 选北京：列表 / 地图刷新（仍 10 所）
   - [ ] 其他城市暂未实现切换效果（仅刷新 chip 是当前可接受行为,因 backend 没数据）
5. 详情页：
   - [ ] 任一学校进入：状态 / 设施 4 项 / 预约（如有）正常
   - [ ] PKU 预约入口可点开,QR 码 placeholder 显示
   - [ ] BUPT 详情显示「未开放」+ 4 项全部 closed
6. 错误态：
   - [ ] 停掉 backend,首页重新加载：显示"加载失败" + 重试
   - [ ] 点重试,backend 恢复后正常

**网络白名单确认**：开发者工具 → 详情 → 本地设置 → 「不校验合法域名…」勾选。

## 已确认的边界

- **dev URL**：用局域网 IP（覆盖开发者工具 + 真机调试两种场景）—— 见上文「配置 & 环境」。
- **tabbar 图标 / `vendor.png`**：和本次改动无关,不动。
