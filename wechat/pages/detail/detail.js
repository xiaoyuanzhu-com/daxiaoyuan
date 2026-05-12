const { findSchool } = require('../../utils/data.js');
const { decorateSchool } = require('../../utils/decorate.js');

const SCHEDULE_KEYS = [
  { key: 'weekday', label: '工作日' },
  { key: 'weekend', label: '周末' },
  { key: 'summer',  label: '寒暑假' },
];

Page({
  data: {
    school: null,
    scheduleRows: [],
  },

  onLoad(opts) {
    const raw = findSchool(opts.id);
    if (!raw) {
      this.setData({ school: null });
      return;
    }
    const school = decorateSchool(raw);
    const scheduleRows = SCHEDULE_KEYS.map((k) => ({
      key: k.key,
      label: k.label,
      value: school.schedule[k.key],
    }));
    this.setData({ school, scheduleRows });

    wx.setNavigationBarTitle({ title: school.name });
  },
});
