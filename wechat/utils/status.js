// Status tokens — kept in lockstep with frontend/src/data/status.js.
// Class names map to .status-* and .dot-* declared in app.wxss.

const STATUS = {
  open:       { key: 'open',       label: '完全开放', bgClass: 'status-open',       dotClass: 'dot-open',       order: 1 },
  appt:       { key: 'appt',       label: '开放预约', bgClass: 'status-appt',       dotClass: 'dot-appt',       order: 2 },
  restricted: { key: 'restricted', label: '限制预约', bgClass: 'status-restricted', dotClass: 'dot-restricted', order: 3 },
  alumni:     { key: 'alumni',     label: '仅限校友', bgClass: 'status-alumni',     dotClass: 'dot-alumni',     order: 4 },
  closed:     { key: 'closed',     label: '暂不开放', bgClass: 'status-closed',     dotClass: 'dot-closed',     order: 5 },
};

const FACILITIES = {
  campus:  { label: '校园',   short: '校' },
  library: { label: '图书馆', short: '图' },
  track:   { label: '操场',   short: '场' },
  gym:     { label: '体育馆', short: '馆' },
  canteen: { label: '食堂',   short: '食' },
};

const STATUS_ORDER = ['open', 'appt', 'restricted', 'alumni', 'closed'];

module.exports = { STATUS, FACILITIES, STATUS_ORDER };
