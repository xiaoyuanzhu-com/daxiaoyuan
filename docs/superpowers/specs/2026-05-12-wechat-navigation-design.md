# 微信小程序导航重构 — 设计

## 背景

`wechat/` 目前没有 tabBar，5 个页面（`home / detail / update / cities / about`）通过 `wx.navigateTo` 串联。`home` 内置 城市选择 / 地图/列表切换 / 搜索 / 筛选，承载多个职责。

本次重构在不改动核心功能（学校信息查询、用户共建）的前提下，确立顶层导航结构。

## 目标

- 确立 2 个 tab 的稳定底栏：**附近** / **关于**
- 把 `cities` 从独立页面降级为 `home` 内的城市选择浮层
- 把 `home` 的「地图 ⇄ 列表」切换改为**上下堆叠**，两者常驻
- 在不引入额外资源的前提下使用 WeUI 图标（通过 `useExtendedLib`）

## 与项目使命的对齐

大大校园两项使命：
1. 帮助公众获取大学开放信息
2. 推动大学向社会开放

本次重构只服务使命 1（信息可达性）。使命 2 的承载（动态 / 榜单 / 倡导内容）暂不在 tabBar 体现，留作后续迭代——`关于` tab 暂时承担「价值主张」入口。

## Tab 结构

| Tab | 路径 | 图标（WeUI `mp-icon`） | 说明 |
|---|---|---|---|
| 附近 | `pages/home/home` | `location`（outline / field） | 默认 tab；含城市选择、搜索、地图、列表 |
| 关于 | `pages/about/about` | `info` 或 `tips`（待选定，见「待定」） | 价值主张、《大学》参照、关于页面 |

`detail` / `update` / `cities` 不进入 tabBar，仍以页面 / 浮层形式存在。

## 自定义 tabBar

由于 WeChat 原生 tabBar 的 `iconPath` / `selectedIconPath` 只接受 PNG 文件路径，而我们希望统一用 WeUI 的矢量图标体系，采用**自定义 tabBar 组件**方案。

```
wechat/
└── custom-tab-bar/
    ├── index.js
    ├── index.json     // usingComponents: { "mp-icon": "weui-miniprogram/icon/icon" }
    ├── index.wxml     // 两个 cell，内嵌 <mp-icon icon="location"/> / <mp-icon icon="info"/>
    └── index.wxss
```

`app.json` 的 tabBar 配置：

```json
"tabBar": {
  "custom": true,
  "list": [
    { "pagePath": "pages/home/home",   "text": "附近" },
    { "pagePath": "pages/about/about", "text": "关于" }
  ]
}
```

激活与未激活状态通过 `selected` data 字段控制颜色与 `mp-icon` 的 `type`（`outline` ↔ `field`）。

## 引入 WeUI 扩展库

在 `app.json` 顶层添加：

```json
"useExtendedLib": {
  "weui": true
}
```

不需要 `npm install`。`<mp-icon>` 在 `custom-tab-bar/index.json` 与任何需要图标的页面 `*.json` 中通过 `usingComponents` 引入。

## 附近 (`home`) 页面布局

```
┌────────────────────────────────────────┐
│ 📍 北京 ▼              🔍 搜索学校     │ ← header（顶部固定）
├────────────────────────────────────────┤
│                                        │
│           地图（固定高度）             │ ← 上半屏（建议 45% viewport）
│           · 我的位置                   │
│           · 学校 marker + callout      │
│                                        │
├────────────────────────────────────────┤
│ 附近学校 · N                            │
│ ┌──────────────────────────────────┐  │
│ │ 清华大学 · 完全开放 · 0.8 km    │  │ ← 下半屏（滚动列表）
│ ├──────────────────────────────────┤  │
│ │ 北京大学 · 预约开放 · 1.2 km    │  │
│ │ ...                              │  │
└────────────────────────────────────────┘
```

变化点：
- 移除「地图 / 列表」分段切换控件——两者堆叠常驻
- 城市选择左移到 header 左侧；点击打开浮层（不再 `navigateTo`）
- 搜索入口移到 header 右侧——保留作为页面入口/浮层（具体形态见「待定」）

保留：
- 当前的「我去过」FAB（contribution 入口，与使命对齐）
- 当前的筛选能力（开放等级 / 设施）——通过 header 上一个紧凑的图标按钮，或列表头部的 chip 行触发；具体见「待定」

## 城市选择浮层

`cities` 页面文件保留，但承担方式改为浮层：
- 触发：点击 `home` header 左侧的城市 chip
- 形态：从底部上滑的 sheet（或全屏页面 + `wx.navigateTo` 后用 `eventChannel` 回传选中城市）
- 选择后：回填 `home.data.cityName` / `cityLat` / `cityLng`，重新 `recompute()`

实现形态二选一，见「待定」。

## 文件变更概览

| 文件 | 动作 |
|---|---|
| `app.json` | 新增 `tabBar.custom = true` + 两项 list；新增 `useExtendedLib.weui = true` |
| `custom-tab-bar/index.{js,json,wxml,wxss}` | 新建 4 个文件 |
| `pages/home/home.wxml` | 删除 view 切换；header 改为 city + 搜索；map 与 list 改为堆叠 |
| `pages/home/home.js` | 删除 `view` / `switchView`；`openCities` 改为打开浮层；新增 search 入口 handler |
| `pages/home/home.wxss` | 调整 header / map / list 区段高度与堆叠样式 |
| `pages/cities/cities.{wxml,js}` | 调整为可作为浮层 / 选择器使用，返回选中城市 |
| `pages/about/about.*` | 不变（作为 tab 直接挂载即可） |
| `pages/detail/`、`pages/update/` | 不变 |

## 待定（留到实现阶段决定）

1. **搜索形态**：独立页面 `pages/search/search` vs. `home` 内的全屏浮层
2. **城市选择形态**：`wx.navigateTo` + `eventChannel` 回传 vs. 自定义 sheet 组件
3. **筛选入口位置**：header 紧凑图标 vs. 列表头部 chip 行
4. **关于 tab 图标**：`info`（信息感强）vs. `tips`（提示感）——需对照 WeUI 实际图标视觉择优
5. **图标尺寸 / 颜色 token**：tab 默认色与选中色（与 `app.wxss` 现有色板对齐）

## 非目标

- 不引入 npm 构建流程（继续走 `useExtendedLib`）
- 不接入 TDesign 或 iconfont
- 不实现 动态 / 榜单 / 排行 等使命 2 功能
- 不变更 `detail` / `update` 页面
- 不引入账号体系
