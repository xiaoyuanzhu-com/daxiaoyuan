export const STATUS = {
  open:    { key: 'open',    bg: '#D4E8C8', ink: '#2E5A1C', dot: '#5BA13C', zh: '完全开放', en: 'Fully open',     order: 1 },
  daytime: { key: 'daytime', bg: '#F2E2A8', ink: '#6B4F00', dot: '#C29410', zh: '限时开放', en: 'Daytime only',   order: 2 },
  appt:    { key: 'appt',    bg: '#F2C99A', ink: '#7A3A06', dot: '#C66A1C', zh: '预约开放', en: 'By appointment', order: 3 },
  alumni:  { key: 'alumni',  bg: '#D9D5CE', ink: '#3A372F', dot: '#7A7568', zh: '仅校友',   en: 'Alumni only',    order: 4 },
  closed:  { key: 'closed',  bg: '#E8C4B8', ink: '#7A2418', dot: '#B43A28', zh: '关闭',     en: 'Closed',         order: 5 },
};

export const FACILITIES = {
  walk:    { zh: '散步',   en: 'Walking', icon: 'walk' },
  library: { zh: '图书馆', en: 'Library', icon: 'library' },
  track:   { zh: '操场',   en: 'Track',   icon: 'track' },
  gym:     { zh: '体育馆', en: 'Gym',     icon: 'gym' },
  canteen: { zh: '食堂',   en: 'Canteen', icon: 'canteen' },
};

export const STATUS_ORDER = ['open', 'daytime', 'appt', 'alumni', 'closed'];
