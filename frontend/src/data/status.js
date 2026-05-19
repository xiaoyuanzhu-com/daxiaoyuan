export const STATUS = {
  open:       { key: 'open',       bg: '#D4E8C8', ink: '#2E5A1C', dot: '#5BA13C', zh: '完全开放', en: 'Fully open',         order: 1 },
  appt:       { key: 'appt',       bg: '#D4E8C8', ink: '#2E5A1C', dot: '#5BA13C', zh: '开放预约', en: 'Open booking',       order: 2 },
  restricted: { key: 'restricted', bg: '#F2C99A', ink: '#7A3A06', dot: '#C66A1C', zh: '限制预约', en: 'Restricted booking', order: 3 },
  alumni:     { key: 'alumni',     bg: '#F2C99A', ink: '#7A3A06', dot: '#C66A1C', zh: '仅限校友', en: 'Alumni only',        order: 4 },
  closed:     { key: 'closed',     bg: '#D9D5CE', ink: '#3A372F', dot: '#7A7568', zh: '暂不开放', en: 'Closed',             order: 5 },
};

// FACILITIES key order = canonical display order. campus is first because it
// represents the whole school; the other four are concrete facilities. See
// CLAUDE.md §数据模型核心约定.
export const FACILITIES = {
  campus:  { zh: '校园',   en: 'Campus',  icon: 'campus' },
  library: { zh: '图书馆', en: 'Library', icon: 'library' },
  track:   { zh: '操场',   en: 'Track',   icon: 'track' },
  gym:     { zh: '体育馆', en: 'Gym',     icon: 'gym' },
  canteen: { zh: '食堂',   en: 'Canteen', icon: 'canteen' },
};

export const STATUS_ORDER = ['open', 'appt', 'restricted', 'alumni', 'closed'];

// Campus-level open status lives in school.facilities.campus.status. Returns
// 'closed' if the school object is missing it (defensive: pre-migration data
// or a partial fetch).
export function campusStatus(school) {
  return school?.facilities?.campus?.status ?? 'closed';
}
