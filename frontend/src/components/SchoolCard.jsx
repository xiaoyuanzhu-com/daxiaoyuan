import { StatusBadge } from './StatusBadge.jsx';
import { FacilityChip } from './FacilityChip.jsx';
import { t } from '../data/i18n.js';
import { C } from '../theme.js';

// school: backend shape (SchoolSummary for list, School for detail).
// cityName: parent passes the city display name (e.g. '北京').
// distanceKm: parent passes pre-computed distance from user (or null).
// density: 'compact' hides the facility chip row.
export function SchoolCard({ school, cityName, distanceKm, lang, density = 'medium', onClick }) {
  const hasFacilities = !!school.facilities;
  const campusStatus = school.facilities?.campus?.status ?? 'closed';
  // Badge already renders campus, so chips below only list the four concrete facilities.
  const chipKeys = hasFacilities
    ? Object.keys(school.facilities).filter((k) => k !== 'campus')
    : [];
  return (
    <button onClick={onClick} type="button" style={{
      background: C.card, border: `1px solid ${C.line}`,
      borderRadius: 12, padding: density === 'compact' ? '12px 14px' : '14px 16px',
      width: '100%', textAlign: 'left', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 6 : 10,
      fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        {school.logo && (
          <img src={school.logo} alt="" aria-hidden="true"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{
              width: density === 'compact' ? 28 : 32,
              height: density === 'compact' ? 28 : 32,
              objectFit: 'contain', flexShrink: 0,
            }} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: density === 'compact' ? 15 : 16, fontWeight: 600, color: C.ink,
            letterSpacing: lang === 'zh' ? 0.5 : 0, lineHeight: 1.2,
          }}>
            {school.name}
          </div>
          <div style={{
            fontSize: 11, color: C.ink40, marginTop: 2,
            fontFeatureSettings: '"tnum"',
          }}>
            {cityName}
            {typeof distanceKm === 'number' && (
              <>{' · '}{distanceKm.toFixed(1)} {t('km', lang)}</>
            )}
          </div>
        </div>
        <StatusBadge status={campusStatus} lang={lang} size="sm" />
      </div>
      {density !== 'compact' && chipKeys.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          {chipKeys.map((k) => (
            <FacilityChip key={k} kind={k} status={school.facilities[k].status} lang={lang} dense />
          ))}
        </div>
      )}
    </button>
  );
}
