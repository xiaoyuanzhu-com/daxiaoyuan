import { AppHeader } from '../components/AppHeader.jsx';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { C, serif } from '../theme.js';
import gateImg from '../assets/about-gate.png';

export default function AboutScreen() {
  const { lang } = useLang();
  const isZh = lang === 'zh';

  return (
    <div style={{ background: C.paper, minHeight: '100%', paddingBottom: 56 }}>
      <AppHeader title={t('aboutTitle', lang)} accent={C.paper} />

      {/* —— 引 */}
      <section style={{
        padding: '72px 28px 56px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
      }}>
        <Quote large lang={lang}>{t('aboutQ1Body', lang)}</Quote>
        <Source lang={lang}>{t('aboutQ1Source', lang)}</Source>
      </section>

      <Divider />

      {/* —— 述 */}
      <section style={{
        padding: '52px 28px 56px',
        maxWidth: 520, margin: '0 auto',
      }}>
        <Prose lang={lang}>{t('aboutN1', lang)}</Prose>
        <Prose lang={lang}>{t('aboutN2', lang)}</Prose>
        <Prose lang={lang}>{t('aboutN3', lang)}</Prose>
      </section>

      <Divider />

      {/* —— 呼 (with 题画 gate background) */}
      <section style={{
        position: 'relative', padding: '64px 28px 60px',
        maxWidth: 560, margin: '0 auto',
        overflow: 'hidden',
      }}>
        <img src={gateImg} alt="" aria-hidden="true" style={{
          position: 'absolute',
          right: -8, bottom: 16,
          width: '78%', maxWidth: 420,
          opacity: 0.22,
          pointerEvents: 'none',
          userSelect: 'none',
          mixBlendMode: 'multiply',
        }} />
        <div style={{ position: 'relative' }}>
          <Quote lang={lang}>{t('aboutQ2Body', lang)}</Quote>
          <Source lang={lang}>{t('aboutQ2Source', lang)}</Source>

          <div style={{ height: 44 }} />

          <Prose lang={lang} faded>{t('aboutCallBody', lang)}</Prose>

          <div style={{ height: 32 }} />

          <Quote lang={lang}>{t('aboutQ3Body', lang)}</Quote>
          <Source lang={lang}>{t('aboutQ3Source', lang)}</Source>
        </div>
      </section>

      <Divider />

      {/* —— 落款 */}
      <section style={{
        padding: '48px 28px 40px', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: serif(lang),
          fontSize: 13, color: C.ink40,
          letterSpacing: isZh ? 2 : 0.4,
          fontStyle: isZh ? 'normal' : 'italic',
        }}>{t('aboutDedication', lang)}</div>
      </section>

      {/* —— 开源 */}
      <div style={{ padding: '0 20px 32px' }}>
        <a
          href="https://github.com/xiaoyuanzhu-com/daxiaoyuan"
          target="_blank" rel="noreferrer"
          style={{
            display: 'block',
            background: 'transparent',
            border: `1px solid ${C.line}`,
            borderRadius: 4,
            padding: '18px 18px',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: 1.6,
            color: C.ink40, textTransform: 'uppercase',
          }}>{t('openSourceKicker', lang)}</div>
          <div style={{
            fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 1.55,
            letterSpacing: isZh ? 0.3 : 0,
          }}>{t('openSourceBody', lang)}</div>
          <div style={{
            marginTop: 12,
            fontFamily: '"SF Mono", "Menlo", monospace', fontSize: 11,
            color: C.ink60,
          }}>github.com/xiaoyuanzhu-com/daxiaoyuan</div>
        </a>
      </div>
    </div>
  );
}

function Quote({ children, large, lang }) {
  return (
    <div style={{
      fontFamily: serif(lang),
      fontSize: large ? 22 : 19,
      lineHeight: 1.7,
      color: C.ink,
      letterSpacing: lang === 'zh' ? (large ? 3 : 2) : 0.2,
      fontStyle: lang === 'zh' ? 'normal' : 'italic',
      fontWeight: 400,
      textAlign: large ? 'center' : 'left',
      maxWidth: large ? 380 : '100%',
      margin: large ? '0 auto' : '0',
    }}>{children}</div>
  );
}

function Source({ children, lang }) {
  return (
    <div style={{
      marginTop: 18,
      fontSize: 11,
      color: C.ink40,
      letterSpacing: lang === 'zh' ? 1.5 : 0.8,
      fontFamily: serif(lang),
    }}>{children}</div>
  );
}

function Prose({ children, lang, faded }) {
  return (
    <p style={{
      fontFamily: serif(lang),
      fontSize: 15,
      lineHeight: 1.9,
      color: faded ? C.ink60 : C.ink,
      letterSpacing: lang === 'zh' ? 0.5 : 0.1,
      margin: '0 0 18px',
      textIndent: lang === 'zh' ? '2em' : 0,
    }}>{children}</p>
  );
}

function Divider() {
  return (
    <div style={{
      width: 32, height: 1,
      background: C.ink20,
      margin: '0 auto',
    }} />
  );
}
