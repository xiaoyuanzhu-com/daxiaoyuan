import { FacilityIcon } from './FacilityIcon.jsx';
import { STATUS, FACILITIES } from '../data/status.js';
import { C } from '../theme.js';

export function FacilityChip({ kind, status, lang, dense = false }) {
  const s = STATUS[status];
  const fac = FACILITIES[kind];
  const muted = status === 'closed' || status === 'alumni';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: dense ? '0' : '6px 8px',
      color: muted ? C.ink40 : C.ink,
      fontSize: 12, letterSpacing: lang === 'zh' ? 0.3 : 0,
    }}>
      <FacilityIcon kind={kind} size={14} color={muted ? C.ink40 : C.ink} />
      <span style={{ textDecoration: status === 'closed' ? 'line-through' : 'none' }}>
        {lang === 'zh' ? fac.zh : fac.en}
      </span>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: s.dot, marginLeft: 2 }} />
    </div>
  );
}
