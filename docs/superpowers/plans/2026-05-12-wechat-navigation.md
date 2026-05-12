# 微信小程序导航重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `wechat/` a 2-tab bottom navigation (附近 / 关于) using WeUI icons, and restructure the 附近 page so map and list are stacked beneath a single city-picker + search header.

**Architecture:** Use WeChat's `useExtendedLib` to pull in `weui-miniprogram` without npm. TabBar is rendered as a custom component (`custom-tab-bar/`) so it can use `<mp-icon>` for vector icons (the native tabBar config only accepts PNG paths). The existing `cities` page is demoted from tab to a navigateTo'd picker that returns the choice via `eventChannel`. View toggle (地图/列表) is removed in favor of always-stacked rendering.

**Tech Stack:** WeChat 小程序原生框架, weui-miniprogram (via useExtendedLib), `<mp-icon>`, `wx.switchTab` / `wx.navigateTo` + eventChannel.

**Reference spec:** `docs/superpowers/specs/2026-05-12-wechat-navigation-design.md`

**Verification model:** This project has no automated test harness for the wechat mini program. Verification happens by opening the project in 微信开发者工具 (or running the IDE's compile + simulator) and exercising the feature manually. Each task ends with a manual smoke-test step that names what to check.

**Locked decisions (resolving spec's 待定):**
1. Search entry on home header is a placeholder — taps show `wx.showToast({ title: '搜索功能开发中', icon: 'none' })`. Full search page is out of scope for this plan.
2. City picker uses `wx.navigateTo` + `eventChannel` (no custom sheet component).
3. Filter relocates to a chip-row above the list section.
4. About tab uses WeUI icon `info` (outline / filled).
5. Tab colors: selected `#1A1815`, unselected `rgba(26,24,21,0.4)` (matches `app.wxss` ink tokens).

---

### Task 1: Foundation — WeUI ext lib + custom tabBar component

**Files:**
- Modify: `wechat/app.json`
- Create: `wechat/custom-tab-bar/index.js`
- Create: `wechat/custom-tab-bar/index.json`
- Create: `wechat/custom-tab-bar/index.wxml`
- Create: `wechat/custom-tab-bar/index.wxss`
- Modify: `wechat/pages/home/home.js` (add `onShow`)
- Modify: `wechat/pages/about/about.js` (add `onShow`)
- Modify: `wechat/pages/home/home.wxss` (bump `.page` and `.fab` clearance for tabBar)
- Modify: `wechat/pages/about/about.wxss` (bump `.page` clearance for tabBar)

- [ ] **Step 1: Add `useExtendedLib` and `tabBar` to app.json**

Replace the current contents of `wechat/app.json` with:

```json
{
  "pages": [
    "pages/home/home",
    "pages/detail/detail",
    "pages/update/update",
    "pages/cities/cities",
    "pages/about/about"
  ],
  "useExtendedLib": {
    "weui": true
  },
  "tabBar": {
    "custom": true,
    "color": "#A3A3A1",
    "selectedColor": "#1A1815",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "white",
    "list": [
      { "pagePath": "pages/home/home",   "text": "附近" },
      { "pagePath": "pages/about/about", "text": "关于" }
    ]
  },
  "window": {
    "backgroundTextStyle": "dark",
    "navigationBarBackgroundColor": "#FFFFFF",
    "navigationBarTitleText": "大大校园",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#FFFFFF"
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json",
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于在地图上显示附近的校园"
    }
  },
  "requiredPrivateInfos": ["getLocation"]
}
```

Notes:
- `useExtendedLib.weui: true` pulls the latest weui-miniprogram. No npm needed.
- `tabBar.custom: true` tells 微信 to render via the `custom-tab-bar/` component below; the `color`/`selectedColor` fields are fallback values 微信 uses while the custom component is loading.
- The order of `list` fixes the index used by each page's `onShow` below: 附近 = 0, 关于 = 1.

- [ ] **Step 2: Create `wechat/custom-tab-bar/index.json`**

```json
{
  "component": true,
  "usingComponents": {
    "mp-icon": "weui-miniprogram/icon/icon"
  }
}
```

- [ ] **Step 3: Create `wechat/custom-tab-bar/index.wxml`**

```xml
<!--custom-tab-bar/index.wxml-->
<view class="tab-bar">
  <view
    wx:for="{{list}}"
    wx:key="pagePath"
    class="tab-bar-item"
    data-index="{{index}}"
    data-path="{{item.pagePath}}"
    bindtap="switchTab"
  >
    <mp-icon
      type="{{selected === index ? 'filled' : 'outline'}}"
      icon="{{item.icon}}"
      size="{{22}}"
      color="{{selected === index ? '#1A1815' : 'rgba(26,24,21,0.4)'}}"
    ></mp-icon>
    <view class="tab-bar-label {{selected === index ? 'on' : ''}}">{{item.text}}</view>
  </view>
</view>
```

- [ ] **Step 4: Create `wechat/custom-tab-bar/index.js`**

```js
// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/home',   text: '附近', icon: 'location' },
      { pagePath: '/pages/about/about', text: '关于', icon: 'info'     },
    ],
  },
  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      wx.switchTab({ url: path });
      this.setData({ selected: Number(index) });
    },
  },
});
```

- [ ] **Step 5: Create `wechat/custom-tab-bar/index.wxss`**

```css
/* custom-tab-bar/index.wxss */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(100rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: #FFFFFF;
  border-top: 1rpx solid rgba(26,24,21,0.10);
  display: flex;
  z-index: 100;
}
.tab-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding-top: 8rpx;
}
.tab-bar-label {
  font-size: 22rpx;
  color: rgba(26,24,21,0.4);
  letter-spacing: 0.6rpx;
}
.tab-bar-label.on {
  color: #1A1815;
  font-weight: 600;
}
```

- [ ] **Step 6: Wire `onShow` in home.js**

In `wechat/pages/home/home.js`, add an `onShow` method to the Page() object (place it right after `onLoad`):

```js
onShow() {
  if (typeof this.getTabBar === 'function' && this.getTabBar()) {
    this.getTabBar().setData({ selected: 0 });
  }
},
```

- [ ] **Step 7: Wire `onShow` in about.js**

In `wechat/pages/about/about.js`, add the same pattern with index 1, immediately after `onLoad`:

```js
onShow() {
  if (typeof this.getTabBar === 'function' && this.getTabBar()) {
    this.getTabBar().setData({ selected: 1 });
  }
},
```

- [ ] **Step 8: Bump page padding & FAB position in home.wxss for tabBar clearance**

In `wechat/pages/home/home.wxss`, replace:

```css
.page {
  min-height: 100vh;
  position: relative;
  padding-bottom: 200rpx;
}
```

with:

```css
.page {
  min-height: 100vh;
  position: relative;
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom));
}
```

And replace:

```css
.fab {
  position: fixed;
  right: 32rpx;
  bottom: 60rpx;
  ...
}
```

with (only the `bottom:` line changes; keep the rest):

```css
.fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(140rpx + env(safe-area-inset-bottom));
  z-index: 20;
  background: #1A1815;
  color: #FFFFFF;
  padding: 20rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  letter-spacing: 0.8rpx;
  box-shadow: 0 8rpx 28rpx rgba(0,0,0,0.25);
}
```

Also remove the redundant `padding-bottom: 200rpx;` baked into `.map-view` and `.list-view` (it was sized for the FAB; tabBar clearance is now on `.page`):

In `.map-view`, change `padding: 16rpx 32rpx 200rpx;` to `padding: 16rpx 32rpx 0;`.
In `.list-view`, change `padding: 24rpx 32rpx 200rpx;` to `padding: 24rpx 32rpx 0;`.

- [ ] **Step 9: Bump page padding in about.wxss for tabBar clearance**

In `wechat/pages/about/about.wxss`, replace:

```css
.page {
  min-height: 100vh;
  padding-bottom: 120rpx;
}
```

with:

```css
.page {
  min-height: 100vh;
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom));
}
```

- [ ] **Step 10: Manual smoke test**

Open `wechat/` as a project in 微信开发者工具. Wait for the IDE to download `weui-miniprogram` (look for a "正在拉取扩展库" message; usually <10s on first run).

Verify in the simulator:
1. Bottom tabBar shows two cells: a location pin labeled 附近 and an info icon labeled 关于
2. The active tab's icon and label use ink color `#1A1815` and a slightly bolder label; the inactive uses `rgba(26,24,21,0.4)`
3. Tapping 关于 navigates to the 关于 page and updates the active tab
4. Tapping 附近 navigates back to home
5. The "我去过" FAB sits above the tabBar, not behind it
6. List content has bottom clearance — the last school card is not covered by the tabBar

If WeUI fails to load with "module 'weui-miniprogram/icon/icon' is not found", restart 开发者工具 once (the extended lib pull sometimes needs an IDE restart on the first run).

- [ ] **Step 11: Commit**

```bash
git add wechat/app.json wechat/custom-tab-bar/ \
        wechat/pages/home/home.js wechat/pages/home/home.wxss \
        wechat/pages/about/about.js wechat/pages/about/about.wxss
git commit -m "$(cat <<'EOF'
feat(wechat): add 2-tab bottom navigation (附近/关于) via WeUI custom tabBar

通过 useExtendedLib 引入 weui-miniprogram，构建自定义 tabBar 组件
渲染 <mp-icon>，避免原生 tabBar 必须使用 PNG 文件的限制。

EOF
)"
```

---

### Task 2: Restructure home — single header row + stacked map/list

**Files:**
- Modify: `wechat/pages/home/home.wxml`
- Modify: `wechat/pages/home/home.wxss`
- Modify: `wechat/pages/home/home.js`

**Goal:** Replace the current two-row header (city + 地图/列表 toggle, search + 筛选) with a single-row header (city chip left, search entry right). Remove the `view` state — both map and list render unconditionally, stacked. Filter button is removed from the header in this task; it gets relocated in Task 3.

- [ ] **Step 1: Replace home.wxml**

Overwrite `wechat/pages/home/home.wxml` with:

```xml
<!--pages/home/home.wxml-->
<view class="page c-paper">
  <!-- Header: city picker (left) + search entry (right) -->
  <view class="header">
    <button class="plain city-picker" bindtap="openCities">
      <text class="city-name">{{cityName}}</text>
      <view class="caret">
        <view class="caret-inner"></view>
      </view>
    </button>

    <view class="header-search" bindtap="openSearch">
      <view class="search-icon"></view>
      <text class="header-search-placeholder">搜索学校</text>
    </view>
  </view>

  <!-- Map (always visible) -->
  <view class="map-section">
    <view class="map-wrap">
      <map id="campusMap"
           class="campus-map"
           latitude="{{cityLat}}"
           longitude="{{cityLng}}"
           scale="12"
           markers="{{mapMarkers}}"
           show-location="{{true}}"
           bindmarkertap="openMarker"></map>
    </view>

    <view class="legend">
      <view wx:for="{{legend}}" wx:key="key" class="legend-item">
        <view class="dot smaller {{item.dotClass}}"></view>
        <text>{{item.label}}</text>
      </view>
    </view>
  </view>

  <!-- List (always below map) -->
  <view class="list-section">
    <view class="list-section-head">
      <text class="section-label">学校 · {{resultsCount}}</text>
    </view>

    <view wx:for="{{groups}}" wx:for-item="g" wx:key="key" class="list-group">
      <view class="list-group-head">
        <view class="dot smaller {{g.dotClass}}"></view>
        <text class="section-label">{{g.label}}</text>
        <text class="ink40">· {{g.count}}</text>
      </view>
      <view wx:for="{{g.items}}" wx:for-item="s" wx:key="id" class="card school-card" data-id="{{s.id}}" bindtap="openSchool">
        <view class="school-card-top">
          <view class="school-card-name-wrap">
            <text class="school-name">{{s.name}}</text>
            <text class="school-meta tnum">{{s.district}} · {{s.distance}} 公里 · {{s.confirms}} 人确认</text>
          </view>
          <view class="badge small {{s.statusBgClass}}">{{s.statusLabel}}</view>
        </view>
        <view class="school-card-facs">
          <view wx:for="{{s.facilitiesList}}" wx:for-item="f" wx:key="key" class="fac-chip {{f.muted ? 'muted' : ''}}">
            <text class="fac-short {{f.bgClass}}">{{f.short}}</text>
            <text class="fac-label {{f.strikethrough ? 'strike' : ''}}">{{f.label}}</text>
            <view class="dot smaller {{f.dotClass}}"></view>
          </view>
        </view>
      </view>
    </view>
    <view wx:if="{{schools.length === 0}}" class="empty">没有符合条件的学校</view>
  </view>

  <!-- FAB -->
  <button class="plain fab" bindtap="openUpdate">
    <text class="fab-plus">+</text>
    <text>我去过</text>
  </button>

  <!-- Filter sheet (kept; trigger added back in Task 3) -->
  <view wx:if="{{filterOpen}}" class="sheet-mask" bindtap="closeFilter">
    <view class="sheet" catchtap="noop">
      <view class="sheet-grab"></view>
      <view class="sheet-head">
        <text class="sheet-title">筛选</text>
        <text class="sheet-reset" bindtap="resetFilter">重置</text>
      </view>

      <text class="section-label">开放等级</text>
      <view class="chip-row">
        <view wx:for="{{statusOptions}}" wx:key="key"
              class="chip {{statusFilterMap[item.key] ? 'on ' + item.bgClass : ''}}"
              data-key="{{item.key}}"
              bindtap="toggleStatus">
          <view class="dot smaller {{item.dotClass}}"></view>
          <text>{{item.label}}</text>
        </view>
      </view>

      <text class="section-label">设施</text>
      <view class="chip-row">
        <view wx:for="{{facOptions}}" wx:key="key"
              class="chip {{facFilterMap[item.key] ? 'dark' : ''}}"
              data-key="{{item.key}}"
              bindtap="toggleFac">
          <text>{{item.label}}</text>
        </view>
      </view>

      <button class="big-button" bindtap="applyFilter">
        应用 <text class="big-button-sub">· {{resultsCount}} 结果</text>
      </button>
    </view>
  </view>
</view>
```

Notable removals:
- `<view class="city-row">` wrapper and the `seg` view-toggle control
- `<view wx:if="{{view === 'map'}}">` / `<view wx:else>` branches
- The `nearby` section (was a duplicate of list head when in map view) — now the unified list serves both purposes
- The standalone `search-row` with the filter button (filter trigger comes back in Task 3)

- [ ] **Step 2: Update home.wxss for new header + section layout**

In `wechat/pages/home/home.wxss`:

Replace the `.header` block:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: #FFFFFF;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid rgba(26,24,21,0.10);
  display: flex;
  align-items: center;
  gap: 16rpx;
}
```

Remove the now-unused blocks: `.city-row`, `.seg`, `.seg-opt`, `.seg-opt.on`, `.search-row`, `.filter-btn`, `.filter-btn.on`, `.filter-count`.

Add a new `.header-search` block (an inline pill, used as nav entry, not an actual input):

```css
.header-search {
  flex: 1;
  height: 64rpx;
  background: #F5F5F5;
  border: 1rpx solid rgba(26,24,21,0.10);
  border-radius: 16rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.header-search-placeholder {
  font-size: 26rpx;
  color: rgba(26,24,21,0.4);
}
```

Keep the existing `.search-icon` block (the magnifier glyph — still used inside `.header-search`).

Rename `.map-view` to `.map-section` (or replace its definition):

```css
.map-section {
  padding: 24rpx 32rpx 0;
  background: #FFFFFF;
}
```

Rename `.list-view` to `.list-section` (or replace its definition):

```css
.list-section {
  padding: 8rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.list-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 8rpx 8rpx;
}
```

Keep `.map-wrap`, `.campus-map`, `.legend`, `.legend-item`, `.list-group-head`, `.school-card`, `.school-meta`, `.empty`, FAB, sheet — these are unchanged.

Remove `.nearby` and `.nearby-head` (no longer used).

- [ ] **Step 3: Update home.js — remove view state, add openSearch**

In `wechat/pages/home/home.js`:

In the `data` object, remove the `view: 'map'` field.

Remove the `switchView` method entirely.

Remove the `nearby: [],` data field and the `nearby: filtered.slice(0, 4),` line inside `recompute()` — the unified list replaces the "nearby" preview.

Add an `openSearch` handler near the other `open*` handlers:

```js
openSearch() {
  wx.showToast({ title: '搜索功能开发中', icon: 'none' });
},
```

The resulting `data` object should look like:

```js
data: {
  filterOpen: false,
  statusFilter: [],
  facFilter: [],
  statusFilterMap: {},
  facFilterMap: {},
  schools: [],
  groups: [],
  mapMarkers: [],
  legend: STATUS_OPTIONS,
  statusOptions: STATUS_OPTIONS,
  facOptions: FAC_OPTIONS,
  schoolsTotal: SCHOOLS.length,
  resultsCount: 0,
  hasFilters: false,
  cityName: '北京',
  cityLat: 39.96,
  cityLng: 116.34,
},
```

And the tail of `recompute()`'s `setData` call should look like (no `nearby:`):

```js
this.setData({
  schools: filtered,
  groups,
  mapMarkers: markers,
  resultsCount: filtered.length,
  hasFilters: sf.size + ff.size > 0,
  statusFilterMap: [...sf].reduce((m, k) => (m[k] = true, m), {}),
  facFilterMap:    [...ff].reduce((m, k) => (m[k] = true, m), {}),
});
```

- [ ] **Step 4: Manual smoke test**

Reload the simulator. On the 附近 tab:

1. Header is a single row: city chip on the left (e.g. "北京 ▾"), search pill on the right
2. Tapping the search pill shows a toast "搜索功能开发中"
3. Map renders below the header
4. Below the map, the list of schools renders, grouped by status (开放 / 限时 / 预约 / …)
5. No "地图 / 列表" toggle anywhere
6. Tapping a school card still navigates to detail
7. Tapping the city chip still opens the existing cities page (changed in Task 4)
8. FAB "我去过" still visible above the tabBar

- [ ] **Step 5: Commit**

```bash
git add wechat/pages/home/home.wxml wechat/pages/home/home.wxss wechat/pages/home/home.js
git commit -m "$(cat <<'EOF'
refactor(wechat/home): single-row header + stacked map/list

去掉地图/列表分段切换控件，header 改为 城市 + 搜索 一行；
map 与 list 上下堆叠常驻。搜索入口暂为 toast 占位。

EOF
)"
```

---

### Task 3: Relocate filter to a chip-row above the list

**Files:**
- Modify: `wechat/pages/home/home.wxml`
- Modify: `wechat/pages/home/home.wxss`

**Goal:** Surface the filter trigger as a row of chips at the top of the list section (replacing the deleted header-row filter button). Each chip toggles a status filter; a "更多筛选" chip on the right opens the full filter sheet (which still drives setting filters).

- [ ] **Step 1: Add filter chip-row to home.wxml**

In `wechat/pages/home/home.wxml`, replace the existing `.list-section-head` block:

```xml
<view class="list-section-head">
  <text class="section-label">学校 · {{resultsCount}}</text>
</view>
```

with:

```xml
<view class="list-section-head">
  <text class="section-label">学校 · {{resultsCount}}</text>
  <button class="plain filter-trigger {{hasFilters ? 'on' : ''}}" bindtap="openFilter">
    筛选
    <text wx:if="{{hasFilters}}" class="filter-trigger-count">· {{statusFilter.length + facFilter.length}}</text>
  </button>
</view>

<scroll-view scroll-x class="filter-chips" enhanced show-scrollbar="{{false}}">
  <view
    wx:for="{{statusOptions}}"
    wx:key="key"
    class="filter-chip {{statusFilterMap[item.key] ? 'on ' + item.bgClass : ''}}"
    data-key="{{item.key}}"
    bindtap="toggleStatus"
  >
    <view class="dot smaller {{item.dotClass}}"></view>
    <text>{{item.label}}</text>
  </view>
</scroll-view>
```

Why: the chip row gives one-tap access to the most-used dimension (开放等级), and the "筛选" button still opens the full sheet for fine-grained control (设施 etc.).

- [ ] **Step 2: Add filter-row styles to home.wxss**

Append to `wechat/pages/home/home.wxss`:

```css
/* List header — filter trigger */
.filter-trigger {
  height: 48rpx;
  padding: 0 20rpx;
  border: 1rpx solid rgba(26,24,21,0.10);
  background: #FFFFFF;
  color: #1A1815;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  letter-spacing: 0.6rpx;
}
.filter-trigger.on {
  background: #1A1815;
  color: #FFFFFF;
  border-color: #1A1815;
}
.filter-trigger-count {
  font-size: 20rpx;
  opacity: 0.8;
}

/* Status chip row (scrollable) */
.filter-chips {
  white-space: nowrap;
  padding: 4rpx 8rpx 16rpx;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 20rpx;
  margin-right: 12rpx;
  background: #FFFFFF;
  border: 1rpx solid rgba(26,24,21,0.10);
  border-radius: 999rpx;
  font-size: 24rpx;
  letter-spacing: 0.6rpx;
}
```

- [ ] **Step 3: Manual smoke test**

1. A row of status chips (完全开放 / 限时开放 / …) is visible above the school list, horizontally scrollable if it overflows
2. Tapping a chip toggles it on; the list filters; the chip background uses the status palette color
3. The "筛选" button on the right of the list head opens the filter sheet
4. Inside the sheet, toggling 设施 filters still works
5. When any filter is active, "筛选" button turns dark with a count badge

- [ ] **Step 4: Commit**

```bash
git add wechat/pages/home/home.wxml wechat/pages/home/home.wxss
git commit -m "$(cat <<'EOF'
feat(wechat/home): surface status filter as chip-row above list

把筛选入口从 header 搬到列表区上方：常用的开放等级做一行可横滑的
chip，整套筛选（含设施）仍由 "筛选" 按钮触发 sheet。

EOF
)"
```

---

### Task 4: City picker — cities page returns selection via eventChannel

**Files:**
- Modify: `wechat/pages/cities/cities.js`
- Modify: `wechat/pages/home/home.js`

**Goal:** When the user taps a city in the cities page, it sends a `selectedCity` event back to home (containing name + center coordinates), and home updates `cityName` / `cityLat` / `cityLng` and re-runs `recompute()`. This replaces the current `wx.navigateBack` "blind return" behavior.

The cities WXML is left unchanged for this plan — `pickCity` is already wired to the `已上线` rows; we only change what `pickCity` does. (Inactive "即将上线" cells already lack a tap binding.)

Note: the data source `utils/data.js` exposes `CITIES`, which should carry each active city's `lat` / `lng`. If it doesn't, add the fields there in Step 0 below.

- [ ] **Step 0: Verify `CITIES` entries carry coordinates**

Read `wechat/utils/data.js`. Each entry in `CITIES` filtered with `c.active === true` must expose `lat` and `lng`. If they exist, skip the rest of this step.

If they don't, add them. Beijing's center used elsewhere in `home.js` is `{ lat: 39.96, lng: 116.34 }`. Mirror that value onto the active CITIES record(s) so this task has data to pass through.

- [ ] **Step 1: Update cities.js `pickCity` to use eventChannel**

Replace the `pickCity` method in `wechat/pages/cities/cities.js`:

```js
pickCity(e) {
  // The tapped city's id is on the bound view via wx:for; pull the row.
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
```

Also, the existing `cities.wxml` binds `bindtap="pickCity"` on each active row but does **not** currently pass `data-id`. Add `data-id="{{item.id}}"` to the `.city-row` element. In `wechat/pages/cities/cities.wxml`, find:

```xml
<view wx:for="{{active}}" wx:key="id" class="card city-row" bindtap="pickCity">
```

and change to:

```xml
<view wx:for="{{active}}" wx:key="id" class="card city-row" data-id="{{item.id}}" bindtap="pickCity">
```

- [ ] **Step 2: Update home.js `openCities` to listen for the event**

Replace the `openCities` method in `wechat/pages/home/home.js`:

```js
openCities() {
  wx.navigateTo({
    url: '/pages/cities/cities',
    events: {
      selectedCity: (city) => {
        this.setData(
          {
            cityName: city.name,
            cityLat: city.lat,
            cityLng: city.lng,
          },
          () => this.recompute(),
        );
      },
    },
  });
},
```

- [ ] **Step 3: Manual smoke test**

1. From 附近 tab, tap the city chip in the header
2. The cities page opens (full-screen navigateTo — tabBar hidden, expected for a non-tab page)
3. Tap an active city row
4. Returns to 附近; the header chip updates to the picked city; map recenters; list rerenders with that city's schools (currently the dataset only has Beijing schools, so the list still shows Beijing schools — but cityName/cityLat/cityLng updating is the verifiable behavior)
5. The 即将上线 cells are not tappable
6. If you back out of cities via the system back button without picking, the home state is unchanged

- [ ] **Step 4: Commit**

```bash
git add wechat/pages/cities/cities.js wechat/pages/cities/cities.wxml \
        wechat/pages/home/home.js wechat/utils/data.js
git commit -m "$(cat <<'EOF'
refactor(wechat): cities page returns selection via eventChannel

cities 由独立页面降级为城市选择器：pickCity 通过 eventChannel
回传选中城市，home.openCities 监听并更新 cityName/lat/lng 后
重新 recompute。

EOF
)"
```

Note: include `wechat/utils/data.js` in the `git add` only if Step 0 modified it.

---

## Self-Review Notes

- **Spec coverage:** All 5 待定 items are locked in the "Locked decisions" preface and each is implemented in a named task. Tab structure (附近 / 关于) → Task 1. Header (city + search) → Task 2. Stacked map/list → Task 2. Cities-as-overlay → Task 4. WeUI ext lib + custom tabBar → Task 1. Filter relocation → Task 3. ✓
- **Out of scope of plan:** real search page (header search shows toast), 动态/榜单 tabs, 排行 (all listed as deferred in the spec). ✓
- **Type consistency:** `selected` is consistently `Number` everywhere (data field, comparison in WXML, dataset cast in `switchTab`). The custom-tab-bar pages list mirrors `app.json` tabBar list — both are 2 entries in the same order. `cityName` / `cityLat` / `cityLng` field names match across home.js, app.json's listed home page, and the cities event payload. `getOpenerEventChannel` API call matches the receiving `events:` key (`selectedCity` on both sides). ✓
