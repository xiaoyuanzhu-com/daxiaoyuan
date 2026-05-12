const { SCHOOLS } = require('../../utils/data.js');

Page({
  data: {
    total: 0,
    statsOpen: 0,
    statsFriction: 0,
    statsClosed: 0,
    pctOpen: 0,
    pctFriction: 0,
    pctClosed: 0,
    values: [
      { num: '01', title: '开放', body: '校园是城市的呼吸,应当向社会敞开。' },
      { num: '02', title: '人人', body: '不分校友、不分身份,每个人都可以走进去。' },
      { num: '03', title: '透明', body: '把现状摊在所有人面前,是推动改变的第一步。' },
    ],
  },

  onLoad() {
    let open = 0, friction = 0, closed = 0;
    for (const s of SCHOOLS) {
      if (s.status === 'open') open++;
      else if (s.status === 'closed' || s.status === 'alumni') closed++;
      else friction++;
    }
    const total = SCHOOLS.length;
    this.setData({
      total,
      statsOpen: open, statsFriction: friction, statsClosed: closed,
      pctOpen: (open / total) * 100,
      pctFriction: (friction / total) * 100,
      pctClosed: (closed / total) * 100,
    });
  },

  copyRepo() {
    wx.setClipboardData({ data: 'github.com/xiaoyuanzhu-com/daxiaoyuan' });
  },
});
