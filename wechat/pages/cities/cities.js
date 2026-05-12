const { CITIES } = require('../../utils/data.js');

Page({
  data: {
    active: [],
    soon: [],
  },

  onLoad() {
    const active = CITIES.filter((c) => c.active).map((c) => ({
      ...c,
      ratePct: Math.round(c.openRate * 100),
      ringDash: c.openRate * 138,    // 2 * PI * r where r = 22 → 138.2…
    }));
    const soon = CITIES.filter((c) => !c.active);
    this.setData({ active, soon });
  },

  pickCity(e) {
    // The tapped city's id is on the bound view via wx:for; pull the row.
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
