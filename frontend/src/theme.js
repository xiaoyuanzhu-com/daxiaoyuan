export const C = {
  paper:      '#F6F1E8',
  paperAlt:   '#EFE9DD',
  pageBg:     '#E8E2D4',
  card:       '#FFFEFB',
  ink:        '#1A1815',
  ink60:      'rgba(26,24,21,0.6)',
  ink40:      'rgba(26,24,21,0.4)',
  ink20:      'rgba(26,24,21,0.18)',
  ink08:      'rgba(26,24,21,0.08)',
  line:       'rgba(26,24,21,0.10)',
  accent:     '#2E5A1C',
  accentSoft: '#5BA13C',
  alert:      '#B43A28',
};

export const SERIF_ZH = '"Noto Serif SC", "Source Han Serif SC", serif';
export const SERIF_EN = '"Source Serif Pro", "Noto Serif", Georgia, serif';
export const serif = (lang) => (lang === 'zh' ? SERIF_ZH : SERIF_EN);
