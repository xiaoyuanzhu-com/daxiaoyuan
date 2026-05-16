// Decorate a school for rendering: precomputed badge / facility class names.
// Input is the API detail shape (GET /api/v1/schools/:id).

const { STATUS, FACILITIES } = require('./status.js');

const FACILITY_ORDER = ['library', 'track', 'gym', 'canteen'];

function decorateSchool(s, distanceKm) {
  if (!s) return s;
  const st = STATUS[s.status];

  const schoolRow = {
    key: 'school',
    label: '校园',
    short: '校',
    status: s.status,
    statusLabel: st.label,
    bgClass: st.bgClass,
    dotClass: st.dotClass,
    muted: s.status === 'closed' || s.status === 'alumni',
    strikethrough: s.status === 'closed',
    reservation: s.reservation || null,
    hasReservation: !!s.reservation,
  };

  const facilities = [schoolRow].concat(
    FACILITY_ORDER.map((k) => {
      const f = s.facilities[k];
      const fst = STATUS[f.status];
      const muted = f.status === 'closed' || f.status === 'alumni';
      return {
        key: k,
        label: FACILITIES[k].label,
        short: FACILITIES[k].short,
        status: f.status,
        statusLabel: fst.label,
        bgClass: fst.bgClass,
        dotClass: fst.dotClass,
        muted,
        strikethrough: f.status === 'closed',
        reservation: f.reservation || null,
        hasReservation: !!f.reservation,
      };
    }),
  );

  return {
    ...s,
    statusKey: st.key,
    statusLabel: st.label,
    statusBgClass: st.bgClass,
    statusDotClass: st.dotClass,
    statusOrder: st.order,
    initial: s.name.charAt(0),
    facilitiesList: facilities,
    hasReservation: !!s.reservation,
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
