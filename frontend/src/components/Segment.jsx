import { C } from '../theme.js';

export function Segment({ value, onChange, options, lang }) {
  return (
    <div style={{
      display: 'inline-flex', padding: 3, background: C.ink08,
      borderRadius: 8, gap: 0,
    }}>
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)} type="button" style={{
          padding: '6px 14px', fontSize: 13, fontWeight: 600,
          background: value === opt.value ? C.card : 'transparent',
          color: value === opt.value ? C.ink : C.ink60,
          border: 0, borderRadius: 6, cursor: 'pointer',
          letterSpacing: lang === 'zh' ? 0.4 : 0,
          boxShadow: value === opt.value ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.15s',
        }}>{opt.label}</button>
      ))}
    </div>
  );
}
