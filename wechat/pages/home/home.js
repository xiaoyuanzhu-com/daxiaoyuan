const { fetchSchools } = require('../../utils/api.js');
const { distanceKm } = require('../../utils/distance.js');
const { STATUS, STATUS_ORDER, FACILITIES } = require('../../utils/status.js');

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
