// Decorate a school for rendering: precomputed badge / facility class names.

const { STATUS, FACILITIES } = require('./status.js');

function decorateSchool(s) {
  if (!s) return s;
  const st = STATUS[s.status];
  const facilities = Object.keys(s.facilities).map((k) => {
    const fst = STATUS[s.facilities[k]];
    const muted = s.facilities[k] === 'closed' || s.facilities[k] === 'alumni';
    return {
      key: k,
      label: FACILITIES[k].label,
      short: FACILITIES[k].short,
      status: s.facilities[k],
      statusLabel: fst.label,
      bgClass: fst.bgClass,
      dotClass: fst.dotClass,
      muted,
      strikethrough: s.facilities[k] === 'closed',
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
  };
}

module.exports = { decorateSchool };
