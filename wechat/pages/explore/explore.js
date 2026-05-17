const { fetchCities, fetchRanking } = require('../../utils/api.js');
const { STATUS } = require('../../utils/status.js');

// Tab definitions — same set as web ExploreScreen.
const TABS = [
  { key: 'cities', label: '城市'    },
  { key: '985',    label: '985'    },
  { key: '211',    label: '211'    },
  { key: 'c9',     label: 'C9'     },
  { key: 'qs30',   label: 'QS 30'  },
];

Page({
  data: {
    tab: 'cities',
    tabs: TABS,

    // cities tab
    citiesLoading: true,
    citiesError: '',
    cities: [],

    // school rankings — keyed by tab.key
    rankings: {},        // { '985': { loading, error, schools } , ... }
  },

  onLoad() {
    this.loadCities();
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.tab) return;
    this.setData({ tab: key });
    if (key === 'cities') {
      if (!this.data.cities.length && !this.data.citiesLoading) this.loadCities();
    } else {
      const entry = this.data.rankings[key];
      if (!entry || (!entry.schools && !entry.loading)) this.loadRanking(key);
    }
  },

  retry() {
    if (this.data.tab === 'cities') this.loadCities();
    else this.loadRanking(this.data.tab);
  },

  // —— Cities ranking ——
  async loadCities() {
    this.setData({ citiesLoading: true, citiesError: '' });
    try {
      const cities = await fetchCities();
      const ranked = cities.slice().sort((a, b) => {
        if (b.openRate !== a.openRate) return b.openRate - a.openRate;
        return b.schools - a.schools;
      }).map((c, i) => ({
        ...c,
        rank: i + 1,
        topRank: i < 3,
        ratePct: Math.round((c.openRate || 0) * 100),
      }));
      this.setData({ cities: ranked, citiesLoading: false });
    } catch (e) {
      this.setData({ citiesError: e.message || '加载失败', citiesLoading: false });
    }
  },

  // —— School rankings ——
  async loadRanking(kind) {
    this.setData({
      [`rankings.${kind}`]: { loading: true, error: '', schools: null },
    });
    try {
      const res = await fetchRanking(kind);
      const schools = (res.schools || []).map((s) => {
        const campusStatus = (s.facilities && s.facilities.campus && s.facilities.campus.status) || 'closed';
        const meta = STATUS[campusStatus] || STATUS.closed;
        return {
          id: s.id,
          name: s.name,
          rank: s.rank,
          topRank: s.rank <= 3,
          statusLabel: meta.label,
          statusBgClass: meta.bgClass,
        };
      });
      this.setData({
        [`rankings.${kind}`]: { loading: false, error: '', schools },
      });
    } catch (e) {
      this.setData({
        [`rankings.${kind}`]: { loading: false, error: e.message || '加载失败', schools: null },
      });
    }
  },

  openSchool(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },
});
