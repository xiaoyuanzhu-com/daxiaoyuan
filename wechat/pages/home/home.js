const { SCHOOLS } = require('../../utils/data.js');
const { STATUS, STATUS_ORDER, FACILITIES } = require('../../utils/status.js');
const { decorateSchool } = require('../../utils/decorate.js');

const STATUS_OPTIONS = STATUS_ORDER.map((k) => ({ key: k, label: STATUS[k].label, dotClass: STATUS[k].dotClass, bgClass: STATUS[k].bgClass }));
const FAC_OPTIONS = Object.keys(FACILITIES).map((k) => ({ key: k, label: FACILITIES[k].label, short: FACILITIES[k].short }));

// Color map for native <map> callouts (which take raw hex, not class names).
const STATUS_COLOR = {
  open:    { bg: '#D4E8C8', ink: '#2E5A1C' },
  daytime: { bg: '#F2E2A8', ink: '#6B4F00' },
  appt:    { bg: '#F2C99A', ink: '#7A3A06' },
  alumni:  { bg: '#D9D5CE', ink: '#3A372F' },
  closed:  { bg: '#E8C4B8', ink: '#7A2418' },
};

Page({
  data: {
    filterOpen: false,
    statusFilter: [],          // array of status keys
    facFilter: [],             // array of facility keys
    statusFilterMap: {},       // {key: true} — for WXML lookups
    facFilterMap: {},
    schools: [],               // decorated + filtered
    groups: [],                // for list view
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

  onLoad() {
    this.recompute();
    this.locateUser();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  // Center map on user's location; falls back silently to the default
  // city center (set in data) if the user denies or the simulator can't
  // resolve a fix.
  locateUser() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({ cityLat: res.latitude, cityLng: res.longitude });
      },
      fail: () => {},
    });
  },

  recompute() {
    const sf = new Set(this.data.statusFilter);
    const ff = new Set(this.data.facFilter);
    const filtered = SCHOOLS.filter((s) => {
      if (sf.size && !sf.has(s.status)) return false;
      if (ff.size) {
        for (const f of ff) {
          const v = s.facilities[f];
          if (v !== 'open' && v !== 'appt') return false;
        }
      }
      return true;
    }).sort((a, b) => STATUS[a.status].order - STATUS[b.status].order || a.distance - b.distance)
      .map(decorateSchool);

    // group by status for list view
    const byStatus = {};
    for (const s of filtered) (byStatus[s.statusKey] = byStatus[s.statusKey] || []).push(s);
    const groups = STATUS_ORDER
      .filter((k) => byStatus[k])
      .map((k) => ({ key: k, label: STATUS[k].label, dotClass: STATUS[k].dotClass, count: byStatus[k].length, items: byStatus[k] }));

    // markers for native <map>. Omitting iconPath uses the default pin —
    // the colored, always-visible callout above it carries the status info.
    // width/height are required by base lib >= 3.x even with no iconPath.
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
    wx.navigateTo({ url: '/pages/cities/cities' });
  },

  openAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  openUpdate() {
    wx.navigateTo({ url: '/pages/update/update' });
  },

  openFilter() {
    this.setData({ filterOpen: true });
  },

  closeFilter() {
    this.setData({ filterOpen: false });
  },

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

  applyFilter() {
    this.setData({ filterOpen: false });
  },

  // swallow taps on the filter sheet body so the backdrop close doesn't fire
  noop() {},
});
