import { StatusBadge } from './StatusBadge.jsx';
import { FacilityChip } from './FacilityChip.jsx';
import { t } from '../data/i18n.js';
import { C } from '../theme.js';

export function SchoolCard({ school, lang, density = 'medium', onClick }) {
  const facKeys = Object.keys(school.facilities);
  return (
    <button onClick={onClick} type="button" style={{
      background: C.card, border: `1px solid ${C.line}`,
      borderRadius: 12, padding: density === 'compact' ? '12px 14px' : '14px 16px',
      width: '100%', textAlign: 'left', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 6 : 10,
      fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: density === 'compact' ? 15 : 16, fontWeight: 600, color: C.ink,
            letterSpacing: lang === 'zh' ? 0.5 : 0, lineHeight: 1.2,
          }}>
            {lang === 'zh' ? school.zh : school.en}
          </div>
          <div style={{
            fontSize: 11, color: C.ink40, marginTop: 2,
            fontFeatureSettings: '"tnum"',
          }}>
            {lang === 'zh' ? school.district.zh : school.district.en}
            {' · '}{school.distance} {t('km', lang)}
            {' · '}{school.confirms} {t('confirms', lang)}
          </div>
        </div>
        <StatusBadge status={school.status} lang={lang} size="sm" />
      </div>
      {density !== 'compact' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          {facKeys.map((k) => (
            <FacilityChip key={k} kind={k} status={school.facilities[k]} lang={lang} dense />
          ))}
        </div>
      )}
    </button>
  );
}
