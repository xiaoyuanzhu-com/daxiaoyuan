const { fetchCities, fetchSchools } = require('../../utils/api.js');
const { distanceKm } = require('../../utils/distance.js');
const { STATUS, FACILITIES } = require('../../utils/status.js');

// 5 status blocks shown on each school card. Order is fixed: campus first
// (overall school status), then the 4 canonical facilities. Each block is a
// single-character colored rectangle whose color encodes that aspect's
// open state.
const CARD_BLOCKS = [
  { key: 'campus',  short: '校' },
  { key: 'library', short: FACILITIES.library.short },
  { key: 'track',   short: FACILITIES.track.short },
  { key: 'gym',     short: FACILITIES.gym.short },
  { key: 'canteen', short: FACILITIES.canteen.short },
];

// Cities cap out at a few hundred schools — we fetch the entire city in one
// request and sort by distance client-side. No pagination on this tab.
const FETCH_SIZE = 500;
const SEARCH_DEBOUNCE_MS = 300;

const citySelector = requirePlugin('citySelector');

// Top 10 中国大陆按高校数量排序的城市,作为 citySelector 的热门城市
// (替代插件默认的「北京/上海/天津/重庆/广州/深圳/成都/杭州」)。
//
// 注意:腾讯位置服务城市库的 name 为「<城市>市」全称。直辖市裸名也能匹配,
// 但地级市(武汉/西安/郑州 等)必须带「市」后缀才能命中。
const HOT_CITIES = '北京市,武汉市,广州市,上海市,西安市,重庆市,天津市,南京市,成都市,郑州市';

// Color map for native <map> callouts (which take raw hex, not class names).
const STATUS_COLOR = {
  open:   { bg: '#D4E8C8', ink: '#2E5A1C' },
  appt:   { bg: '#F2C99A', ink: '#7A3A06' },
  alumni: { bg: '#D9D5CE', ink: '#3A372F' },
  closed: { bg: '#E8C4B8', ink: '#7A2418' },
};

Page({
  data: {
    loading: true,         // initial load (or full reload on city/query change)
    error: '',

    query: '',             // current search input value
    schools: [],           // decorated, sorted by distance ascending
    mapMarkers: [],        // markers for everything currently in `schools`

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
    this.reloadFromStart();
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
    }, () => this.reloadFromStart());
  },

  // Center map on user's location; falls back silently to the default
  // city center (set in data) if the user denies or the simulator can't
  // resolve a fix. Also stores user coords for client-side distance display.
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
          // Re-decorate already-loaded schools so subtitles get distances.
          if (this.data.schools.length) this.redecorateAll();
        });
      },
      fail: () => {},
    });
  },

  // —— Data loading ——

  // Fetches the full school list for the current city and renders it sorted
  // by distance. Called on initial load, city change, search input, and retry.
  async reloadFromStart() {
    this.setData({
      loading: true,
      error: '',
      schools: [],
      mapMarkers: [],
    });
    try {
      const res = await fetchSchools({
        cityId: this.data.cityId,
        q: this.data.query,
        size: FETCH_SIZE,
      });
      this.renderSchools(res.schools || []);
    } catch (e) {
      this.setData({ error: e.message || '加载失败' });
    }
    this.setData({ loading: false });
  },

  // Sorts raw schools by distance, decorates each, pushes to state. Also
  // called by redecorateAll when user location resolves after the first fetch
  // (the sort order shifts too, not just the subtitle text).
  renderSchools(raw) {
    const sorted = this.sortByDistance(raw);
    const decorated = sorted.map((s) =>
      decorateSchool(s, this.distanceFor(s), this.data.cityName)
    );
    this.setData({
      schools: decorated,
      mapMarkers: decorated.map((s, i) => buildMarker(s, i)),
    });
  },

  // Ascending by distance from the reference point: user location when
  // available, picked-city center otherwise. Schools missing lat/lng go last.
  sortByDistance(schools) {
    const refLat = this.data.userLat !== null ? this.data.userLat : this.data.cityLat;
    const refLng = this.data.userLng !== null ? this.data.userLng : this.data.cityLng;
    return schools.slice().sort((a, b) => {
      if (a.lat == null && b.lat == null) return 0;
      if (a.lat == null) return 1;
      if (b.lat == null) return -1;
      return distanceKm(refLat, refLng, a.lat, a.lng) -
             distanceKm(refLat, refLng, b.lat, b.lng);
    });
  },

  // Re-runs sort + decoration on currently-loaded schools (called when user
  // location resolves after the first fetch). Does not refetch.
  redecorateAll() {
    this.renderSchools(this.data.schools);
  },

  distanceFor(s) {
    if (this.data.userLat === null || this.data.userLng === null) return null;
    return distanceKm(this.data.userLat, this.data.userLng, s.lat, s.lng);
  },

  retry() {
    this.reloadFromStart();
  },

  // —— Event handlers ——

  onSearchInput(e) {
    const q = e.detail.value || '';
    this.setData({ query: q });
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.reloadFromStart(), SEARCH_DEBOUNCE_MS);
  },

  clearSearch() {
    if (!this.data.query) return;
    this.setData({ query: '' });
    clearTimeout(this._searchTimer);
    this.reloadFromStart();
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
});

// Decorates a full School record from the API into the shape the card
// template expects. `facilities` is the full {status, reservation} map shape
// from the detail/list endpoint — we only read .status here.
function decorateSchool(s, distance, cityName) {
  const st = STATUS[s.status] || STATUS.closed;
  const subtitle = (typeof distance === 'number')
    ? `${cityName} · ${distance.toFixed(1)} 公里`
    : cityName;
  const facs = s.facilities || {};
  const blocks = CARD_BLOCKS.map((b) => {
    const statusKey = b.key === 'campus' ? s.status : (facs[b.key] && facs[b.key].status);
    const meta = STATUS[statusKey] || STATUS.closed;
    return { key: b.key, short: b.short, bgClass: meta.bgClass };
  });
  return {
    ...s,
    statusKey: st.key,
    statusLabel: st.label,
    statusBgClass: st.bgClass,
    blocks,
    distanceKm: distance,
    subtitle,
  };
}

function buildMarker(s, i) {
  const color = STATUS_COLOR[s.statusKey] || STATUS_COLOR.closed;
  return {
    id: i,
    schoolId: s.id,
    latitude: s.lat,
    longitude: s.lng,
    width: 22,
    height: 28,
    callout: {
      content: s.name.replace('大学', ''),
      bgColor: color.bg,
      color: color.ink,
      padding: 4,
      borderRadius: 3,
      fontSize: 10,
      display: 'ALWAYS',
    },
  };
}
