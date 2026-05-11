import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { FacilityIcon } from '../components/FacilityIcon.jsx';
import { SectionLabel } from '../components/SectionLabel.jsx';
import { findSchool } from '../data/seed.js';
import { STATUS, FACILITIES } from '../data/status.js';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { C, serif } from '../theme.js';

export default function DetailScreen() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { id } = useParams();
  const school = findSchool(id);

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
  const name = lang === 'zh' ? school.zh : school.en;
  const facKeys = Object.keys(school.facilities);
  const notes = school.notes || [];

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
            {lang === 'zh' ? school.zh.charAt(0) : school.short.charAt(0)}
          </text>
        </svg>
        <div style={{
          display: 'inline-block', padding: '5px 10px', background: 'rgba(255,255,255,0.5)',
          borderRadius: 4, fontSize: 11, color: st.ink, fontWeight: 600,
          letterSpacing: lang === 'zh' ? 0.4 : 0, marginBottom: 10,
        }}>
          {lang === 'zh' ? school.district.zh : school.district.en} · {school.distance} {t('km', lang)}
        </div>
        <div style={{
          fontSize: 26, fontWeight: 700, color: st.ink, lineHeight: 1.15,
          letterSpacing: lang === 'zh' ? 1 : 0,
          fontFamily: serif(lang),
        }}>{name}</div>
        <div style={{
          fontSize: 14, color: st.ink, opacity: 0.75, marginTop: 4,
          letterSpacing: lang === 'zh' ? 0.3 : 0,
        }}>{lang === 'zh' ? school.en : school.zh}</div>

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
          {lang === 'zh'
            ? `${school.lastUpdate}更新 · ${school.confirms} 人确认`
            : `${t('updatedAt', 'en')} ${school.lastUpdateEn} · ${school.confirms} ${t('confirms', 'en')}`}
        </div>
      </div>

      <DetailSection lang={lang} label={t('entry', lang)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(lang === 'zh' ? school.entry.zh : school.entry.en).map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, marginTop: 7, width: 4, height: 4, borderRadius: 999, background: C.ink }} />
              <div style={{
                fontSize: 14, color: C.ink, lineHeight: 1.5,
                letterSpacing: lang === 'zh' ? 0.4 : 0,
              }}>{line}</div>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection lang={lang} label={t('schedule', lang)}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
          background: C.line, borderRadius: 8, overflow: 'hidden',
        }}>
          {[
            ['weekday', school.schedule.weekday],
            ['weekend', school.schedule.weekend],
            ['summer',  school.schedule.summer],
          ].map(([k, v]) => (
            <div key={k} style={{ background: C.card, padding: '12px 10px' }}>
              <div style={{
                fontSize: 10, color: C.ink40, fontWeight: 600,
                letterSpacing: lang === 'zh' ? 0.8 : 1,
                textTransform: lang === 'zh' ? 'none' : 'uppercase',
              }}>{t(k, lang)}</div>
              <div style={{
                fontSize: 13, color: C.ink, marginTop: 4,
                fontFeatureSettings: '"tnum"', fontWeight: 500,
              }}>{v}</div>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection lang={lang} label={t('facilities', lang)}>
        <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
          {facKeys.map((k, i) => {
            const muted = school.facilities[k] === 'closed' || school.facilities[k] === 'alumni';
            return (
              <div key={k} style={{
                display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 12,
                borderTop: i === 0 ? 'none' : `1px solid ${C.line}`,
              }}>
                <FacilityIcon kind={k} size={18} color={muted ? C.ink40 : C.ink} />
                <div style={{
                  flex: 1, fontSize: 14, color: muted ? C.ink40 : C.ink,
                  letterSpacing: lang === 'zh' ? 0.3 : 0,
                  textDecoration: school.facilities[k] === 'closed' ? 'line-through' : 'none',
                }}>{lang === 'zh' ? FACILITIES[k].zh : FACILITIES[k].en}</div>
                <StatusBadge status={school.facilities[k]} lang={lang} size="sm" />
              </div>
            );
          })}
        </div>
      </DetailSection>

      {notes.length > 0 && (
        <DetailSection lang={lang} label={t('notes', lang)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notes.map((n, i) => (
              <div key={i} style={{
                background: C.card, border: `1px solid ${C.line}`, borderRadius: 8,
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: C.ink, fontWeight: 600, letterSpacing: lang === 'zh' ? 0.3 : 0 }}>
                    {n.user}
                  </div>
                  <div style={{ fontSize: 11, color: C.ink40 }}>{lang === 'zh' ? n.date : n.dateEn}</div>
                </div>
                <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5, letterSpacing: lang === 'zh' ? 0.3 : 0 }}>
                  {lang === 'zh' ? n.text : n.textEn}
                </div>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        background: `linear-gradient(to top, ${C.paper} 60%, rgba(246,241,232,0))`,
        padding: '16px 16px 28px', marginTop: 8,
      }}>
        <button onClick={() => navigate(`/update/${school.id}`)} type="button" style={{
          width: '100%', padding: 14, background: C.ink, color: C.paper,
          border: 0, borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          letterSpacing: lang === 'zh' ? 0.6 : 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          {t('iveBeen', lang)}
        </button>
      </div>
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
