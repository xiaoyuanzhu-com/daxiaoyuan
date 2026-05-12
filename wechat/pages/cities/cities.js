const { fetchCities } = require('../../utils/api.js');

Page({
  data: {
    loading: true,
    error: '',
    active: [],
    soon: [],
  },

  onLoad() {
    this.loadCities();
  },

  async loadCities() {
    this.setData({ loading: true, error: '' });
    try {
      const cities = await fetchCities();
      const active = cities.filter((c) => c.active).map((c) => ({
        ...c,
        ratePct: Math.round(c.openRate * 100),
        ringDash: c.openRate * 138,   // 2 * PI * r where r ≈ 22
      }));
      const soon = cities.filter((c) => !c.active);
      this.setData({ active, soon, loading: false });
    } catch (e) {
      this.setData({ loading: false, error: e.message || '加载失败' });
    }
  },

  retry() {
    this.loadCities();
  },

  pickCity(e) {
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
});
