const { fetchCities, fetchSchools } = require('../../utils/api.js');
const { distanceKm } = require('../../utils/distance.js');
const { STATUS, STATUS_ORDER, FACILITIES } = require('../../utils/status.js');

const citySelector = requirePlugin('citySelector');

// Top 10 中国大陆按高校数量排序的城市,作为 citySelector 的热门城市
// (替代插件默认的「北京/上海/天津/重庆/广州/深圳/成都/杭州」)。
//
// 注意:腾讯位置服务城市库的 name 为「<城市>市」全称。直辖市裸名也能匹配,
// 但地级市(武汉/西安/郑州 等)必须带「市」后缀才能命中。
const HOT_CITIES = '北京市,武汉市,广州市,上海市,西安市,重庆市,天津市,南京市,成都市,郑州市';

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

    schools: [],         // decorated for display
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
    this.loadCityIndex();
    this.loadAll();
  },

  // Picks up the result of the Tencent citySelector plugin after the user
  // returns from it. Also runs on initial show (getCity returns null then).
  onShow() {
    const picked = citySelector.getCity && citySelector.getCity();
    if (!picked) return;
    citySelector.clearCity();
    this.applyPickedCity(picked);
  },

  // Fetches the active city list and indexes by adcode so we can map the
  // plugin's adcode (e.g. "110100") back to our backend slug ("bj").
  async loadCityIndex() {
    try {
      const cities = await fetchCities();
      const byCode = {};
      for (const c of cities) if (c.active) byCode[c.code] = c;
      this.cityByCode = byCode;
    } catch (e) {
      this.cityByCode = {};
    }
  },

  applyPickedCity(picked) {
    const match = this.cityByCode && this.cityByCode[picked.id];
    if (!match) {
      wx.showToast({ title: `${picked.name}暂未上线`, icon: 'none' });
      return;
    }
    if (match.id === this.data.cityId) return;
    this.setData({
      cityId: match.id,
      cityName: match.name,
      cityLat: match.lat,
      cityLng: match.lng,
    }, () => this.loadAll());
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
    const cityName = this.data.cityName;

    const filtered = this.rawSchools
      .filter((s) => {
        if (sf.size && !sf.has(s.status)) return false;
        // API list endpoint returns summary fields only — no facilities here.
        // Facility filter is non-functional in this view; UI kept for consistency.
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
      .map(({ school, distance }) => decorateSchoolSummary(school, distance, cityName));

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
    const app = getApp();
    const key = app.globalData.tencentMapKey;
    if (!key) {
      wx.showToast({ title: '未配置腾讯位置服务 key', icon: 'none' });
      return;
    }
    const params = [
      `key=${encodeURIComponent(key)}`,
      `referer=${encodeURIComponent('大大校园')}`,
      // `hotCitys=${encodeURIComponent(HOT_CITIES)}`,
      'accurate=1',
    ].join('&');
    wx.navigateTo({ url: `plugin://citySelector/index?${params}` });
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
