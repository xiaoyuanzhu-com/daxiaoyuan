import { C } from '../theme.js';
import { serif } from '../theme.js';

export function BigButton({ children, onClick, disabled, lang, type = 'button', variant = 'primary' }) {
  const isPrimary = variant === 'primary';
  return (
    <button onClick={onClick} disabled={disabled} type={type} style={{
      width: '100%', padding: 14, borderRadius: 12, border: 0,
      background: disabled ? C.ink20 : (isPrimary ? C.ink : C.card),
      color: disabled ? C.ink40 : (isPrimary ? C.paper : C.ink),
      fontSize: 15, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      letterSpacing: lang === 'zh' ? 0.6 : 0,
      fontFamily: 'inherit',
      boxShadow: isPrimary && !disabled ? '0 2px 6px rgba(26,24,21,0.18)' : 'none',
    }}>{children}</button>
  );
}

export function Spacer() {
  return <div style={{ flex: 1, minHeight: 16 }} />;
}

export function FormQuestion({ lang, kicker, title, sub }) {
  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{
        fontSize: 11, color: C.ink40, fontWeight: 600,
        letterSpacing: lang === 'zh' ? 1 : 1.4,
        textTransform: lang === 'zh' ? 'none' : 'uppercase',
        marginBottom: 10,
      }}>{kicker}</div>
      <div style={{
        fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1.25,
        letterSpacing: lang === 'zh' ? 0.6 : 0,
        fontFamily: serif(lang),
      }}>{title}</div>
      {sub && (
        <div style={{
          fontSize: 13, color: C.ink60, marginTop: 6,
          letterSpacing: lang === 'zh' ? 0.3 : 0,
        }}>{sub}</div>
      )}
    </div>
  );
}
