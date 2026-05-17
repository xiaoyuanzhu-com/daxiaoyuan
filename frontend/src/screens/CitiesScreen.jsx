import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { SectionLabel } from '../components/SectionLabel.jsx';
import { STATUS } from '../data/status.js';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { useCity } from '../context/CityContext.jsx';
import { C, serif } from '../theme.js';
import { useApi } from '../hooks/useApi.js';
import { fetchCities } from '../data/api.js';

export default function CitiesScreen() {
  const { lang } = useLang();
  const { setCity } = useCity();
  const navigate = useNavigate();
  const { data: cities, loading, error, retry } = useApi(fetchCities);
  const active = (cities || []).filter((c) => c.active);
  const soon = (cities || []).filter((c) => !c.active);

  return (
    <div style={{ background: C.paper, minHeight: '100%', paddingBottom: 60 }}>
      <AppHeader title={t('citiesTitle', lang)} accent={C.paper} />

      {loading && <StatusOverlay>{lang === 'zh' ? '加载中…' : 'Loading…'}</StatusOverlay>}

      {error && !loading && (
        <StatusOverlay>
          <div>{error.message || (lang === 'zh' ? '加载失败' : 'Failed to load')}</div>
          <button onClick={retry} type="button" style={statusOverlayBtn}>
            {lang === 'zh' ? '重试' : 'Retry'}
          </button>
        </StatusOverlay>
      )}

      {!loading && !error && (
        <div style={{ padding: '20px 16px' }}>
          <div style={{ paddingBottom: 10 }}>
            <SectionLabel lang={lang}>{t('citiesActive', lang)}</SectionLabel>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.map((c) => (
              <button key={c.id} onClick={() => { setCity(c.id, c.name, c.lat, c.lng); navigate('/'); }} type="button" style={{
                background: C.card, border: `1px solid ${C.line}`, borderRadius: 12,
                padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontFamily: 'inherit',
              }}>
                <div>
                  <div style={{
                    fontSize: 17, fontWeight: 700, color: C.ink,
                    letterSpacing: lang === 'zh' ? 1.5 : 0,
                    fontFamily: serif(lang),
                  }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.ink60, marginTop: 4 }}>
                    {c.schools} {t('schoolsCount', lang)} · {Math.round(c.openRate * 100)}% {t('accessible', lang)}
                  </div>
                </div>
                <CityMeter rate={c.openRate} />
              </button>
            ))}
          </div>

          {soon.length > 0 && (
            <>
              <div style={{ paddingTop: 28, paddingBottom: 10 }}>
                <SectionLabel lang={lang}>{t('citiesSoon', lang)}</SectionLabel>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {soon.map((c) => (
                  <div key={c.id} style={{
                    background: 'transparent', border: `1px dashed ${C.ink20}`, borderRadius: 10,
                    padding: 14,
                  }}>
                    <div style={{
                      fontSize: 15, fontWeight: 600, color: C.ink60,
                      letterSpacing: lang === 'zh' ? 1 : 0,
                    }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: C.ink40, marginTop: 4 }}>
                      {c.schools} {t('schoolsShort', lang)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{
            marginTop: 28, padding: 16, background: C.card,
            border: `1px solid ${C.line}`, borderRadius: 12,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: 999,
              background: STATUS.open.bg, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke={STATUS.open.ink} strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ flex: 1, fontSize: 13, color: C.ink, lineHeight: 1.55, letterSpacing: lang === 'zh' ? 0.3 : 0 }}>
              <strong>{t('addYourCity', lang)}</strong>
              <div style={{ color: C.ink60, marginTop: 4 }}>{t('addYourCityBody', lang)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusOverlay({ children }) {
  return (
    <div style={{
      padding: '40px 16px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 12,
    }}>
      <div style={{ fontSize: 14, color: C.ink60 }}>{children}</div>
    </div>
  );
}

const statusOverlayBtn = {
  background: C.ink, color: '#fff',
  padding: '8px 20px', border: 0, borderRadius: 6,
  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
};

function CityMeter({ rate }) {
  return (
    <div style={{
      width: 56, height: 56, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', position: 'relative',
    }}>
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="28" cy="28" r="22" fill="none" stroke={C.ink08} strokeWidth="4" />
        <circle cx="28" cy="28" r="22" fill="none" stroke={STATUS.open.dot} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={`${rate * 138} 138`}
          transform="rotate(-90 28 28)" />
      </svg>
      <div style={{
        fontSize: 13, fontWeight: 700, color: C.ink, position: 'relative',
        fontFeatureSettings: '"tnum"',
      }}>
        {Math.round(rate * 100)}%
      </div>
    </div>
  );
}
