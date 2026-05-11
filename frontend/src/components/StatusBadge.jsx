import { STATUS } from '../data/status.js';
import { C } from '../theme.js';

export function StatusBadge({ status, lang, size = 'md' }) {
  const s = STATUS[status];
  if (!s) return null;
  const label = lang === 'zh' ? s.zh : s.en;
  const pad = size === 'sm' ? '3px 8px' : size === 'lg' ? '6px 12px' : '4px 10px';
  const fs = size === 'sm' ? 11 : size === 'lg' ? 14 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: pad, fontSize: fs, lineHeight: 1.1,
      background: s.bg, color: s.ink, borderRadius: 4,
      fontWeight: 600, letterSpacing: lang === 'zh' ? 0.3 : 0,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

export function StatusDot({ status, size = 8 }) {
  const s = STATUS[status];
  if (!s) return null;
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 999, background: s.dot, flexShrink: 0 }} />;
}
