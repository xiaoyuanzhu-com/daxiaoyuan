// Decorate a school for rendering: precomputed badge / facility class names.

const { STATUS, FACILITIES } = require('./status.js');

function decorateSchool(s) {
  if (!s) return s;
  const st = STATUS[s.status];
  const facilities = Object.keys(s.facilities).map((k) => {
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
  });
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
  };
}

module.exports = { decorateSchool };
