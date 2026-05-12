# wechat 接入 backend API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 wechat 小程序的数据源从 `wechat/utils/data.js` 硬编码切换到 backend API（[2026-05-12-wechat-api-alignment-design.md](../specs/2026-05-12-wechat-api-alignment-design.md)）。

**Architecture:** 新增 `api.js`(薄 HTTP 包装) + `distance.js`(Haversine);改造 home / cities / detail 三个页面拿数据的方式;清理 status.js / decorate.js / app.wxss 中 daytime 与 walk 的残留;删除 data.js。每页加 loading / error / retry。

**Tech Stack:** wechat 原生小程序 (JS) + `wx.request` + `wx.getLocation`。无 unit test 框架,验证靠 wechat 开发者工具手动 smoke。

**Working directory:** `/Users/iloahz/projects/dadaxiaoyuan`(repo root)。`wechat/` 是小程序目录。

**Repo branch:** `main`(solo dev,直接 main,已 confirm)

**配套依赖:** 已部署到 `main` 的 backend(`backend/`)。本 plan 假设 backend 在 dev 机器的 LAN IP 上以 `:8080` 跑着。

---

## Task 1: 准备 dev 环境(无代码改动)

**Files:** 无新增文件,只是 dev 环境配置 checklist。

- [ ] **Step 1: 启动后端**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan/backend
rm -f ddxy.db
make seed       # 期望: "imported 10 schools into ./ddxy.db"
make run        # 后台跑;另起一个 shell 做后续步骤
```

验证:`curl localhost:8080/healthz` 返回 `ok`。

- [ ] **Step 2: 拿到本机局域网 IP**

```bash
# macOS
ipconfig getifaddr en0
# Linux
hostname -I | awk '{print $1}'
```

把得到的 IP(比如 `192.168.1.42`)记下。称为 `<DEV_IP>`。验证 backend 能从 LAN 访问:

```bash
curl http://<DEV_IP>:8080/healthz   # 期望 "ok"
```

如果不通,检查 macOS 防火墙 / Linux iptables。

- [ ] **Step 3: 配置 wechat 开发者工具跳过域名校验**

打开 wechat 开发者工具 → 项目右上角 `详情` → `本地设置` → 勾选:
- 「不校验合法域名、web-view (业务域名)、TLS 版本以及 HTTPS 证书」

这一步只影响 dev 模式,不影响生产。**无法用代码实现,必须手动**。如果实施者跳过这步,后面所有 `wx.request` 会 fail。

- [ ] **Step 4: 不 commit。继续 Task 2。**

---

## Task 2: 添加 api.js + distance.js + dev apiBase

**Files:**
- Create: `wechat/utils/api.js`
- Create: `wechat/utils/distance.js`
- Modify: `wechat/app.js`

- [ ] **Step 1: 创建 `wechat/utils/api.js`**

写入这个文件:

```js
// HTTP client for the central backend.
// See docs/superpowers/specs/2026-05-12-backend-design.md for API contract.

function url(path) {
  const app = getApp();
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
          const msg = (res.data && res.data.error) || `HTTP ${res.statusCode}`;
          reject(new Error(msg));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || 'request failed')),
    });
  });
}

function fetchCities() {
  return request('/api/v1/cities').then((d) => d.cities);
}

function fetchSchools(cityId) {
  const q = cityId ? `?city=${encodeURIComponent(cityId)}` : '';
  return request('/api/v1/schools' + q).then((d) => d.schools);
}

function fetchSchool(id) {
  return request(`/api/v1/schools/${encodeURIComponent(id)}`).then((d) => d.school);
}

module.exports = { fetchCities, fetchSchools, fetchSchool };
```

- [ ] **Step 2: 创建 `wechat/utils/distance.js`**

```js
// Haversine — km between two GCJ-02 lat/lng points. Both ends must use
// the same coordinate system (we use GCJ-02 throughout — wx.getLocation
// returns GCJ-02 when type='gcj02', and school lat/lng from backend are GCJ-02).

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = { distanceKm };
```

- [ ] **Step 3: 改 `wechat/app.js` 的 apiBase 为 LAN IP**

当前:

```js
App({
  onLaunch() {},
  globalData: {
    apiBase: 'https://ddxy.xiaoyuanzhu.com',
  },
});
```

改成（把 `<DEV_IP>` 换成 Task 1 拿到的 IP,例如 `192.168.1.42`）:

```js
App({
  onLaunch() {},

  // Shared in-memory state. Survives across page navigations within a session.
  globalData: {
    // DEV: 'http://<DEV_IP>:8080'   ← 你机器的局域网 IP(ipconfig getifaddr en0)
    // PROD: 'https://ddxy.xiaoyuanzhu.com'
    // ⚠️ 发布前必须改回 production!
    apiBase: 'http://<DEV_IP>:8080',
  },
});
```

- [ ] **Step 4: 验证小程序仍能编译**

在 wechat 开发者工具里 reload 项目。控制台不应有 require 错误。**不需要 API 调用通**(还没有消费者)。

- [ ] **Step 5: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add wechat/utils/api.js wechat/utils/distance.js wechat/app.js
git commit -m "feat(wechat): add api + distance utilities, point apiBase to LAN dev"
```

---

## Task 3: 清理 status.js + decorate.js + app.wxss(去 daytime / walk)

**Files:**
- Modify: `wechat/utils/status.js`
- Modify: `wechat/utils/decorate.js`
- Modify: `wechat/app.wxss`

注意:这一步会让 `wechat/utils/data.js` 里残留的 `daytime` 数据失去 status 表条目,但 data.js 在后续 task 才删除。期间 home.js 仍然 require data.js,所以**这一步会暂时把 home 页面渲染搞坏**(daytime 学校卡片样式异常)。这是过渡态,Task 4 之后即恢复。

- [ ] **Step 1: 改 `wechat/utils/status.js`**

把整个文件替换为:

```js
// Status tokens — kept in lockstep with frontend/src/data/status.js.
// Class names map to .status-* and .dot-* declared in app.wxss.

const STATUS = {
  open:   { key: 'open',   label: '完全开放', bgClass: 'status-open',   dotClass: 'dot-open',   order: 1 },
  appt:   { key: 'appt',   label: '预约开放', bgClass: 'status-appt',   dotClass: 'dot-appt',   order: 2 },
  alumni: { key: 'alumni', label: '仅校友',   bgClass: 'status-alumni', dotClass: 'dot-alumni', order: 3 },
  closed: { key: 'closed', label: '未开放',   bgClass: 'status-closed', dotClass: 'dot-closed', order: 4 },
};

const FACILITIES = {
  library: { label: '图书馆', short: '书' },
  track:   { label: '操场',   short: '跑' },
  gym:     { label: '体育馆', short: '体' },
  canteen: { label: '食堂',   short: '食' },
};

const STATUS_ORDER = ['open', 'appt', 'alumni', 'closed'];

module.exports = { STATUS, FACILITIES, STATUS_ORDER };
```

变化:删 `daytime` 条目;删 `walk` facility 条目;`order` 数字从 1-5 重排为 1-4。

- [ ] **Step 2: 改 `wechat/utils/decorate.js`**

替换整个文件:

```js
// Decorate a school for rendering: precomputed badge / facility class names.
// Input is the API detail shape (GET /api/v1/schools/:id).

const { STATUS, FACILITIES } = require('./status.js');

const FACILITY_ORDER = ['library', 'track', 'gym', 'canteen'];

function decorateSchool(s, distanceKm) {
  if (!s) return s;
  const st = STATUS[s.status];

  const facilities = FACILITY_ORDER.map((k) => {
    const f = s.facilities[k];
    const fst = STATUS[f.status];
    const muted = f.status === 'closed' || f.status === 'alumni';
    return {
      key: k,
      label: FACILITIES[k].label,
      short: FACILITIES[k].short,
      status: f.status,
      statusLabel: fst.label,
      bgClass: fst.bgClass,
      dotClass: fst.dotClass,
      muted,
      strikethrough: f.status === 'closed',
      reservation: f.reservation || null,
      hasReservation: !!f.reservation,
    };
  });

  return {
    ...s,
    statusKey: st.key,
    statusLabel: st.label,
    statusBgClass: st.bgClass,
    statusDotClass: st.dotClass,
    statusOrder: st.order,
    initial: s.name.charAt(0),
    facilitiesList: facilities,
    hasReservation: !!s.reservation,
    distanceKm: typeof distanceKm === 'number' ? distanceKm : null,
    updateLabel: relativeTimeZh(s.lastUpdate),
  };
}

function relativeTimeZh(iso) {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  const min = 60, hour = 3600, day = 86400, week = day * 7;
  if (diffSec < hour)  return `${Math.max(1, Math.floor(diffSec / min))} 分钟前更新`;
  if (diffSec < day)   return `${Math.floor(diffSec / hour)} 小时前更新`;
  if (diffSec < week)  return `${Math.floor(diffSec / day)} 天前更新`;
  return `${Math.floor(diffSec / week)} 周前更新`;
}

module.exports = { decorateSchool };
```

变化:
- 入参 shape 是 backend 详情 shape(`s.facilities` 是 4 key 的对象,不含 walk)
- 通过固定 `FACILITY_ORDER` 数组保证渲染顺序稳定(JS 对象 key 顺序在跨平台时不一定保证)
- 加 `distanceKm` 参数(可选);存到 `distanceKm` 字段
- 不再处理 `walk`

- [ ] **Step 3: 改 `wechat/app.wxss`**

找到 `app.wxss` 第 22 行附近的 `.status-daytime` 和第 29 行的 `.dot-daytime`,删掉这两行。

具体操作:

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
# 确认现状
grep -n "daytime" wechat/app.wxss
```

期望输出:
```
22:.status-daytime { background: #F2E2A8; color: #6B4F00; }
29:.dot-daytime { background: #C29410; }
```

删除这两行(其他 4 个 status 类保留)。然后再次 `grep -n "daytime" wechat/app.wxss`,应该无输出。

- [ ] **Step 4: 重 grep 验证清理彻底**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan/wechat
grep -rn "daytime" .
```

期望:只剩 `utils/data.js` 里几个学校的 `status: 'daytime'`(下面的 task 会把整个 data.js 删除)。其他位置不应有 daytime。

- [ ] **Step 5: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add wechat/utils/status.js wechat/utils/decorate.js wechat/app.wxss
git commit -m "refactor(wechat): drop daytime status + walk facility from status/decorate/wxss"
```

---

## Task 4: home 页改走 API

**Files:**
- Modify: `wechat/pages/home/home.js`
- Modify: `wechat/pages/home/home.wxml`

home.js 当前是 sync 数据流:`recompute()` 直接读 `SCHOOLS` 常量然后 setData。要改成:`onLoad` async 拉数据(cities + schools),`recompute` 操作内存 state。

- [ ] **Step 1: 替换整个 `wechat/pages/home/home.js`**

```js
const { fetchCities, fetchSchools } = require('../../utils/api.js');
const { distanceKm } = require('../../utils/distance.js');
const { STATUS, STATUS_ORDER, FACILITIES } = require('../../utils/status.js');
const { decorateSchool } = require('../../utils/decorate.js');

const STATUS_OPTIONS = STATUS_ORDER.map((k) => ({
  key: k, label: STATUS[k].label, dotClass: STATUS[k].dotClass, bgClass: STATUS[k].bgClass,
}));
const FAC_OPTIONS = Object.keys(FACILITIES).map((k) => ({
  key: k, label: FACILITIES[k].label, short: FACILITIES[k].short,
}));

// Color map for native <map> callouts (which take raw hex, not class names).
const STATUS_COLOR = {
  open:   { bg: '#D4E8C8', ink: '#2E5A1C' },
  appt:   { bg: '#F2C99A', ink: '#7A3A06' },
  alumni: { bg: '#D9D5CE', ink: '#3A372F' },
  closed: { bg: '#E8C4B8', ink: '#7A2418' },
};

Page({
  data: {
    loading: true,
    error: '',

    filterOpen: false,
    statusFilter: [],
    facFilter: [],
    statusFilterMap: {},
    facFilterMap: {},

    schools: [],         // raw (from API), enriched with distance + decorated
    groups: [],          // list view groups
    mapMarkers: [],
    legend: STATUS_OPTIONS,
    statusOptions: STATUS_OPTIONS,
    facOptions: FAC_OPTIONS,
    resultsCount: 0,
    hasFilters: false,

    cityId: 'bj',
    cityName: '北京',
    cityLat: 39.96,
    cityLng: 116.34,

    userLat: null,
    userLng: null,
  },

  // —— Lifecycle ——

  onLoad() {
    this.locateUser();
    this.loadAll();
  },

  // Center map on user's location; falls back silently to the default
  // city center (set in data) if the user denies or the simulator can't
  // resolve a fix. Also stores user coords for client-side distance calc.
  locateUser() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          cityLat: res.latitude,
          cityLng: res.longitude,
          userLat: res.latitude,
          userLng: res.longitude,
        }, () => {
          // Re-decorate if schools already loaded — distance changes.
          if (this.rawSchools) this.recompute();
        });
      },
      fail: () => {},
    });
  },

  // Fetches schools for current city + recomputes filtered/decorated state.
  // Pass cityId !== this.data.cityId to switch cities.
  async loadAll() {
    this.setData({ loading: true, error: '' });
    try {
      const schools = await fetchSchools(this.data.cityId);
      this.rawSchools = schools;   // keep raw on instance for re-decoration
      this.recompute();
      this.setData({ loading: false });
    } catch (e) {
      this.setData({ loading: false, error: e.message || '加载失败' });
    }
  },

  retry() {
    this.loadAll();
  },

  // —— Compute (called whenever filters or raw data change) ——

  recompute() {
    if (!this.rawSchools) return;
    const sf = new Set(this.data.statusFilter);
    const ff = new Set(this.data.facFilter);
    const userLat = this.data.userLat;
    const userLng = this.data.userLng;

    const filtered = this.rawSchools
      .filter((s) => {
        if (sf.size && !sf.has(s.status)) return false;
        // API list endpoint returns summary fields only — no facilities here.
        // Facility filtering would require additional fetches per school; we
        // therefore drop facility filtering in this view OR fetch detail for
        // matched schools. For MVP we keep facility filter UI but use raw
        // schools list (no per-school detail) — facility filter therefore
        // matches nothing if used. See Task 7 verification.
        if (ff.size) return false;
        return true;
      })
      .map((s) => {
        const d = (userLat !== null && userLng !== null)
          ? distanceKm(userLat, userLng, s.lat, s.lng)
          : null;
        return { school: s, distance: d };
      })
      .sort((a, b) => {
        const aOrder = STATUS[a.school.status].order;
        const bOrder = STATUS[b.school.status].order;
        if (aOrder !== bOrder) return aOrder - bOrder;
        const da = a.distance === null ? Infinity : a.distance;
        const db = b.distance === null ? Infinity : b.distance;
        return da - db;
      })
      .map(({ school, distance }) => decorateSchoolSummary(school, distance, this.data.cityName));

    // Group by status for list view.
    const byStatus = {};
    for (const s of filtered) (byStatus[s.statusKey] = byStatus[s.statusKey] || []).push(s);
    const groups = STATUS_ORDER
      .filter((k) => byStatus[k])
      .map((k) => ({
        key: k, label: STATUS[k].label, dotClass: STATUS[k].dotClass,
        count: byStatus[k].length, items: byStatus[k],
      }));

    // Map markers.
    const markers = filtered.map((s, i) => ({
      id: i,
      schoolId: s.id,
      latitude: s.lat,
      longitude: s.lng,
      width: 22,
      height: 28,
      callout: {
        content: s.name.replace('大学', ''),
        bgColor: STATUS_COLOR[s.statusKey].bg,
        color: STATUS_COLOR[s.statusKey].ink,
        padding: 4,
        borderRadius: 3,
        fontSize: 10,
        display: 'ALWAYS',
      },
    }));

    this.setData({
      schools: filtered,
      groups,
      mapMarkers: markers,
      resultsCount: filtered.length,
      hasFilters: sf.size + ff.size > 0,
      statusFilterMap: [...sf].reduce((m, k) => (m[k] = true, m), {}),
      facFilterMap:    [...ff].reduce((m, k) => (m[k] = true, m), {}),
    });
  },

  // —— Event handlers ——

  openSearch() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' });
  },

  openSchool(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  openMarker(e) {
    const id = e.markerId;
    const marker = this.data.mapMarkers[id];
    if (marker) wx.navigateTo({ url: `/pages/detail/detail?id=${marker.schoolId}` });
  },

  openCities() {
    wx.navigateTo({
      url: '/pages/cities/cities',
      events: {
        selectedCity: (city) => {
          this.setData(
            {
              cityId: city.id,
              cityName: city.name,
              cityLat: city.lat,
              cityLng: city.lng,
            },
            () => this.loadAll(),
          );
        },
      },
    });
  },

  openFilter() { this.setData({ filterOpen: true }); },
  closeFilter() { this.setData({ filterOpen: false }); },

  toggleStatus(e) {
    const key = e.currentTarget.dataset.key;
    const next = this.data.statusFilter.includes(key)
      ? this.data.statusFilter.filter((k) => k !== key)
      : [...this.data.statusFilter, key];
    this.setData({ statusFilter: next }, () => this.recompute());
  },

  toggleFac(e) {
    const key = e.currentTarget.dataset.key;
    const next = this.data.facFilter.includes(key)
      ? this.data.facFilter.filter((k) => k !== key)
      : [...this.data.facFilter, key];
    this.setData({ facFilter: next }, () => this.recompute());
  },

  resetFilter() {
    this.setData({ statusFilter: [], facFilter: [] }, () => this.recompute());
  },

  applyFilter() { this.setData({ filterOpen: false }); },

  noop() {},
});

// Summary-shape decorator: API list endpoint returns SchoolSummary (no
// facilities). Card needs status / cityName subtitle / initial only;
// the facility chip row in home.wxml gets `facilitiesList: []` and
// renders nothing (wx:for on empty array is a no-op).
//
// `subtitle` is precomputed as "<cityName>" or "<cityName> · X.X 公里",
// since WXML has no Number.toFixed support.
function decorateSchoolSummary(s, distance, cityName) {
  const st = STATUS[s.status];
  const subtitle = (typeof distance === 'number')
    ? `${cityName} · ${distance.toFixed(1)} 公里`
    : cityName;
  return {
    ...s,
    statusKey: st.key,
    statusLabel: st.label,
    statusBgClass: st.bgClass,
    statusDotClass: st.dotClass,
    statusOrder: st.order,
    initial: s.name.charAt(0),
    facilitiesList: [],
    distanceKm: distance,
    subtitle,
  };
}
```

**注意:** `recompute` 里设施筛选(facFilter)在 API summary shape 下没法工作 —— summary 不带 facility 数据。本 plan 接受这一退化(filter UI 仍在但实际不生效),Task 7 验证清单里会注明。如果需要恢复筛选功能,后续要么(a)在 API 上加 facility query 参数,要么(b)切换列表端点为详情端点(更重的 payload)。

- [ ] **Step 2: 改 `wechat/pages/home/home.wxml` 字段引用 + loading / error 视图**

打开 `wechat/pages/home/home.wxml`。两类修改:

**(a) 卡片副标题字段**

找到 line 72 附近:

```xml
<text class="school-meta tnum">{{s.district}} · {{s.distance}} 公里 · {{s.confirms}} 人确认</text>
```

改成:

```xml
<text class="school-meta tnum">{{s.subtitle}}</text>
```

(`s.subtitle` 是 decorateSchoolSummary 算出来的预格式化字符串,见上 Step 1 的代码)。

**(b) 加 loading / error 视图**

在最外层 `<view class="page c-paper">` 标签开头插入(放在 header 之后、map-section 之前):

```xml
<!-- Loading + error overlays — sit above the rest of the page content -->
<view wx:if="{{loading}}" class="status-overlay">
  <text class="status-overlay-text">加载中…</text>
</view>

<view wx:if="{{error && !loading}}" class="status-overlay">
  <text class="status-overlay-text">{{error}}</text>
  <button class="status-overlay-btn" bindtap="retry">重试</button>
</view>
```

并在 `wechat/pages/home/home.wxss`(或 app.wxss)中加 minimal style。如果 home.wxss 不存在,创建它:

```bash
ls wechat/pages/home/
```

如果有 home.wxss,在末尾追加;如果没有,创建 `wechat/pages/home/home.wxss`:

```css
.status-overlay {
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.status-overlay-text {
  font-size: 28rpx;
  color: #5C5851;
}

.status-overlay-btn {
  font-size: 26rpx;
  background: #1A1815;
  color: #fff;
  padding: 12rpx 32rpx;
  border-radius: 6rpx;
  min-height: 0;
  line-height: 1.5;
}
```

并把 `loading` / `error` 视图条件用 `wx:if` 限制 —— 当 `loading=true` 时遮盖主内容,或者像上面那样作为顶部 banner。建议:`loading` 时**仍显示 header**(用户能看到 city picker),但 map + list 区不渲染:

```xml
<!-- 在 map-section / list-section 外层包一层 wx:if="{{!loading && !error}}" -->
<view wx:if="{{!loading && !error}}" class="map-section">
  ...
</view>

<view wx:if="{{!loading && !error}}" class="list-section">
  ...
</view>
```

具体编辑:

打开 home.wxml,找到 `<view class="map-section">`,改成 `<view wx:if="{{!loading && !error}}" class="map-section">`;同样把 `<view class="list-section">` 改成 `<view wx:if="{{!loading && !error}}" class="list-section">`。

在 header 后面、map-section 前面插入两个 status-overlay view(见上方)。

- [ ] **Step 3: smoke test**

在 wechat 开发者工具:
- 编译并刷新
- 期望:首页加载,卡片显示「北京 · X.Xkm」(授予位置)或「北京」(拒绝位置)
- 期望:10 张卡片(scope A 种子数据)
- 期望:地图 markers 10 个,callout 展示「北大」「清华」等学校简称(去掉「大学」后缀)
- 点 marker 跳详情页(详情页可能还没改好,可能渲染异常 —— 本步先确认跳转触发了即可)

如果 console 报错或 fetch 失败:检查 `app.js` 的 apiBase 是否对、backend 是否在跑、wechat 开发者工具是否勾选了「不校验合法域名」。

- [ ] **Step 4: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add wechat/pages/home/
git commit -m "feat(wechat/home): switch schools list to backend API with loading/error states"
```

---

## Task 5: cities 页改走 API

**Files:**
- Modify: `wechat/pages/cities/cities.js`
- Modify: `wechat/pages/cities/cities.wxml`(加 loading 视图)

- [ ] **Step 1: 替换 `wechat/pages/cities/cities.js`**

```js
const { fetchCities } = require('../../utils/api.js');

Page({
  data: {
    loading: true,
    error: '',
    active: [],
    soon: [],
  },

  onLoad() {
    this.loadCities();
  },

  async loadCities() {
    this.setData({ loading: true, error: '' });
    try {
      const cities = await fetchCities();
      const active = cities.filter((c) => c.active).map((c) => ({
        ...c,
        ratePct: Math.round(c.openRate * 100),
        ringDash: c.openRate * 138,   // 2 * PI * r where r ≈ 22
      }));
      const soon = cities.filter((c) => !c.active);
      this.setData({ active, soon, loading: false });
    } catch (e) {
      this.setData({ loading: false, error: e.message || '加载失败' });
    }
  },

  retry() {
    this.loadCities();
  },

  pickCity(e) {
    const id = e.currentTarget.dataset.id;
    const city = this.data.active.find((c) => c.id === id);
    if (!city) {
      wx.navigateBack();
      return;
    }

    const ch = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (ch && typeof ch.emit === 'function') {
      ch.emit('selectedCity', {
        id: city.id,
        name: city.name,
        lat: city.lat,
        lng: city.lng,
      });
    }

    wx.navigateBack({
      fail: () => { wx.reLaunch({ url: '/pages/home/home' }); },
    });
  },
});
```

- [ ] **Step 2: 改 `wechat/pages/cities/cities.wxml` 加 loading / error**

打开 cities.wxml,在最外层 view 开头插入 status-overlay block(与 home 同样的写法):

```xml
<view wx:if="{{loading}}" class="status-overlay">
  <text class="status-overlay-text">加载中…</text>
</view>

<view wx:if="{{error && !loading}}" class="status-overlay">
  <text class="status-overlay-text">{{error}}</text>
  <button class="status-overlay-btn" bindtap="retry">重试</button>
</view>
```

把已有的城市列表区域用 `wx:if="{{!loading && !error}}"` 包裹。

如果 status-overlay 样式已经从 home.wxss 全局可用,这里不需要重复定义。否则在 app.wxss 末尾加 status-overlay 样式(从 Task 4 移过来)。**建议:把样式放到 app.wxss 让所有页面共享。** 如果 Task 4 已经放在 home.wxss,那现在动手挪到 app.wxss。

- [ ] **Step 3: smoke test**

- 从 home 点城市名,跳到 cities 页面
- 期望:显示 8 个城市,北京在 active 区(1 个),其他 7 在 soon
- 北京卡片显示「10 所 · 50%」(scope A 种子的 5 open / 10 total)
- 点北京,跳回 home,home 重新拉数据(应该没变化,仍 10 所北京学校)
- 点其他城市:不应该 work(active 列表里没有),保持当前选择

- [ ] **Step 4: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add wechat/pages/cities/ wechat/app.wxss
git commit -m "feat(wechat/cities): switch to backend API + shared loading overlay"
```

---

## Task 6: detail 页改走 API

**Files:**
- Modify: `wechat/pages/detail/detail.js`
- Modify: `wechat/pages/detail/detail.wxml`(loading / error 处理)

- [ ] **Step 1: 替换 `wechat/pages/detail/detail.js`**

```js
const { fetchSchool } = require('../../utils/api.js');
const { decorateSchool } = require('../../utils/decorate.js');

// schedule rows are removed (entry/schedule are not in scope A backend data).

Page({
  data: {
    loading: true,
    error: '',
    school: null,
    modal: { visible: false, title: '', qrcodeUrl: '', hint: '', link: '' },
  },

  onLoad(opts) {
    this.schoolId = opts.id;
    this.loadSchool();
  },

  async loadSchool() {
    this.setData({ loading: true, error: '' });
    try {
      const raw = await fetchSchool(this.schoolId);
      const school = decorateSchool(raw);
      this.setData({ school, loading: false });
      wx.setNavigationBarTitle({ title: school.name });
    } catch (e) {
      this.setData({ loading: false, error: e.message || '加载失败' });
    }
  },

  retry() {
    this.loadSchool();
  },

  openCampusReservation() {
    const r = this.data.school && this.data.school.reservation;
    if (!r) return;
    this.showModal(`${this.data.school.name} 预约入校`, r);
  },

  openFacilityReservation(e) {
    const key = e.currentTarget.dataset.key;
    const facility = this.data.school.facilitiesList.find((f) => f.key === key);
    if (!facility || !facility.reservation) return;
    this.showModal(`${facility.label}预约`, facility.reservation);
  },

  showModal(title, r) {
    this.setData({
      modal: {
        visible: true,
        title,
        qrcodeUrl: r.qrcodeUrl,
        hint: r.hint || '',
        link: r.link || '',
      },
    });
  },

  closeModal() {
    this.setData({ 'modal.visible': false });
  },

  noop() {},

  saveQrcode() {
    const url = this.data.modal.qrcodeUrl;
    if (!url) return;
    wx.showLoading({ title: '保存中', mask: true });
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.hideLoading();
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: '已保存到相册', icon: 'success' });
          },
          fail: (err) => {
            wx.hideLoading();
            const denied = err && err.errMsg && err.errMsg.indexOf('auth deny') !== -1;
            wx.showToast({
              title: denied ? '需相册权限' : '保存失败',
              icon: 'none',
            });
          },
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
    });
  },

  copyLink() {
    const link = this.data.modal.link;
    if (!link) return;
    wx.setClipboardData({
      data: link,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    });
  },
});
```

变化:
- 去掉 SCHEDULE_KEYS 常量和 scheduleRows 派生数据(数据已无)
- 异步加载学校数据 + loading/error/retry
- 入参 `school` 来自 backend 详情 shape,经过 decorateSchool(已在 Task 3 改成处理 backend shape)

- [ ] **Step 2: 改 `wechat/pages/detail/detail.wxml`**

当前 detail.wxml 多处引用不存在的字段。改动如下:

**(a) 替换顶部 not-found 块为 loading/error/not-found 三态**

原 line 2-4:

```xml
<view wx:if="{{!school}}" class="not-found">
  <text>没有这所学校</text>
</view>
```

改成:

```xml
<view wx:if="{{loading}}" class="status-overlay">
  <text class="status-overlay-text">加载中…</text>
</view>

<view wx:if="{{error && !loading}}" class="status-overlay">
  <text class="status-overlay-text">{{error}}</text>
  <button class="status-overlay-btn" bindtap="retry">重试</button>
</view>

<view wx:if="{{!loading && !error && !school}}" class="not-found">
  <text>没有这所学校</text>
</view>
```

并把 `<view wx:else class="page c-paper">` 改成:

```xml
<view wx:if="{{!loading && !error && school}}" class="page c-paper">
```

**(b) hero 区域字段修正**

原 line 10:

```xml
<view class="hero-district badge small">{{school.district}} · {{school.distance}} 公里</view>
```

改成(后端不返回 district / distance;详情页这里展示完整地址,如果有的话):

```xml
<view wx:if="{{school.address}}" class="hero-district badge small">{{school.address}}</view>
```

原 line 15:

```xml
<text>{{school.lastUpdate}}更新 · {{school.confirms}} 人确认</text>
```

改成(后端 lastUpdate 是 ISO 时间戳,需要 JS 端预先格式化为相对时间;confirms 不存在):

```xml
<text>{{school.updateLabel}}</text>
```

`school.updateLabel` 是新增的派生字段,在 decorate.js 里产出 —— 见 Step 3。

**(c) 整段删除 Entry section**

原 line 27-36(整段):

```xml
<!-- Entry -->
<view class="section">
  <text class="section-label">进入方式</text>
  <view class="entry-list">
    <view wx:for="{{school.entry}}" wx:key="*this" class="entry-item">
      <view class="entry-bullet"></view>
      <text class="entry-text">{{item}}</text>
    </view>
  </view>
</view>
```

**整段删除**(数据不存在)。

**(d) 整段删除 Schedule section**

原 line 38-47:

```xml
<!-- Schedule -->
<view class="section">
  <text class="section-label">开放时段</text>
  <view class="schedule-grid">
    <view wx:for="{{scheduleRows}}" wx:key="key" class="schedule-cell">
      <text class="schedule-label">{{item.label}}</text>
      <text class="schedule-value tnum">{{item.value}}</text>
    </view>
  </view>
</view>
```

**整段删除**。

**(e) 整段删除 Notes section**

原 line 65-77:

```xml
<!-- Notes -->
<view wx:if="{{school.notes.length > 0}}" class="section">
  <text class="section-label">用户补充</text>
  <view class="notes">
    <view wx:for="{{school.notes}}" wx:key="*this" class="note card">
      <view class="note-head">
        <text class="note-user">{{item.user}}</text>
        <text class="note-date">{{item.date}}</text>
      </view>
      <text class="note-text">{{item.text}}</text>
    </view>
  </view>
</view>
```

**整段删除**。

**(f) Facilities section + reservation modal 不动**

Facilities section(line 49-63)使用 `school.facilitiesList` —— Task 3 的 decorate.js 已经产出 4 项的 facilitiesList,无需 wxml 改动。

Reservation modal(line 80-96)不动。

- [ ] **Step 3: 确认 decorate.js 已经产出 updateLabel**

Task 3 的 decorate.js 已经包含 `updateLabel` 派生字段(通过 relativeTimeZh)。`{{school.updateLabel}}` 在 detail.wxml 直接可用,无需再改 decorate.js。

如果不知怎么 Task 3 没改全,跳回 Task 3 Step 2 补 updateLabel + relativeTimeZh。

- [ ] **Step 4: smoke test**

- 从 home 点任意学校,进详情页
- PKU 期望:状态 = "预约开放",顶部预约入口可点开 modal,4 项设施都 "未开放"
- BNU 期望:状态 = "完全开放";4 项设施 — 图书馆 closed,操场 open,体育馆 appt(有 reservation 入口),食堂 closed
- BUPT 期望:状态 = "未开放";4 项 closed
- BFSU 期望:图书馆 appt + reservation modal 可打开

- [ ] **Step 5: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add wechat/pages/detail/
git commit -m "feat(wechat/detail): switch to backend API; drop schedule section"
```

(decorate.js 的 updateLabel + relativeTimeZh 已经在 Task 3 提交。)

---

## Task 7: 删除 data.js + 最终 verification

**Files:**
- Delete: `wechat/utils/data.js`
- Verify: about page 没 break

- [ ] **Step 1: 确认 about page 没有 data.js 依赖**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
grep -n "data\.js\|require.*data" wechat/pages/about/
```

期望:没有匹配(about.js 不依赖数据)。如果有,意外发现 —— 报告 BLOCKED,先解决依赖再继续。

- [ ] **Step 2: 全局扫一遍 data.js 的 require**

```bash
grep -rn "require.*utils/data" wechat/
```

期望:没有匹配(home/cities/detail 都已经在 Task 4/5/6 改成 require api.js)。如果还有遗漏,**回到对应 task 修正,再回来。**

- [ ] **Step 3: 删除 data.js**

```bash
rm wechat/utils/data.js
```

- [ ] **Step 4: 编译验证**

在 wechat 开发者工具里 reload 项目。期望:无编译错误,控制台无 module not found 警告。

- [ ] **Step 5: 全流程 smoke test**

按照 wechat-api-alignment-design.md §测试策略 §Happy path 验证清单 跑一遍:

1. **首页加载**:10 张卡片显示,副标题「北京 · X.X km」(授权位置后)
2. **状态筛选**:勾「完全开放」,只剩 5 所;勾「未开放」+「完全开放」,剩 6 所
3. **设施筛选**:勾「图书馆」 —— **预期不生效**(summary shape 不带 facilities,本 plan 接受这个退化;如要恢复请见 Task 4 的注)
4. **地图 markers**:点北大 marker 跳详情
5. **详情页**:
   - 北大:预约入校 modal 显示 QR 占位 + "关注「参观北大」公众号 → 菜单「个人预约」"
   - 北师大:gym 行有「预约」按钮可点开
   - 北邮:4 项全部「未开放」
6. **切城市**:点城市选择 → 选北京 → 列表刷新仍 10 所(loading 闪一下)
7. **错误恢复**:停 backend (`make stop` 或 kill 进程) → 在 home 下拉刷新或重 onLoad → 显示「加载失败」+ 重试 → 起回 backend → 点重试 → 恢复正常

- [ ] **Step 6: gofmt 等价检查 — wechat 没 linter,但保证没 syntax 错误**

```bash
# wechat 没有专门的 lint,但 Node.js 可以做基本 syntax 检查
node -c wechat/utils/api.js && \
node -c wechat/utils/distance.js && \
node -c wechat/utils/decorate.js && \
node -c wechat/utils/status.js && \
echo OK
```

期望:OK。`node -c` 检查 syntax 错误。

- [ ] **Step 7: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add wechat/utils/data.js
git commit -m "chore(wechat): remove hardcoded data.js — all consumers now use api.js"
```

---

## Spec coverage check

| Spec 章节 / 要求 | 实现位置 |
|---|---|
| `api.js` 三个 fetch 函数 | Task 2 |
| `distance.js` Haversine | Task 2 |
| dev/prod apiBase 切换(LAN IP) | Task 2 Step 3 |
| 设施 5 → 4,删 walk | Task 3 (status.js + decorate.js) |
| status 5 → 4,删 daytime | Task 3 (status.js + decorate.js + app.wxss) |
| 卡片副标题:城市 + 距离 | Task 4 (home.js recompute + WXML cardSubtitle) |
| 切城市重新拉学校 | Task 4 (openCities → loadAll) + Task 5 (selectedCity event) |
| 详情页砍 schedule | Task 6 |
| loading + error + retry | Task 4 / 5 / 6 |
| 删除 data.js | Task 7 |
| Manual smoke test 清单 | Task 7 Step 5 |
| 设施排序固定(library/track/gym/canteen) | Task 3 (decorate.js FACILITY_ORDER) |

## Open items deferred

- **设施筛选(home 页 facFilter)**:summary shape 不带 facilities,本 plan 接受筛选不生效。如要恢复:要么后端加 `?facility=` query 参数,要么 home 端切到详情端点(payload 重)。后续再决定。
- **wechat unit test**:暂无标准框架,继续靠手动 smoke。如未来引入 [miniprogram-simulate](https://github.com/wechat-miniprogram/miniprogram-simulate),fetch helper 可以加 unit test。
