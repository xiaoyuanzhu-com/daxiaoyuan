import { C } from '../theme.js';

export function SectionLabel({ children, lang }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: C.ink40,
      textTransform: lang === 'zh' ? 'none' : 'uppercase',
      letterSpacing: lang === 'zh' ? 1 : 1.4,
      padding: '0 4px',
    }}>{children}</div>
  );
}
