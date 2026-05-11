import { C } from '../theme.js';

export function FacilityIcon({ kind, size = 18, color = C.ink }) {
  const stroke = { stroke: color, strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (kind) {
    case 'walk':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="13" cy="4.5" r="1.8" {...stroke} />
          <path d="M9 21l3-6 3 2 3-1M12 15l-2-4 5-2 3 4M10 11l-3 1-1 4" {...stroke} />
        </svg>
      );
    case 'library':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h7v15H4zM13 5h7v15h-7z" {...stroke}/>
          <path d="M6 8h3M6 11h3M15 8h3M15 11h3" {...stroke}/>
        </svg>
      );
    case 'track':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="12" rx="9" ry="5" {...stroke}/>
          <ellipse cx="12" cy="12" rx="5.5" ry="2.5" {...stroke}/>
        </svg>
      );
    case 'gym':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 10v4M5.5 8v8M8 6v12M16 6v12M18.5 8v8M21 10v4M8 12h8" {...stroke}/>
        </svg>
      );
    case 'canteen':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 3v8a2 2 0 0 0 2 2v8M7 3v6M9 3v6M9 9a2 2 0 0 1-2 2M17 3c-1.5 0-3 2-3 5s1 4 3 4v9" {...stroke}/>
        </svg>
      );
    default: return null;
  }
}
