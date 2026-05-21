// Decorate a school for rendering: precomputed badge / facility class names.
// Input is the API detail shape (GET /api/v1/schools/:id).

const { STATUS, FACILITIES } = require('./status.js');

// Canonical render order: campus first (the umbrella status), then the four
// concrete facilities. Matches frontend FACILITIES key order.
const FACILITY_ORDER = ['campus', 'library', 'track', 'gym', 'canteen'];

function decorateSchool(s, distanceKm) {
  if (!s) return s;
  const campus = (s.facilities && s.facilities.campus) || { status: 'closed', reservation: null };
  const st = STATUS[campus.status];

  const facilities = FACILITY_ORDER.map((k) => {
    const f = (s.facilities && s.facilities[k]) || { status: 'closed', reservation: null };
    const fst = STATUS[f.status];
    return {
      key: k,
      label: FACILITIES[k].label,
      status: f.status,
      statusLabel: fst.label,
      bgClass: fst.bgClass,
      dotClass: fst.dotClass,
      muted: f.status === 'closed',
      reservation: f.reservation || null,
      hasReservation: !!f.reservation,
    };
  });
  const otherItems = (s.others || []).map((o, idx) => {
    const fst = STATUS[o.status] || STATUS.closed;
    return {
      key: `other:${o.kind || idx}`,
      label: o.name || o.kind || '',
      status: o.status,
      statusLabel: fst.label,
      bgClass: fst.bgClass,
      dotClass: fst.dotClass,
      muted: o.status === 'closed',
      reservation: o.reservation || null,
      hasReservation: !!o.reservation,
    };
  });

  return {
    ...s,
    statusKey: st.key,
    statusLabel: st.label,
    statusBgClass: st.bgClass,
    statusDotClass: st.dotClass,
    statusOrder: st.order,
    initial: s.name.charAt(0),
    facilitiesList: [...facilities, ...otherItems],
    hasReservation: !!campus.reservation,
    distanceKm: typeof distanceKm === 'number' ? distanceKm : null,
    updateLabel: relativeTimeZh(s.lastUpdate),
  };
}

function relativeTimeZh(iso) {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  const min = 60, hour = 3600, day = 86400, week = day * 7;
  if (diffSec < hour)  return `${Math.max(1, Math.floor(diffSec / min))} 分钟前更新`;
  if (diffSec < day)   return `${Math.floor(diffSec / hour)} 小时前更新`;
  if (diffSec < week)  return `${Math.floor(diffSec / day)} 天前更新`;
  return `${Math.floor(diffSec / week)} 周前更新`;
}

module.exports = { decorateSchool };
