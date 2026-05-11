// Status tokens — kept in lockstep with frontend/src/data/status.js.
// Class names map to .status-* and .dot-* declared in app.wxss.

const STATUS = {
  open:    { key: 'open',    label: '完全开放', bgClass: 'status-open',    dotClass: 'dot-open',    order: 1 },
  daytime: { key: 'daytime', label: '限时开放', bgClass: 'status-daytime', dotClass: 'dot-daytime', order: 2 },
  appt:    { key: 'appt',    label: '预约开放', bgClass: 'status-appt',    dotClass: 'dot-appt',    order: 3 },
  alumni:  { key: 'alumni',  label: '仅校友',   bgClass: 'status-alumni',  dotClass: 'dot-alumni',  order: 4 },
  closed:  { key: 'closed',  label: '关闭',     bgClass: 'status-closed',  dotClass: 'dot-closed',  order: 5 },
};

const FACILITIES = {
  walk:    { label: '散步',   short: '步' },
  library: { label: '图书馆', short: '书' },
  track:   { label: '操场',   short: '跑' },
  gym:     { label: '体育馆', short: '体' },
  canteen: { label: '食堂',   short: '食' },
};

const STATUS_ORDER = ['open', 'daytime', 'appt', 'alumni', 'closed'];

module.exports = { STATUS, FACILITIES, STATUS_ORDER };
