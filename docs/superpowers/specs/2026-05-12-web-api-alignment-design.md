# web (frontend/) 接入 backend API — 设计

## 背景

backend MVP 已经实现 ([backend-design.md](2026-05-12-backend-design.md))，公开 4 个 GET 接口。当前 web 客户端通过 `frontend/src/data/seed.js` 硬编码 10 所北京学校 + 8 个城市。

本 spec 把 web 客户端切换到走 backend API。

**配合 CLAUDE.md §客户端独立性**：本次改造只动 `frontend/`,不引入跨端共享代码。其他客户端通过同样的 backend API 各自独立实现。

## 范围

### 在范围内

- 新增 `frontend/src/data/api.js` —— 薄 HTTP 包装,封装 4 个 GET 接口
- 新增 `frontend/src/data/distance.js` —— Haversine 距离计算
- 新增 `frontend/src/hooks/useApi.js` —— 通用 fetch hook（loading / error / retry）
- 替换 4 个 Screen 的数据来源,从硬编码 → API（HomeScreen / CitiesScreen / DetailScreen / AboutScreen）
- shape 调整以对齐 backend：
  - 删除 `school.zh / school.en` 双语字段使用,统一用 `school.name`（中文优先）
  - 删除 `district.zh / district.en` 显示,卡片副标题改为城市名 + 距离
  - 设施从 5 项（含 walk）减到 4 项（library / track / gym / canteen）
  - status 从 5 值（含 daytime）减到 4 值
  - 详情页头像首字符用 `school.name.charAt(0)`(不再有 short)
- 加载态 + 错误态 + retry
- 删除 `frontend/src/data/seed.js`

### 非目标

- **真正的 React Query / SWR 等缓存库**：MVP 阶段自己写一个简单的 `useApi` hook。后续真的需要复杂的缓存 / 重验证再上 library。
- **学校名 / 地址 / 提示文案的英文翻译**：spec 明确「内容默认中文」。lang === 'en' 时 UI chrome（按钮、标题）走英文,但学校 `name`、reservation `hint`、address 这些内容字段始终显示中文。i18n.js 里相关 key（如 `nearby`、`schedule`）保留,仅删除不再用的（`schedule` 系列、`confirms`、`updatedAt` 等被砍数据相关的）。
- **新的 unit test 框架**：frontend 当前没有测试。本次 alignment 也不引入,验证靠 Vite dev server + 手动点击。
- **`useApi` 之上的额外抽象**：YAGNI。

## 配置 & 环境

### apiBase / 开发代理

`frontend/vite.config.js` 已经配置：

```js
server: { proxy: { '/api': 'http://localhost:8080' } }
```

dev 模式下,前端代码 `fetch('/api/v1/cities')` 会被 Vite 代理到 backend。**无需 apiBase 配置变量**。

**生产部署**（未来）：构建产物里的 `/api/*` 是相对路径,直接打到同域。部署时把前端 build 产物和 backend 放在同一个反向代理（nginx / caddy）后即可：

```
ddxy.xiaoyuanzhu.com/api/v1/* → 转发到 backend :8080
ddxy.xiaoyuanzhu.com/*         → 返回前端静态资源
```

部署细节不在本 spec 范围。

## 架构

### `frontend/src/data/api.js`

```js
async function request(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const fetchCities  = () => request('/api/v1/cities').then((d) => d.cities);
export const fetchSchools = (cityId) =>
  request(cityId ? `/api/v1/schools?city=${encodeURIComponent(cityId)}` : '/api/v1/schools').then((d) => d.schools);
export const fetchSchool  = (id) => request(`/api/v1/schools/${id}`).then((d) => d.school);
```

### `frontend/src/data/distance.js`

```js
// Haversine — km between two GCJ-02 points.
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

### `frontend/src/hooks/useApi.js`

通用 fetch hook,管理 loading / error / data / retry：

```js
import { useEffect, useState, useCallback } from 'react';

export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  return { data, loading, error, retry };
}
```

页面用法：

```js
const { data: schools, loading, error, retry } = useApi(
  () => fetchSchools(cityId),
  [cityId],
);
```

### 用户位置（distance）

```js
const [coords, setCoords] = useState(null);

useEffect(() => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => {},  // silently ignore denial
    { enableHighAccuracy: false, timeout: 5000 },
  );
}, []);

// 用 distance 时:
const withDistance = useMemo(() => {
  if (!schools) return [];
  return schools.map((s) => ({
    ...s,
    distance: coords ? distanceKm(coords.lat, coords.lng, s.lat, s.lng) : null,
  }));
}, [schools, coords]);
```

**注意**：浏览器 `navigator.geolocation` 返回的是 WGS84 坐标，backend / wechat 用的是 GCJ-02。理论上对大陆境内的位置应当做 WGS84 → GCJ-02 转换；但对于 km 级距离展示，两套坐标系的偏差（~500m）对用户感知微乎其微。**本 spec 不做转换，记一行备注供未来真要做地图集成时回看**。

### UI shape 调整

#### 学校名

- 移除：`{lang === 'zh' ? school.zh : school.en}`
- 改为：`{school.name}`

#### 卡片副标题（`SchoolCard.jsx`）

- 当前：`{district.zh/en} · {distance} km · {confirms} confirms`
- 改为：`{cityName}{distance ? ` · ${distance.toFixed(1)} ${t('km', lang)}` : ''}`
- `cityName` 由父组件传入（cities 列表里查 `school.cityId` 对应的 name）

#### 详情页（`DetailScreen.jsx`）

- 头部学校名 + 学校状态 badge：保持 layout,文案改为 `school.name` + i18n 状态文案
- 副标题：移除 district,显示完整 `school.address`（中文）
- 设施列表：从 5 行 → 4 行,顺序固定 `[library, track, gym, canteen]`
- 移除「入校方式」「时间表」「用户补充」section（数据已删）
- 「校园」section：作为顶部状态卡的延展,UI 已经有此区域,文案不变（用 `school.status`）
- 预约：学校级 `school.reservation` + 每设施 `facilities[k].reservation`,layout 沿用现有 modal

#### 城市页（`CitiesScreen.jsx`）

- `cities[].schools` / `cities[].openRate` 直接来自 API（backend 已聚合）
- 不动 `ringDash` 计算逻辑

#### `i18n.js` 清理

- 删 key：`entry`、`schedule`、`weekday`、`weekend`、`summer`、`notes`、`confirms`、`updatedAt`（数据砍了,UI 也不用）
- 保留：appName / nearby / filter / status filters / etc.
- 删 key 时 grep 一遍确认无残留引用

#### `status.js` 清理

- 删除 `daytime` 条目
- `STATUS_ORDER` 从 5 → 4

## 关键文件改动清单

| 文件 | 操作 |
|---|---|
| `frontend/src/data/api.js` | **新增** |
| `frontend/src/data/distance.js` | **新增** |
| `frontend/src/hooks/useApi.js` | **新增** |
| `frontend/src/data/seed.js` | **删除** |
| `frontend/src/data/i18n.js` | 删不再用的 key |
| `frontend/src/data/status.js` | 删 daytime + walk |
| `frontend/src/screens/HomeScreen.jsx` | 全面重写数据加载,用 useApi |
| `frontend/src/screens/CitiesScreen.jsx` | 用 fetchCities |
| `frontend/src/screens/DetailScreen.jsx` | 用 fetchSchool,UI 调整 |
| `frontend/src/screens/AboutScreen.jsx` | 估计无依赖,确认后基本不动 |
| `frontend/src/components/SchoolCard.jsx` | 副标题改为城市名 + 距离 |
| `frontend/src/components/StatusBadge.jsx` | 删 daytime case |
| `frontend/src/components/FacilityIcon.jsx` | 删 walk case |
| `frontend/src/components/FacilityChip.jsx` | 检查是否依赖 walk |
| `frontend/src/context/` | LangContext 不动 |
| `frontend/vite.config.js` | 已经有 proxy,不动 |

## 测试策略

frontend 当前无 unit test 框架；用浏览器手动验证。

**Happy path 验证清单：**

1. 启动 dev backend（`cd backend && make seed && make run`）
2. `cd frontend && npm install && npm run dev` → 打开 `http://localhost:5173`
3. 浏览器允许位置权限（或拒绝后验证降级路径）
4. 首页：
   - [ ] 显示 10 所学校（北京默认）
   - [ ] 卡片副标题：「北京 · X.X km」（授权后）或 「北京」（拒绝后）
   - [ ] 状态筛选 / 设施筛选生效
   - [ ] 列表 ↔ 地图切换正常（地图本身是占位还是真地图,看现状）
5. 切城市：
   - [ ] 城市页显示 8 个城市
   - [ ] 选北京：列表刷新（仍 10 所）
   - [ ] 选上海等：列表为空（backend 该城市没数据）
6. 详情：
   - [ ] PKU：状态 + 学校级预约（QR + hint）+ 设施 4 项
   - [ ] BUPT：closed 状态,设施全 closed
   - [ ] BNU：gym 设施级预约 modal 可打开
7. lang toggle：
   - [ ] 切到 en：UI 标签变英文,学校名仍中文（"北京大学" 不变成 "Peking University"）
   - [ ] 切回 zh：恢复全中文
8. 错误态：
   - [ ] 停 backend → 首页显示错误 + retry 按钮 → backend 起回来 → 点 retry 恢复
9. 控制台无 React warnings / proxy errors

## 待回答的问题

- **lang === 'en' 时学校名显示什么**？方案 spec 已经定为「显示中文 name」。但 UI 里中文字符在 en 模式下可能视觉违和。可选 fallback：用 slug 大写（`pku` → `PKU`）。倾向：先按 spec 走（中文 name）,如果视觉不佳再单独 iterate。
- **地图组件**：检查 HomeScreen 当前有没有真实地图集成。如果是占位/无地图,本次不引入；如果是 placeholder 但样式重要,保留其作为 SVG 装饰元素即可。
