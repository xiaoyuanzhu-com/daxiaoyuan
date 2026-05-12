// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/home/home',   text: '附近', icon: 'location' },
      { pagePath: '/pages/about/about', text: '关于', icon: 'info'     },
    ],
  },
  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset;
      wx.switchTab({ url: path });
      this.setData({ selected: Number(index) });
    },
  },
});
