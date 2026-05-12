# web (frontend/) 接入 backend API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 web 客户端的数据源从 `frontend/src/data/seed.js` 硬编码切换到 backend API([2026-05-12-web-api-alignment-design.md](../specs/2026-05-12-web-api-alignment-design.md))。

**Architecture:** 新增 `api.js`(fetch 包装)+ `distance.js`(Haversine)+ `useApi` hook(loading/error/retry);改造 4 个 screen + 共享 components(SchoolCard / StatusBadge / FacilityIcon / FacilityChip);清理 status.js + i18n.js 中 daytime / walk / schedule 残留;删除 seed.js。每 screen 加 loading + error + retry。

**Tech Stack:** React 18 + Vite + react-router-dom。`fetch` API。无 unit test 框架,验证靠 Vite dev server + 浏览器。Vite proxy 已配置 `/api → http://localhost:8080`。

**Working directory:** `/Users/iloahz/projects/dadaxiaoyuan/frontend`(前端 root)。命令默认从这里跑;repo root 在 `/Users/iloahz/projects/dadaxiaoyuan`。

**Repo branch:** `main`(已 confirm,直接 main)

**配套依赖:** Backend 必须在 `localhost:8080` 上跑。Vite 已经配好 `server.proxy` 转发 `/api/*`。

---

## Task 1: 准备 dev 环境

**Files:** 无新增文件,只是 dev 启动 checklist。

- [ ] **Step 1: 启动 backend**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan/backend
rm -f ddxy.db
make seed   # 期望: "imported 10 schools into ./ddxy.db"
make run    # 后台跑;新开一个 shell 继续
```

验证:`curl localhost:8080/api/v1/cities | head -c 100` 返回 JSON 开头。

- [ ] **Step 2: 安装前端依赖(如未安装)**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan/frontend
[ -d node_modules ] || npm install
```

- [ ] **Step 3: 启动 vite dev,验证基线**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan/frontend
npm run dev   # 后台跑;输出会显示 http://localhost:5173
```

打开浏览器到 `http://localhost:5173`,确认当前(改造前)首页能正常显示 10 张学校卡片(走 seed.js 硬编码)。这是 baseline。后续每个 task 完成都用 vite 的热重载验证。

- [ ] **Step 4: 验证 proxy 工作**

新开一个 shell:

```bash
curl -s http://localhost:5173/api/v1/cities | head -c 100
```

期望:返回 cities JSON(被 vite 代理转发到 backend)。如果失败,检查 `vite.config.js` 的 `server.proxy` 配置,以及 backend 是否在 8080 上跑。

- [ ] **Step 5: 不 commit。继续 Task 2。**

---

## Task 2: 添加 api.js + distance.js + useApi hook

**Files:**
- Create: `frontend/src/data/api.js`
- Create: `frontend/src/data/distance.js`
- Create: `frontend/src/hooks/useApi.js`

- [ ] **Step 1: 创建 `frontend/src/data/api.js`**

```js
// HTTP client for the central backend.
// See docs/superpowers/specs/2026-05-12-backend-design.md for API contract.
// Paths are relative — Vite proxies /api/* to http://localhost:8080 in dev,
// same-origin in prod.

async function request(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const fetchCities = () =>
  request('/api/v1/cities').then((d) => d.cities);

export const fetchSchools = (cityId) =>
  request(cityId ? `/api/v1/schools?city=${encodeURIComponent(cityId)}` : '/api/v1/schools')
    .then((d) => d.schools);

export const fetchSchool = (id) =>
  request(`/api/v1/schools/${encodeURIComponent(id)}`).then((d) => d.school);
```

- [ ] **Step 2: 创建 `frontend/src/data/distance.js`**

```js
// Haversine — km between two GCJ-02 lat/lng points.
// Note: browser navigator.geolocation returns WGS84, backend stores GCJ-02.
// For mainland China km-scale distance display, the ~500m offset is
// negligible. Worth a proper conversion if/when a real map library lands.

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

- [ ] **Step 3: 创建 `frontend/src/hooks/useApi.js`**

(目录 `src/hooks/` 当前不存在,创建。)

```bash
mkdir -p /Users/iloahz/projects/dadaxiaoyuan/frontend/src/hooks
```

写入 `frontend/src/hooks/useApi.js`:

```js
import { useCallback, useEffect, useState } from 'react';

// useApi runs a fetcher function and tracks loading / error / data state.
// Pass deps to retrigger when inputs change (e.g. cityId for schools list).
// Returns { data, loading, error, retry } where retry re-runs the fetcher.
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

- [ ] **Step 4: 验证编译通过**

vite 是热重载的,新增文件本身不会触发任何引用错误。检查 console:

```bash
# vite dev 应该自动 watch
# 在 http://localhost:5173 看 dev tools console,应该没有报错
```

或者:

```bash
cd /Users/iloahz/projects/dadaxiaoyuan/frontend
npx vite build --mode development 2>&1 | tail -10
```

期望:build 成功(可能有未使用变量 warning,无 error)。

- [ ] **Step 5: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add frontend/src/data/api.js frontend/src/data/distance.js frontend/src/hooks/useApi.js
git commit -m "feat(web): add api client, distance util, and useApi hook"
```

---

## Task 3: CitiesScreen 改走 API

**Files:**
- Modify: `frontend/src/screens/CitiesScreen.jsx`

- [ ] **Step 1: 替换整个 CitiesScreen.jsx 的数据加载**

打开 `frontend/src/screens/CitiesScreen.jsx`。当前:

```js
import { CITIES } from '../data/seed.js';
// ...
const active = CITIES.filter((c) => c.active);
const soon = CITIES.filter((c) => !c.active);
```

改成:

```js
import { useApi } from '../hooks/useApi.js';
import { fetchCities } from '../data/api.js';
// (删除 CITIES import)
// ...
// 在 component body 顶部:
const { data: cities, loading, error, retry } = useApi(fetchCities);
const active = (cities || []).filter((c) => c.active);
const soon = (cities || []).filter((c) => !c.active);
```

然后在 return 的 JSX 顶部,把 main content 用条件渲染包起来:

```jsx
return (
  <div style={{ background: C.paper, minHeight: '100%', paddingBottom: 60 }}>
    <AppHeader title={t('citiesTitle', lang)} accent={C.paper} />

    {loading && <StatusOverlay>{lang === 'zh' ? '加载中…' : 'Loading…'}</StatusOverlay>}
    {error && !loading && (
      <StatusOverlay>
        <div>{error.message || (lang === 'zh' ? '加载失败' : 'Failed to load')}</div>
        <button onClick={retry} type="button" style={statusOverlayBtn}>
          {lang === 'zh' ? '重试' : 'Retry'}
        </button>
      </StatusOverlay>
    )}

    {!loading && !error && (
      <div style={{ padding: '20px 16px' }}>
        {/* ...existing active / soon rendering... */}
      </div>
    )}
  </div>
);
```

`StatusOverlay` 是一个 inline 局部组件 + style 常量,加在文件底部:

```jsx
function StatusOverlay({ children }) {
  return (
    <div style={{
      padding: '40px 16px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 12,
    }}>
      <div style={{ fontSize: 14, color: C.ink60 }}>{children}</div>
    </div>
  );
}

const statusOverlayBtn = {
  background: C.ink, color: '#fff',
  padding: '8px 20px', border: 0, borderRadius: 6,
  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
};
```

**注意:**`StatusOverlay` 会在 HomeScreen / DetailScreen 中再次使用 —— 如果不想重复,可以提取到 `frontend/src/components/StatusOverlay.jsx`。本 plan 选择 **每个 screen 内联**(DRY 反义,但 component 只 ~10 行,而且各 screen 的 overlay 文案 / 按钮文字略有差异,提早抽象会僵化)。

如果实施时觉得三处重复太丑,可以在 Task 7 一并抽到 `frontend/src/components/StatusOverlay.jsx`。这是 cleanup decision,放后面。

`cities` 数据里的 `schools`(数量)和 `openRate` 已经由 backend 聚合,直接显示即可。CitiesScreen 现有的 `c.openRate` / `c.schools` 渲染逻辑不动。

- [ ] **Step 2: smoke test**

浏览器到 `http://localhost:5173/cities`(假设 route 是 `/cities`,如果不是看 App.jsx 的路由):
- 期望:8 个城市(1 个 active + 7 soon)
- 北京:显示 schools=10,openRate ≈ 0.5(scope A 种子)
- 其他城市:显示 schools=0,openRate=0

如果路由不对或加载不出来,看 console。最常见问题是 backend 没起。

- [ ] **Step 3: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add frontend/src/screens/CitiesScreen.jsx
git commit -m "feat(web/cities): switch to backend API with loading/error states"
```

---

## Task 4: SchoolCard 重写副标题

**Files:**
- Modify: `frontend/src/components/SchoolCard.jsx`

SchoolCard 当前接 `school` prop,从中读 `school.zh / en / district.zh / en / distance / confirms`。后端 shape 是 `school.name`(中文),`address`(中文),无 `district` / `distance` / `confirms`。改造:

- school name:直接用 `school.name`(中文)
- 副标题:用父传入的 `cityName` + 父算好的 `distanceKm`(可空)
- 不再显示 confirms

- [ ] **Step 1: 替换 SchoolCard.jsx**

```jsx
import { StatusBadge } from './StatusBadge.jsx';
import { FacilityChip } from './FacilityChip.jsx';
import { t } from '../data/i18n.js';
import { C } from '../theme.js';

// school: backend shape (SchoolSummary for list, School for detail).
// cityName: parent passes the city display name (e.g. '北京').
// distanceKm: parent passes pre-computed distance from user (or null).
// density: 'compact' hides the facility chip row.
export function SchoolCard({ school, cityName, distanceKm, lang, density = 'medium', onClick }) {
  const hasFacilities = !!school.facilities;
  return (
    <button onClick={onClick} type="button" style={{
      background: C.card, border: `1px solid ${C.line}`,
      borderRadius: 12, padding: density === 'compact' ? '12px 14px' : '14px 16px',
      width: '100%', textAlign: 'left', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 6 : 10,
      fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: density === 'compact' ? 15 : 16, fontWeight: 600, color: C.ink,
            letterSpacing: lang === 'zh' ? 0.5 : 0, lineHeight: 1.2,
          }}>
            {school.name}
          </div>
          <div style={{
            fontSize: 11, color: C.ink40, marginTop: 2,
            fontFeatureSettings: '"tnum"',
          }}>
            {cityName}
            {typeof distanceKm === 'number' && (
              <>{' · '}{distanceKm.toFixed(1)} {t('km', lang)}</>
            )}
          </div>
        </div>
        <StatusBadge status={school.status} lang={lang} size="sm" />
      </div>
      {density !== 'compact' && hasFacilities && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          {Object.keys(school.facilities).map((k) => (
            <FacilityChip key={k} kind={k} status={school.facilities[k].status} lang={lang} dense />
          ))}
        </div>
      )}
    </button>
  );
}
```

变化:
- 学校名:`{school.name}`(永远中文)
- 副标题:`{cityName}` + 可选 `{distanceKm.toFixed(1)} km`
- 设施 chip:从 `school.facilities[k]`(原本是字符串)改成 `school.facilities[k].status`(新 shape 是对象)
- 当 `school.facilities` 不存在(summary shape),不渲染 chip row

**注意:**`FacilityChip` 接的 `status` prop 还是字符串。我们传 `school.facilities[k].status`,FacilityChip 内部不变。

- [ ] **Step 2: 因为 SchoolCard 的 prop 变了,先记下使用者:**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan/frontend
grep -rn "SchoolCard" src/
```

应该看到 HomeScreen 用了 SchoolCard。Task 5 会更新 HomeScreen 传入新 props(`cityName`, `distanceKm`)。

- [ ] **Step 3: 不要现在 smoke test**(HomeScreen 还没改,会传错 prop) —— 留到 Task 5 一起验证。

- [ ] **Step 4: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add frontend/src/components/SchoolCard.jsx
git commit -m "feat(web/card): SchoolCard reads school.name + accepts cityName/distanceKm props"
```

---

## Task 5: HomeScreen 改走 API + 修 MapView

**Files:**
- Modify: `frontend/src/screens/HomeScreen.jsx`

HomeScreen 当前从 `SCHOOLS` 常量读取并过滤。要改成 `useApi(fetchSchools, [cityId])` + 用户位置 hook。同时修 MapView 里两处对 `s.zh` / `s.short` 的引用。

- [ ] **Step 1: 通读 HomeScreen 现状**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan/frontend
cat src/screens/HomeScreen.jsx | head -50
```

主要要改的地方:
- imports:删 `import { SCHOOLS } from '../data/seed.js'`,加 useApi / fetchSchools / useGeolocation 等
- 过滤逻辑:从 `SCHOOLS.filter(...)` 改成 `(filteredSchools || []).filter(...)`
- 加 loading/error 状态
- MapView 里 `s.zh.replace('大学', '')` 改成 `s.name.replace('大学', '')`,`s.short` 不再有 → 也用 `s.name.replace('大学', '')`
- 卡片传入的 SchoolCard props 加 `cityName` + `distanceKm`

- [ ] **Step 2: 修 HomeScreen.jsx — 加 imports 和 hooks**

替换文件顶部 imports + component 顶部:

```jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SchoolCard } from '../components/SchoolCard.jsx';
import { Segment } from '../components/Segment.jsx';
import { SectionLabel } from '../components/SectionLabel.jsx';
import { FacilityIcon } from '../components/FacilityIcon.jsx';
import { LangToggle } from '../components/AppHeader.jsx';
import { fetchSchools } from '../data/api.js';
import { distanceKm } from '../data/distance.js';
import { useApi } from '../hooks/useApi.js';
import { STATUS, STATUS_ORDER, FACILITIES } from '../data/status.js';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { C, serif } from '../theme.js';

export default function HomeScreen() {
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const accent = C.paper;
  const [view, setView] = useState('map');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => new Set());
  const [facFilter, setFacFilter] = useState(() => new Set());

  // City — for MVP we only support 'bj'. CitiesScreen navigates back to / on pick.
  const cityId = 'bj';
  const cityName = '北京';

  // User location (browser geolocation). Fail silently — distance just won't show.
  const [coords, setCoords] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000 },
    );
  }, []);

  // Fetch schools for current city.
  const { data: schools, loading, error, retry } = useApi(
    () => fetchSchools(cityId),
    [cityId],
  );

  // Pre-compute distance for sorting and display.
  const schoolsWithDistance = useMemo(() => {
    if (!schools) return [];
    return schools.map((s) => ({
      ...s,
      distanceKm: coords ? distanceKm(coords.lat, coords.lng, s.lat, s.lng) : null,
    }));
  }, [schools, coords]);

  const toggle = (set, setter, v) => {
    const next = new Set(set);
    next.has(v) ? next.delete(v) : next.add(v);
    setter(next);
  };

  // Filter + sort. Note: list endpoint returns summary (no facilities), so
  // facility filtering does nothing here. We keep the UI to avoid an extra
  // task, with a TODO in the design spec to follow up.
  const filtered = schoolsWithDistance.filter((s) => {
    if (statusFilter.size && !statusFilter.has(s.status)) return false;
    return true;
  }).sort((a, b) => {
    const aOrder = STATUS[a.status].order;
    const bOrder = STATUS[b.status].order;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const da = a.distanceKm === null ? Infinity : a.distanceKm;
    const db = b.distanceKm === null ? Infinity : b.distanceKm;
    return da - db;
  });

  const hasFilters = statusFilter.size + facFilter.size > 0;

  // —— render below ——
```

- [ ] **Step 3: 修 HomeScreen.jsx — 加 loading / error 渲染**

紧接着 component 的 `return (`,在 sticky header 块之后、view-switcher 之前,加状态遮罩:

```jsx
return (
  <div style={{ background: C.paper, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
    {/* ...existing sticky header... */}

    {loading && (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: C.ink60, fontSize: 14 }}>
        {lang === 'zh' ? '加载中…' : 'Loading…'}
      </div>
    )}

    {error && !loading && (
      <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 14, color: C.ink60 }}>
          {error.message || (lang === 'zh' ? '加载失败' : 'Failed to load')}
        </div>
        <button onClick={retry} type="button" style={{
          background: C.ink, color: '#fff', padding: '8px 20px', border: 0,
          borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {lang === 'zh' ? '重试' : 'Retry'}
        </button>
      </div>
    )}

    {!loading && !error && (
      <>
        {/* the existing view-switcher + map/list section */}
      </>
    )}
  </div>
);
```

把现有的 `{view === 'map' ? <MapView ... /> : ...}` 块整个放到这个 `<>...</>` 里(包括其他原来的内容)。

- [ ] **Step 4: 修 HomeScreen.jsx — 传新 prop 给 SchoolCard**

找到现有的 `<SchoolCard ... />` 调用,把 prop 改成新接口:

```jsx
// 之前 (示意,具体行号在 ~250 附近的 list view):
// <SchoolCard school={s} lang={lang} onClick={() => navigate(`/s/${s.id}`)} />

// 改成:
<SchoolCard
  school={s}
  cityName={cityName}
  distanceKm={s.distanceKm}
  lang={lang}
  onClick={() => navigate(`/s/${s.id}`)}
/>
```

并把 `filtered` / 列表中的 `schools.slice(0, 4)` 之类的引用全部改成 `filtered`(已经定义)。如果有用 `schools` 变量名引用旧 SCHOOLS 的地方,改成 `filtered` 或 `schoolsWithDistance`。

- [ ] **Step 5: 修 HomeScreen.jsx — MapView 内的字段引用**

找到 `function MapView({ lang, schools, onOpen })`(同文件内,~line 137)。

里面的:

```jsx
}}>{lang === 'zh' ? s.zh.replace('大学', '') : s.short}</div>
```

改成:

```jsx
}}>{s.name.replace('大学', '')}</div>
```

(中英文都显示中文 name —— spec 决议)

`MapView` 接的 `schools` 参数现在是 `schoolsWithDistance`(或 `filtered`),都有 `s.name` / `s.lat` / `s.lng` / `s.status`,与 MapView 内部所有引用兼容。

- [ ] **Step 6: smoke test**

浏览器看 `http://localhost:5173`:
- 期望:首页地图视图,10 所学校 markers 标签显示「北大」「清华」等
- 切到列表视图:10 张卡片,每张副标题「北京 · X.X km」(允许定位)或「北京」(拒绝)
- 状态筛选:勾「完全开放」,只剩 5 所
- 设施筛选:勾「图书馆」 —— **预期不生效**(summary 无 facilities,与 wechat 同样退化)
- console:无 React warning

- [ ] **Step 7: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add frontend/src/screens/HomeScreen.jsx
git commit -m "feat(web/home): switch to backend API; MapView uses school.name"
```

---

## Task 6: DetailScreen 改走 API

**Files:**
- Modify: `frontend/src/screens/DetailScreen.jsx`

- [ ] **Step 1: 通读现状**

```bash
cat /Users/iloahz/projects/dadaxiaoyuan/frontend/src/screens/DetailScreen.jsx | head -60
```

需要改的部分:
- imports:删 `findSchool` from seed.js,加 fetchSchool + useApi
- 加载逻辑:`useApi(() => fetchSchool(id), [id])`
- 学校名:全部 `school.zh / en` → `school.name`
- district 显示:整段删,改用 `school.address`(完整地址)
- 入校方式 section / 时间表 section / 用户补充 section:整段删
- 设施列表:`facKeys.map(...)` 里把 `school.facilities[k]`(原本字符串)改成 `school.facilities[k].status`
- 设施 walk:已经不在 facilities 里(后端不返回),自然消失

- [ ] **Step 2: 改 DetailScreen.jsx imports + 加载逻辑**

替换文件顶部:

```jsx
import { useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { FacilityIcon } from '../components/FacilityIcon.jsx';
import { SectionLabel } from '../components/SectionLabel.jsx';
import { useApi } from '../hooks/useApi.js';
import { fetchSchool } from '../data/api.js';
import { STATUS, FACILITIES } from '../data/status.js';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { C, serif } from '../theme.js';

export default function DetailScreen() {
  const { lang } = useLang();
  const { id } = useParams();
  const { data: school, loading, error, retry } = useApi(
    () => fetchSchool(id),
    [id],
  );

  if (loading) {
    return (
      <div style={{ background: C.paper, minHeight: '100%' }}>
        <AppHeader title={lang === 'zh' ? '加载中…' : 'Loading…'} />
        <div style={{ padding: 40, color: C.ink60, fontSize: 14, textAlign: 'center' }}>
          {lang === 'zh' ? '加载中…' : 'Loading…'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: C.paper, minHeight: '100%' }}>
        <AppHeader title={lang === 'zh' ? '加载失败' : 'Failed'} />
        <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ color: C.ink60, fontSize: 14 }}>{error.message}</div>
          <button onClick={retry} type="button" style={{
            background: C.ink, color: '#fff', padding: '8px 20px', border: 0,
            borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {lang === 'zh' ? '重试' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div style={{ background: C.paper, minHeight: '100%' }}>
        <AppHeader title={lang === 'zh' ? '未找到' : 'Not found'} />
        <div style={{ padding: 24, color: C.ink60, fontSize: 14 }}>
          {lang === 'zh' ? '没有这所学校。' : 'No such school.'}
        </div>
      </div>
    );
  }

  const st = STATUS[school.status];
  const name = school.name;
  const facKeys = Object.keys(school.facilities);
  // notes / entry / schedule are not part of the backend shape — sections removed.
```

- [ ] **Step 3: 改 DetailScreen.jsx — header 区域**

找到 header 块(`<AppHeader title={name} accent={st.bg} />` 之后)。当前用:

```jsx
{lang === 'zh' ? school.zh.charAt(0) : school.short.charAt(0)}
{lang === 'zh' ? school.district.zh : school.district.en} · {school.distance} {t('km', lang)}
{name}
{lang === 'zh' ? school.en : school.zh}
{lang === 'zh' ? st.zh : st.en}
{lang === 'zh' ? `${school.lastUpdate}更新 · ${school.confirms} 人确认` : `${t('updatedAt', 'en')} ${school.lastUpdateEn} · ${school.confirms} ${t('confirms', 'en')}`}
```

改成:

```jsx
// SVG 头像首字:
{school.name.charAt(0)}
// 副标题:
{school.address || ''}
// 标题:
{name}
// 副标题第二行: 删掉(原 school.en / zh 双语副标题不再有数据)
// 状态:
{lang === 'zh' ? st.zh : st.en}
// 更新时间(从 lastUpdate ISO timestamp 来):
{relativeTime(school.lastUpdate, lang)}
```

`relativeTime` 是一个本地辅助函数,加在文件底部:

```jsx
function relativeTime(iso, lang) {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  const min = 60, hour = 3600, day = 86400, week = day * 7;
  if (lang === 'zh') {
    if (diffSec < hour)      return `${Math.max(1, Math.floor(diffSec / min))} 分钟前更新`;
    if (diffSec < day)       return `${Math.floor(diffSec / hour)} 小时前更新`;
    if (diffSec < week)      return `${Math.floor(diffSec / day)} 天前更新`;
    return `${Math.floor(diffSec / week)} 周前更新`;
  }
  if (diffSec < hour)        return `Updated ${Math.max(1, Math.floor(diffSec / min))}m ago`;
  if (diffSec < day)         return `Updated ${Math.floor(diffSec / hour)}h ago`;
  if (diffSec < week)        return `Updated ${Math.floor(diffSec / day)}d ago`;
  return `Updated ${Math.floor(diffSec / week)}w ago`;
}
```

把原来「`...school.confirms` 人确认」那行整个移除。

整体的副标题(更新时间)行可以是:

```jsx
<div style={{
  fontSize: 11, color: st.ink, opacity: 0.65, marginTop: 8,
  display: 'flex', alignItems: 'center', gap: 6,
}}>
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
  {relativeTime(school.lastUpdate, lang)}
</div>
```

- [ ] **Step 4: 改 DetailScreen.jsx — entry section 移除**

找到:

```jsx
<DetailSection lang={lang} label={t('entry', lang)}>
  ...
</DetailSection>
```

整段删除(数据已无)。

- [ ] **Step 5: 改 DetailScreen.jsx — schedule section 移除**

找到:

```jsx
<DetailSection lang={lang} label={t('schedule', lang)}>
  ...
</DetailSection>
```

整段删除。

- [ ] **Step 6: 改 DetailScreen.jsx — facilities section 字段调整**

找到 facilities section:

```jsx
<DetailSection lang={lang} label={t('facilities', lang)}>
  <div ...>
    {facKeys.map((k, i) => {
      const muted = school.facilities[k] === 'closed' || school.facilities[k] === 'alumni';
      // ...
      <div ... textDecoration: school.facilities[k] === 'closed' ? 'line-through' : 'none'>
        {lang === 'zh' ? FACILITIES[k].zh : FACILITIES[k].en}
      </div>
      <StatusBadge status={school.facilities[k]} ... />
    })}
  </div>
</DetailSection>
```

改成:

```jsx
<DetailSection lang={lang} label={t('facilities', lang)}>
  <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
    {facKeys.map((k, i) => {
      const f = school.facilities[k];
      const muted = f.status === 'closed' || f.status === 'alumni';
      return (
        <div key={k} style={{
          display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 12,
          borderTop: i === 0 ? 'none' : `1px solid ${C.line}`,
        }}>
          <FacilityIcon kind={k} size={18} color={muted ? C.ink40 : C.ink} />
          <div style={{
            flex: 1, fontSize: 14, color: muted ? C.ink40 : C.ink,
            letterSpacing: lang === 'zh' ? 0.3 : 0,
            textDecoration: f.status === 'closed' ? 'line-through' : 'none',
          }}>{lang === 'zh' ? FACILITIES[k].zh : FACILITIES[k].en}</div>
          <StatusBadge status={f.status} lang={lang} size="sm" />
        </div>
      );
    })}
  </div>
</DetailSection>
```

- [ ] **Step 7: 改 DetailScreen.jsx — notes section 移除**

找到:

```jsx
{notes.length > 0 && (
  <DetailSection lang={lang} label={t('notes', lang)}>
    ...
  </DetailSection>
)}
```

整段删除(连带删除上面的 `const notes = school.notes || [];`)。

- [ ] **Step 8: smoke test**

- 浏览器 `http://localhost:5173/s/pku`(假设 route 是 `/s/:id`)
- 期望:
  - 标题「北京大学」中文
  - 副标题:地址(scope A 种子数据其实是空,所以这里可能为空字符串 —— 接受)
  - 状态卡:「预约开放」(中文)或「By appointment」(英文)
  - 更新时间:「X 天前更新」/「Updated Xd ago」
  - 4 项设施:全部「未开放」(line-through)
  - 入校方式 / 时间表 / 用户补充 三个 section **不存在**
- 切 lang:UI 标签变英文,但学校名依然中文
- 浏览 `/s/bnu`:gym 行,如果点状态 badge 应该弹 reservation modal
  - **如果现有代码没接 reservation modal 行为,这是新功能 ——本 plan 不引入。** 详情页的 reservation modal 是 wechat 的功能,web 端 spec 没明说要 mirror。如果 web 端需要 modal,作为 follow-up plan。

**Reservation 显示策略(本 plan 选)**:在设施行末尾、Status badge 右侧,如果 `f.reservation` 非空,显示一个小图标作为提示(或文字「需预约」),不实现 modal。或者干脆不显示(信息已经在 status='appt' 里隐含)。

为了保持本 plan 范围紧凑,**选后者:不额外显示 reservation 信息**。spec 里把"reservation modal"明确归为 wechat 端的功能,web 端 follow-up。

更新 spec 注脚以反映这个决议。

- [ ] **Step 9: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add frontend/src/screens/DetailScreen.jsx
git commit -m "feat(web/detail): switch to backend API; drop entry/schedule/notes sections"
```

---

## Task 7: 清理 status.js + i18n.js + 共享 components

**Files:**
- Modify: `frontend/src/data/status.js`
- Modify: `frontend/src/data/i18n.js`
- Modify: `frontend/src/components/StatusBadge.jsx`(顺带 check)
- Modify: `frontend/src/components/FacilityIcon.jsx`
- Modify: `frontend/src/components/FacilityChip.jsx`(顺带 check)
- Delete: `frontend/src/data/seed.js`

- [ ] **Step 1: 改 status.js**

替换整个文件:

```js
export const STATUS = {
  open:   { key: 'open',   bg: '#D4E8C8', ink: '#2E5A1C', dot: '#5BA13C', zh: '完全开放', en: 'Fully open',     order: 1 },
  appt:   { key: 'appt',   bg: '#F2C99A', ink: '#7A3A06', dot: '#C66A1C', zh: '预约开放', en: 'By appointment', order: 2 },
  alumni: { key: 'alumni', bg: '#D9D5CE', ink: '#3A372F', dot: '#7A7568', zh: '仅校友',   en: 'Alumni only',    order: 3 },
  closed: { key: 'closed', bg: '#E8C4B8', ink: '#7A2418', dot: '#B43A28', zh: '关闭',     en: 'Closed',         order: 4 },
};

export const FACILITIES = {
  library: { zh: '图书馆', en: 'Library', icon: 'library' },
  track:   { zh: '操场',   en: 'Track',   icon: 'track' },
  gym:     { zh: '体育馆', en: 'Gym',     icon: 'gym' },
  canteen: { zh: '食堂',   en: 'Canteen', icon: 'canteen' },
};

export const STATUS_ORDER = ['open', 'appt', 'alumni', 'closed'];
```

变化:删 `daytime` 条目;删 `walk` facility;order 1-4。

- [ ] **Step 2: 改 i18n.js**

打开 `frontend/src/data/i18n.js`。删除以下 key(因为对应 UI 已经不渲染):

- `entry`
- `schedule`
- `weekday`
- `weekend`
- `summer`
- `notes`
- `confirms`
- `updatedAt`

保留所有其他 key。

- [ ] **Step 3: 改 FacilityIcon.jsx — 删 walk case**

`frontend/src/components/FacilityIcon.jsx` 当前:

```jsx
switch (kind) {
  case 'walk':
    return (
      <svg ...>...</svg>
    );
  case 'library':
    ...
```

把整个 `case 'walk':` 块删除。其他 4 个 case 保留。

- [ ] **Step 4: 检查 StatusBadge.jsx 是否有 daytime 引用**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
grep -n "daytime" frontend/src/components/StatusBadge.jsx
```

期望:无输出(StatusBadge 通过 `STATUS[status]` 查表,不硬编码 daytime)。如果有,删掉。

- [ ] **Step 5: 检查 FacilityChip.jsx**

```bash
grep -n "walk\|daytime" frontend/src/components/FacilityChip.jsx
```

期望:无输出(它也通过 FACILITIES 表查找)。

- [ ] **Step 6: 删除 seed.js**

确认所有 seed.js consumer 都已经迁移:

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
grep -rn "from.*data/seed\|import.*seed\.js" frontend/src/
```

期望:**无输出**。如果还有 import,先去对应文件删 import 再继续。

```bash
rm frontend/src/data/seed.js
```

- [ ] **Step 7: 编译 + 全局 grep 检查无遗漏**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan/frontend

# 检查无 daytime / walk 残留(除了文档)
grep -rn "daytime\|'walk'" src/

# 检查无 seed.js 引用
grep -rn "data/seed" src/
```

两个 grep 应该都无输出(或者只在 SVG 路径里 `case 'walk':` 这种已经删除的位置 —— 验证)。

启动 vite 看编译:

```bash
npm run build 2>&1 | tail -20
```

期望:Build successful.

如果有 unused-variable warning,清理掉。

- [ ] **Step 8: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add frontend/src/data/status.js frontend/src/data/i18n.js \
        frontend/src/components/FacilityIcon.jsx
git rm frontend/src/data/seed.js
git commit -m "chore(web): drop daytime/walk + dead i18n keys + remove seed.js"
```

---

## Task 8: 全流程 smoke test + 最终 verification

**Files:** 无代码改动,只是验证。

- [ ] **Step 1: 重启 dev 环境 clean**

```bash
# 在 backend 目录
cd /Users/iloahz/projects/dadaxiaoyuan/backend
# 如果 backend 进程还在,kill 它
# (find it: ps aux | grep ddxy)
rm -f ddxy.db
make seed
make run    # 起后台

# 在 frontend 目录
cd /Users/iloahz/projects/dadaxiaoyuan/frontend
npm run dev    # 起后台
```

- [ ] **Step 2: 浏览器全流程过一遍**

打开 `http://localhost:5173`。允许位置授权(或拒绝,测试 fallback)。

**验证清单**(spec §测试策略):

- [ ] 首页:10 张卡片(scope A 种子数据)
- [ ] 副标题:「北京 · X.X km」(授权)或「北京」(拒绝)
- [ ] 状态筛选:勾「完全开放」,只剩 5 所(ruc, bnu, muc, bfsu, cau)
- [ ] 切到列表视图:同样的 10 所(或筛选后的子集)
- [ ] 切到地图视图:10 个 markers,标签显示「北大」「清华」等(均去掉「大学」后缀)
- [ ] 城市页:8 个城市,北京 active,显示 10 所 / 50% open;其他 7 在 soon 区
- [ ] 切北京:回首页,数据不变(loading 闪一下)
- [ ] 详情页 — PKU:状态「预约开放」,4 项设施全 closed
- [ ] 详情页 — BUPT:closed 状态,4 项全 closed
- [ ] 详情页 — BNU:gym 状态显示 appt(由 status badge 提示)
- [ ] lang 切换:zh ↔ en,UI 标签变化,但**学校名 / 地址 / 状态文案**:学校名和地址永远中文,状态文案(完全开放 / Fully open)随 lang 切换 ✓
- [ ] 错误恢复:停 backend → 首页刷新 → 显示「加载失败」+ 重试 → 起回 backend → 点重试 → 恢复

- [ ] **Step 3: 控制台检查无 warning / 404**

打开浏览器开发者工具 Network + Console,确认:
- 无 404(尤其 `/api/v1/...` 都应该 200)
- 无 React key warning / proxy warning
- 无 unused variable warning(build 也要 clean)

- [ ] **Step 4: 最终 vite build**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan/frontend
npm run build 2>&1 | tail -15
```

期望:`built in ...` + dist/ 文件夹生成,无 error。

- [ ] **Step 5: 不 commit。Task 8 是 verification-only。**

---

## Spec coverage check

| Spec 章节 / 要求 | 实现位置 |
|---|---|
| `api.js` 三个 fetch 函数 | Task 2 Step 1 |
| `distance.js` Haversine + GCJ-02 注释 | Task 2 Step 2 |
| `useApi` hook | Task 2 Step 3 |
| Vite proxy(已配置,无改动) | Task 1 Step 4 验证 |
| `school.zh / en` → `school.name`(永远中文) | Task 4 (SchoolCard) + Task 6 (DetailScreen) |
| `district.zh / en` → 城市名 + 距离 | Task 4 (SchoolCard) + Task 6 (detail 用 address) |
| 设施 5 → 4(删 walk) | Task 7 (status.js + FacilityIcon) |
| status 5 → 4(删 daytime) | Task 7 (status.js) |
| 详情页头像首字符 `name.charAt(0)` | Task 6 Step 3 |
| 用户位置 / 距离计算 | Task 5 (HomeScreen useEffect + useMemo) |
| MapView 字段引用修正 | Task 5 Step 5 |
| loading + error + retry | Task 3 / 5 / 6(每屏一份;Task 6 是分支返回式) |
| i18n.js 删 entry/schedule/notes/confirms/updatedAt | Task 7 Step 2 |
| 删 seed.js | Task 7 Step 6 |
| en mode 时学校名 fallback 到中文 | Task 4 (SchoolCard) + Task 5 (MapView) + Task 6 (DetailScreen) |
| MapView 假地图保留 | Task 5 Step 5(只改两个字段引用) |
| Manual smoke test 清单 | Task 8 Step 2 |

## Open items deferred

- **设施筛选 (`facFilter`)**:与 wechat 同样退化(summary 无 facilities)。UI 保留但实际无效。后续要恢复需要后端加 facility query 参数或 list 端点切到详情形。
- **Web 端预约 modal**:spec 决议本次 alignment **不实现** web 端的 reservation modal —— 只在详情页 facility 行用 status badge(appt)隐含表达。如果需要点开 QR + hint,作为独立 follow-up plan(模仿 wechat 的 modal)。
- **真实地图库**:MapView 仍是手写 SVG 假地图,中心写死北京。多城市铺开时再换 mapbox/leaflet/高德。
- **Web unit test**:目前无框架。如未来引入 vitest + React Testing Library,`useApi` / `distance` / `SchoolCard` 等是天然测试目标。
