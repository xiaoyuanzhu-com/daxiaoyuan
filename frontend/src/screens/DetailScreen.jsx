import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { FacilityIcon } from '../components/FacilityIcon.jsx';
import { SectionLabel } from '../components/SectionLabel.jsx';
import { useApi } from '../hooks/useApi.js';
import { fetchSchool } from '../data/api.js';
import { STATUS, FACILITIES } from '../data/status.js';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { C, serif } from '../theme.js';

export default function DetailScreen() {
  const { lang } = useLang();
  const { id } = useParams();
  const { data: school, loading, error, retry } = useApi(
    () => fetchSchool(id),
    [id],
  );

  if (loading) {
    return (
      <div style={{ background: C.paper, minHeight: '100%' }}>
        <AppHeader title={lang === 'zh' ? '加载中…' : 'Loading…'} />
        <div style={{ padding: 40, color: C.ink60, fontSize: 14, textAlign: 'center' }}>
          {lang === 'zh' ? '加载中…' : 'Loading…'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: C.paper, minHeight: '100%' }}>
        <AppHeader title={lang === 'zh' ? '加载失败' : 'Failed'} />
        <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ color: C.ink60, fontSize: 14 }}>{error.message}</div>
          <button onClick={retry} type="button" style={{
            background: C.ink, color: '#fff', padding: '8px 20px', border: 0,
            borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {lang === 'zh' ? '重试' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div style={{ background: C.paper, minHeight: '100%' }}>
        <AppHeader title={lang === 'zh' ? '未找到' : 'Not found'} />
        <div style={{ padding: 24, color: C.ink60, fontSize: 14 }}>
          {lang === 'zh' ? '没有这所学校。' : 'No such school.'}
        </div>
      </div>
    );
  }

  const st = STATUS[school.status];
  const name = school.name;
  const facKeys = Object.keys(school.facilities);

  return (
    <div style={{ background: C.paper, minHeight: '100%', paddingBottom: 100 }}>
      <AppHeader title={name} accent={st.bg} />

      <div style={{
        background: st.bg, padding: '4px 20px 24px', position: 'relative', overflow: 'hidden',
      }}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{
          position: 'absolute', right: -40, top: -20, opacity: 0.10,
        }}>
          <circle cx="90" cy="90" r="80" fill="none" stroke={st.ink} strokeWidth="1.5" />
          <circle cx="90" cy="90" r="65" fill="none" stroke={st.ink} strokeWidth="0.8" />
          <text x="90" y="100" textAnchor="middle" fontSize="60" fontWeight="700" fill={st.ink} fontFamily="serif">
            {school.name.charAt(0)}
          </text>
        </svg>
        {school.address && (
          <div style={{
            display: 'inline-block', padding: '5px 10px', background: 'rgba(255,255,255,0.5)',
            borderRadius: 4, fontSize: 11, color: st.ink, fontWeight: 600,
            letterSpacing: lang === 'zh' ? 0.4 : 0, marginBottom: 10,
          }}>
            {school.address}
          </div>
        )}
        <div style={{
          fontSize: 26, fontWeight: 700, color: st.ink, lineHeight: 1.15,
          letterSpacing: lang === 'zh' ? 1 : 0,
          fontFamily: serif(lang),
        }}>{name}</div>

        <div style={{ marginTop: 16 }}>
          <div style={{
            fontSize: 30, fontWeight: 700, color: st.ink, letterSpacing: lang === 'zh' ? 0.6 : 0,
            lineHeight: 1,
          }}>{lang === 'zh' ? st.zh : st.en}</div>
        </div>
        <div style={{
          fontSize: 11, color: st.ink, opacity: 0.65, marginTop: 8,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {relativeTime(school.lastUpdate, lang)}
          <span aria-hidden="true">·</span>
          <Link to={`/s/${school.id}/edit`} style={{
            color: st.ink, textDecoration: 'underline', textUnderlineOffset: 2,
          }}>{lang === 'zh' ? '编辑' : 'Edit'}</Link>
        </div>
      </div>

      <DetailSection lang={lang} label={t('facilities', lang)}>
        <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
          {facKeys.map((k, i) => {
            const f = school.facilities[k];
            const muted = f.status === 'closed' || f.status === 'alumni';
            return (
              <div key={k} style={{
                display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 12,
                borderTop: i === 0 ? 'none' : `1px solid ${C.line}`,
              }}>
                <FacilityIcon kind={k} size={18} color={muted ? C.ink40 : C.ink} />
                <div style={{
                  flex: 1, fontSize: 14, color: muted ? C.ink40 : C.ink,
                  letterSpacing: lang === 'zh' ? 0.3 : 0,
                  textDecoration: f.status === 'closed' ? 'line-through' : 'none',
                }}>{lang === 'zh' ? FACILITIES[k].zh : FACILITIES[k].en}</div>
                <StatusBadge status={f.status} lang={lang} size="sm" />
              </div>
            );
          })}
        </div>
      </DetailSection>

    </div>
  );
}

function DetailSection({ lang, label, children }) {
  return (
    <div style={{ padding: '20px 16px 4px' }}>
      <div style={{ paddingBottom: 12 }}>
        <SectionLabel lang={lang}>{label}</SectionLabel>
      </div>
      {children}
    </div>
  );
}

function relativeTime(iso, lang) {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  const min = 60, hour = 3600, day = 86400, week = day * 7;
  if (lang === 'zh') {
    if (diffSec < hour)      return `${Math.max(1, Math.floor(diffSec / min))} 分钟前更新`;
    if (diffSec < day)       return `${Math.floor(diffSec / hour)} 小时前更新`;
    if (diffSec < week)      return `${Math.floor(diffSec / day)} 天前更新`;
    return `${Math.floor(diffSec / week)} 周前更新`;
  }
  if (diffSec < hour)        return `Updated ${Math.max(1, Math.floor(diffSec / min))}m ago`;
  if (diffSec < day)         return `Updated ${Math.floor(diffSec / hour)}h ago`;
  if (diffSec < week)        return `Updated ${Math.floor(diffSec / day)}d ago`;
  return `Updated ${Math.floor(diffSec / week)}w ago`;
}
