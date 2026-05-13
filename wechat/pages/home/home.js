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
    loading: true,
    error: '',

    schools: [],         // decorated for display, sorted by distance
    mapMarkers: [],

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

  // —— Compute (called when raw data or user location changes) ——

  recompute() {
    if (!this.rawSchools) return;
    const userLat = this.data.userLat;
    const userLng = this.data.userLng;
    const cityName = this.data.cityName;

    const decorated = this.rawSchools
      .map((s) => {
        const d = (userLat !== null && userLng !== null)
          ? distanceKm(userLat, userLng, s.lat, s.lng)
          : null;
        return { school: s, distance: d };
      })
      .sort((a, b) => {
        const da = a.distance === null ? Infinity : a.distance;
        const db = b.distance === null ? Infinity : b.distance;
        return da - db;
      })
      .map(({ school, distance }) => decorateSchoolSummary(school, distance, cityName));

    const markers = decorated.map((s, i) => ({
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
      schools: decorated,
      mapMarkers: markers,
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
});

// Summary-shape decorator: API list endpoint returns SchoolSummary with
// per-facility status. `subtitle` is precomputed as "<cityName>" or
// "<cityName> · X.X 公里", since WXML has no Number.toFixed support.
// `blocks` is the 5-rect row (campus + 4 facilities), each tagged with the
// status color class for that aspect.
function decorateSchoolSummary(s, distance, cityName) {
  const st = STATUS[s.status];
  const subtitle = (typeof distance === 'number')
    ? `${cityName} · ${distance.toFixed(1)} 公里`
    : cityName;
  const facs = s.facilities || {};
  const blocks = CARD_BLOCKS.map((b) => {
    const statusKey = b.key === 'campus' ? s.status : facs[b.key];
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
