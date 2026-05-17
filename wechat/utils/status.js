// Status tokens — kept in lockstep with frontend/src/data/status.js.
// Class names map to .status-* and .dot-* declared in app.wxss.

const STATUS = {
  open:   { key: 'open',   label: '完全开放', bgClass: 'status-open',   dotClass: 'dot-open',   order: 1 },
  appt:   { key: 'appt',   label: '预约开放', bgClass: 'status-appt',   dotClass: 'dot-appt',   order: 2 },
  alumni: { key: 'alumni', label: '仅校友',   bgClass: 'status-alumni', dotClass: 'dot-alumni', order: 3 },
  closed: { key: 'closed', label: '未开放',   bgClass: 'status-closed', dotClass: 'dot-closed', order: 4 },
};

const FACILITIES = {
  campus:  { label: '校园',   short: '校' },
  library: { label: '图书馆', short: '图' },
  track:   { label: '操场',   short: '场' },
  gym:     { label: '体育馆', short: '馆' },
  canteen: { label: '食堂',   short: '食' },
};

const STATUS_ORDER = ['open', 'appt', 'alumni', 'closed'];

module.exports = { STATUS, FACILITIES, STATUS_ORDER };
