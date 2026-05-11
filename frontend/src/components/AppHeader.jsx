import { useNavigate } from 'react-router-dom';
import { C } from '../theme.js';
import { useLang } from '../context/LangContext.jsx';

// Top bar with back button + title + language toggle on the right.
export function AppHeader({ title, onBack, accent }) {
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const bg = accent || C.paper;
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: bg, paddingTop: 'max(env(safe-area-inset-top), 18px)',
      paddingBottom: 8,
      paddingLeft: 16, paddingRight: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `1px solid ${C.line}`,
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <button onClick={handleBack} type="button" aria-label="Back" style={{
          background: 'transparent', border: 0, padding: 4, cursor: 'pointer',
          color: C.ink, display: 'flex', alignItems: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{
          fontSize: 17, fontWeight: 600, color: C.ink,
          letterSpacing: lang === 'zh' ? 0.6 : 0,
          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
        }}>{title}</div>
      </div>
      <LangToggle lang={lang} setLang={setLang} />
    </div>
  );
}

export function LangToggle({ lang, setLang }) {
  return (
    <div style={{
      display: 'inline-flex', height: 28, padding: 2,
      background: 'rgba(255,255,255,0.5)',
      border: `0.5px solid ${C.ink20}`,
      borderRadius: 999,
      fontSize: 12, fontWeight: 600,
    }}>
      {[
        { v: 'zh', label: '中' },
        { v: 'en', label: 'EN' },
      ].map((o) => (
        <button key={o.v} onClick={() => setLang(o.v)} type="button" style={{
          minWidth: 32, padding: '0 8px',
          background: lang === o.v ? C.card : 'transparent',
          color: lang === o.v ? C.ink : C.ink60,
          border: 0, borderRadius: 999, cursor: 'pointer',
          fontFamily: 'inherit',
        }}>{o.label}</button>
      ))}
    </div>
  );
}
