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

  pickCity() {
    // For now the only live city is Beijing, just go back to home.
    wx.navigateBack({
      fail: () => { wx.reLaunch({ url: '/pages/home/home' }); },
    });
  },
});
