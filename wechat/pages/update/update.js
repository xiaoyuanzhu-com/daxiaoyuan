const { SCHOOLS, findSchool } = require('../../utils/data.js');
const { STATUS, STATUS_ORDER, FACILITIES } = require('../../utils/status.js');
const { decorateSchool } = require('../../utils/decorate.js');

const STATUS_OPTS = STATUS_ORDER.map((k) => ({
  key: k,
  label: STATUS[k].label,
  bgClass: STATUS[k].bgClass,
  dotClass: STATUS[k].dotClass,
}));

const FAC_KEYS = Object.keys(FACILITIES);

// Cycle state for the facility step.
const CYCLE = { unsure: 'open', open: 'closed', closed: 'unsure' };
const STATE_LABEL = { open: '开放', closed: '不开放', unsure: '不确定' };
const STATE_BG = { open: 'status-open', closed: 'status-closed', unsure: 'c-card-bg' };
const STATE_DOT = { open: 'dot-open', closed: 'dot-closed', unsure: '' };

Page({
  data: {
    schoolId: null,           // if started from a detail page, locked
    step: 0,                  // 0 pick, 1 status, 2 facs, 3 note, 4 thanks
    schools: [],              // decorated for step 0
    school: null,             // decorated current school
    status: null,             // selected status key
    note: '',
    facs: {},                 // map facility key -> state
    facList: [],              // hydrated for rendering
    statusOpts: STATUS_OPTS,
    progressDots: [],         // [0..n-1] each true/false for filled
  },

  onLoad(opts) {
    const hasId = Boolean(opts.id);
    const schools = SCHOOLS.map(decorateSchool);
    const initFacs = {};
    FAC_KEYS.forEach((k) => { initFacs[k] = 'unsure'; });

    const state = {
      schoolId: hasId ? opts.id : null,
      step: hasId ? 1 : 0,
      schools,
      facs: initFacs,
    };

    if (hasId) {
      const raw = findSchool(opts.id);
      if (raw) state.school = decorateSchool(raw);
    }

    this.setData(state, () => {
      this.refreshFacList();
      this.refreshProgress();
    });
  },

  refreshFacList() {
    const list = FAC_KEYS.map((k) => {
      const state = this.data.facs[k];
      return {
        key: k,
        label: FACILITIES[k].label,
        short: FACILITIES[k].short,
        state,
        stateLabel: STATE_LABEL[state],
        bgClass: STATE_BG[state],
        dotClass: STATE_DOT[state],
        isUnsure: state === 'unsure',
      };
    });
    this.setData({ facList: list });
  },

  refreshProgress() {
    const total = this.data.schoolId ? 3 : 4;
    const filled = this.data.schoolId ? this.data.step : this.data.step + 1;
    const dots = [];
    for (let i = 0; i < total; i++) dots.push({ i, filled: i < filled });
    this.setData({ progressDots: dots });
  },

  pickSchool(e) {
    const id = e.currentTarget.dataset.id;
    const raw = findSchool(id);
    if (!raw) return;
    this.setData({ school: decorateSchool(raw), step: 1 }, () => this.refreshProgress());
  },

  pickStatus(e) {
    this.setData({ status: e.currentTarget.dataset.key });
  },

  toggleFac(e) {
    const key = e.currentTarget.dataset.key;
    const cur = this.data.facs[key] || 'unsure';
    const next = CYCLE[cur];
    this.setData({ facs: { ...this.data.facs, [key]: next } }, () => this.refreshFacList());
  },

  onNote(e) {
    this.setData({ note: e.detail.value });
  },

  next() {
    if (this.data.step >= 4) return;
    if (this.data.step === 1 && !this.data.status) return;
    this.setData({ step: this.data.step + 1 }, () => this.refreshProgress());
  },

  back() {
    const { step, schoolId } = this.data;
    if (step === 0 || (step === 1 && !schoolId)) {
      wx.navigateBack({
        fail: () => { wx.reLaunch({ url: '/pages/home/home' }); },
      });
      return;
    }
    if (step === 4) {
      wx.reLaunch({ url: '/pages/home/home' });
      return;
    }
    this.setData({ step: step - 1 }, () => this.refreshProgress());
  },

  done() {
    wx.reLaunch({ url: '/pages/home/home' });
  },

  // step 3 → 4 submission stub. Backend POST will plug in here.
  submit() {
    this.setData({ step: 4 });
  },
});
