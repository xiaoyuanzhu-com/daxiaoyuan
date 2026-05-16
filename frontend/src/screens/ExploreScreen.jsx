import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { fetchCities, fetchRankings985, fetchRankings211, fetchRankingsC9, fetchRankingsQS30 } from '../data/api.js';
import { STATUS } from '../data/status.js';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { C, serif } from '../theme.js';

const TABS = [
  { key: 'cities', i18n: 'tabCities' },
  { key: '985',    i18n: 'tab985' },
  { key: '211',    i18n: 'tab211' },
  { key: 'c9',     i18n: 'tabC9' },
  { key: 'qs30',   i18n: 'tabQS30' },
];

export default function ExploreScreen() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState('cities');

  const { data: cities, loading: lCities, error: eCities, retry: rCities } = useApi(fetchCities);
  const { data: d985, loading: l985, error: e985, retry: r985 } = useApi(fetchRankings985);
  const { data: d211, loading: l211, error: e211, retry: r211 } = useApi(fetchRankings211);
  const { data: dC9,  loading: lC9,  error: eC9,  retry: rC9  } = useApi(fetchRankingsC9);
  const { data: dQS,  loading: lQS,  error: eQS,  retry: rQS  } = useApi(fetchRankingsQS30);

  const rankedCities = (cities || []).slice().sort((a, b) => {
    if (b.openRate !== a.openRate) return b.openRate - a.openRate;
    return b.schools - a.schools;
  });

  return (
    <div style={{ background: C.paper, minHeight: '100%', paddingBottom: 60 }}>
      <AppHeader title={t('exploreTitle', lang)} accent={C.paper} />

      <div style={{
        position: 'sticky', top: 56, zIndex: 20, background: C.paper,
        padding: '8px 16px 0', borderBottom: `1px solid ${C.line}`,
        display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        {TABS.map((tKey) => (
          <button key={tKey.key} onClick={() => setTab(tKey.key)} type="button" style={{
            flexShrink: 0, padding: '7px 16px',
            background: tab === tKey.key ? C.ink : 'transparent',
            color: tab === tKey.key ? C.paper : C.ink60,
            border: tab === tKey.key ? `1px solid ${C.ink}` : `1px solid transparent`,
            borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: lang === 'zh' ? 0.4 : 0,
          }}>{t(tKey.i18n, lang)}</button>
        ))}
      </div>

      <div style={{ padding: '12px 16px' }}>
        {tab === 'cities' && <CityRanking lang={lang} cities={rankedCities} loading={lCities} error={eCities} retry={rCities} />}
        {tab === '985'   && <SchoolRanking lang={lang} data={d985} loading={l985} error={e985} retry={r985} navigate={navigate} />}
        {tab === '211'   && <SchoolRanking lang={lang} data={d211} loading={l211} error={e211} retry={r211} navigate={navigate} />}
        {tab === 'c9'    && <SchoolRanking lang={lang} data={dC9}  loading={lC9}  error={eC9}  retry={rC9}  navigate={navigate} />}
        {tab === 'qs30'  && <SchoolRanking lang={lang} data={dQS}  loading={lQS}  error={eQS}  retry={rQS}  navigate={navigate} />}
      </div>
    </div>
  );
}

function CityRanking({ lang, cities, loading, error, retry }) {
  if (loading) return <StatusOverlay>{lang === 'zh' ? '加载中…' : 'Loading…'}</StatusOverlay>;
  if (error) return <ErrorOverlay msg={error.message} onRetry={retry} lang={lang} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {cities.map((c, i) => (
        <div key={c.id} style={{
          background: C.card, border: `1px solid ${c.active ? C.line : 'transparent'}`,
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 14,
          opacity: c.active ? 1 : 0.5,
        }}>
          <div style={{
            width: 28, textAlign: 'center', fontSize: 17, fontWeight: 700,
            color: i < 3 ? C.accent : C.ink40, fontFeatureSettings: '"tnum"',
            flexShrink: 0,
          }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: C.ink,
              letterSpacing: lang === 'zh' ? 1 : 0,
              fontFamily: serif(lang),
            }}>{c.name}</div>
            <div style={{ fontSize: 12, color: C.ink60, marginTop: 2 }}>
              {c.schools} {t('schoolsCount', lang)} · {Math.round(c.openRate * 100)}% {t('accessible', lang)}
            </div>
          </div>
          <CityMeter rate={c.openRate} />
        </div>
      ))}
      {cities.length === 0 && <EmptyState lang={lang} />}
    </div>
  );
}

function SchoolRanking({ lang, data, loading, error, retry, navigate }) {
  if (loading) return <StatusOverlay>{lang === 'zh' ? '加载中…' : 'Loading…'}</StatusOverlay>;
  if (error) return <ErrorOverlay msg={error.message} onRetry={retry} lang={lang} />;

  const schools = data?.schools || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {schools.map((s) => (
        <button key={s.id} onClick={() => navigate(`/s/${s.id}`)} type="button" style={{
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 12,
            padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 14,
            fontFamily: 'inherit',
          }}>
            <div style={{
              width: 28, textAlign: 'center', fontSize: 17, fontWeight: 700,
              color: s.rank <= 3 ? C.accent : C.ink40,
              fontFeatureSettings: '"tnum"', flexShrink: 0,
            }}>{s.rank}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 16, fontWeight: 700, color: C.ink,
                letterSpacing: lang === 'zh' ? 1 : 0,
                fontFamily: serif(lang),
              }}>{s.name}</div>
            </div>
            <StatusBadge status={s.status} lang={lang} size="sm" />
          </button>
        ))}
      {schools.length === 0 && <EmptyState lang={lang} />}
    </div>
  );
}

function CityMeter({ rate }) {
  return (
    <div style={{
      width: 48, height: 48, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', position: 'relative',
      flexShrink: 0,
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="24" cy="24" r="19" fill="none" stroke={C.ink08} strokeWidth="4" />
        <circle cx="24" cy="24" r="19" fill="none" stroke={STATUS.open.dot} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={`${rate * 119} 119`}
          transform="rotate(-90 24 24)" />
      </svg>
      <div style={{
        fontSize: 12, fontWeight: 700, color: C.ink, position: 'relative',
        fontFeatureSettings: '"tnum"',
      }}>
        {Math.round(rate * 100)}%
      </div>
    </div>
  );
}

function StatusOverlay({ children }) {
  return <div style={{ padding: '40px 16px', textAlign: 'center', color: C.ink60, fontSize: 14 }}>{children}</div>;
}

function ErrorOverlay({ msg, onRetry, lang }) {
  return (
    <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 14, color: C.ink60 }}>{msg}</div>
      <button onClick={onRetry} type="button" style={{
        background: C.ink, color: '#fff', padding: '8px 20px', border: 0,
        borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
      }}>{lang === 'zh' ? '重试' : 'Retry'}</button>
    </div>
  );
}

function EmptyState({ lang }) {
  return <div style={{ padding: '40px 16px', textAlign: 'center', color: C.ink40, fontSize: 13 }}>{t('rankEmpty', lang)}</div>;
}
