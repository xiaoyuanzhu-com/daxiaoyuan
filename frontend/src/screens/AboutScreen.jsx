import { AppHeader } from '../components/AppHeader.jsx';
import { SectionLabel } from '../components/SectionLabel.jsx';
import { SCHOOLS } from '../data/seed.js';
import { STATUS } from '../data/status.js';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { C, serif } from '../theme.js';

export default function AboutScreen() {
  const { lang } = useLang();
  const stats = SCHOOLS.reduce((a, s) => {
    if (s.status === 'open') a.open++;
    else if (s.status === 'closed' || s.status === 'alumni') a.closed++;
    else a.friction++;
    return a;
  }, { open: 0, friction: 0, closed: 0 });

  return (
    <div style={{ background: C.paper, minHeight: '100%', paddingBottom: 60 }}>
      <AppHeader title={t('aboutTitle', lang)} accent={C.paper} />

      <div style={{
        padding: '32px 24px 28px', background: C.paperAlt,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -30, top: -30, opacity: 0.06,
          fontSize: 220, fontWeight: 900, lineHeight: 1, color: C.ink,
          fontFamily: 'serif', pointerEvents: 'none',
        }}>大</div>
        <div style={{
          fontSize: 11, color: C.ink60, letterSpacing: 1.5,
          fontWeight: 600, textTransform: 'uppercase',
        }}>{t('aboutKicker', lang)}</div>
        <div style={{
          marginTop: 12, fontSize: 28, fontWeight: 700, color: C.ink,
          lineHeight: 1.25, letterSpacing: lang === 'zh' ? 1 : 0,
          fontFamily: serif(lang),
        }}>{t('aboutLead', lang)}</div>
      </div>

      <div style={{ padding: '24px 16px 8px' }}>
        <SectionLabel lang={lang}>{t('liveTitle', lang)}</SectionLabel>
        <div style={{ marginTop: 14, padding: '0 4px' }}>
          <div style={{
            display: 'flex', height: 36, borderRadius: 6, overflow: 'hidden',
            border: `1px solid ${C.line}`, background: C.card,
          }}>
            <Bar n={stats.open} total={SCHOOLS.length} bg={STATUS.open.bg} ink={STATUS.open.ink} />
            <Bar n={stats.friction} total={SCHOOLS.length} bg={STATUS.daytime.bg} ink={STATUS.daytime.ink} />
            <Bar n={stats.closed} total={SCHOOLS.length} bg={STATUS.closed.bg} ink={STATUS.closed.ink} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <LegendRow label={t('fullyOpen', lang)} n={stats.open} total={SCHOOLS.length} dot={STATUS.open.dot} lang={lang} />
            <LegendRow label={t('withFriction', lang)} n={stats.friction} total={SCHOOLS.length} dot={STATUS.daytime.dot} lang={lang} />
            <LegendRow label={t('closedOrAlumni', lang)} n={stats.closed} total={SCHOOLS.length} dot={STATUS.closed.dot} lang={lang} />
          </div>
          <div style={{
            fontSize: 11, color: C.ink40, marginTop: 14,
            letterSpacing: lang === 'zh' ? 0.3 : 0,
          }}>
            {lang === 'zh'
              ? `数据来源:${SCHOOLS.length} 所北京高校,用户共建`
              : `From ${SCHOOLS.length} ${t('outOf', lang)} · community-sourced`}
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 16px 8px' }}>
        <SectionLabel lang={lang}>{t('values', lang)}</SectionLabel>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
          {[
            { num: '01', title: t('v1Title', lang), body: t('v1Body', lang) },
            { num: '02', title: t('v2Title', lang), body: t('v2Body', lang) },
            { num: '03', title: t('v3Title', lang), body: t('v3Body', lang) },
          ].map((v) => (
            <div key={v.num} style={{
              display: 'flex', gap: 16, padding: '18px 4px',
              borderTop: `1px solid ${C.line}`,
            }}>
              <div style={{
                fontSize: 11, color: C.ink40, fontWeight: 600, marginTop: 6, width: 24,
                fontFeatureSettings: '"tnum"',
              }}>{v.num}</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: C.ink,
                  letterSpacing: lang === 'zh' ? 1 : 0,
                  fontFamily: serif(lang),
                }}>{v.title}</div>
                <div style={{
                  fontSize: 13, color: C.ink60, marginTop: 6, lineHeight: 1.55,
                  letterSpacing: lang === 'zh' ? 0.3 : 0,
                }}>{v.body}</div>
              </div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.line}` }} />
        </div>
      </div>

      <div style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{
          fontSize: 18, fontWeight: 500, color: C.ink, lineHeight: 1.5,
          letterSpacing: lang === 'zh' ? 0.6 : 0,
          fontFamily: serif(lang),
          fontStyle: lang === 'zh' ? 'normal' : 'italic',
        }}>{t('pullQuote', lang)}</div>
        <div style={{ fontSize: 11, color: C.ink40, marginTop: 12, letterSpacing: 1 }}>
          — {t('pullQuoteSig', lang)}
        </div>
      </div>

      <div style={{ padding: '0 16px 32px' }}>
        <div style={{
          background: C.ink, color: C.paper, borderRadius: 14, padding: '20px 18px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: 1.4,
            opacity: 0.6, textTransform: 'uppercase',
          }}>{t('openSourceKicker', lang)}</div>
          <div style={{
            fontSize: 16, fontWeight: 600, marginTop: 8, lineHeight: 1.4,
            letterSpacing: lang === 'zh' ? 0.4 : 0, fontFamily: 'inherit',
          }}>{t('openSourceBody', lang)}</div>
          <div style={{
            marginTop: 14, padding: '10px 12px',
            background: 'rgba(255,255,255,0.08)', borderRadius: 8,
            fontFamily: '"SF Mono", "Menlo", monospace', fontSize: 11,
            color: 'rgba(255,255,255,0.7)',
          }}>github.com/xiaoyuanzhu-com/daxiaoyuan</div>
        </div>
      </div>
    </div>
  );
}

function Bar({ n, total, bg, ink }) {
  const pct = (n / total) * 100;
  if (pct === 0) return null;
  return (
    <div style={{
      width: pct + '%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: ink, fontFeatureSettings: '"tnum"',
      borderRight: '1px solid rgba(0,0,0,0.04)',
    }}>{n}</div>
  );
}

function LegendRow({ label, n, total, dot, lang }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: C.ink, letterSpacing: lang === 'zh' ? 0.4 : 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.ink60, fontFeatureSettings: '"tnum"' }}>
        {n}<span style={{ color: C.ink40 }}> / {total}</span>
      </span>
    </div>
  );
}
