import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const LangContext = createContext({ lang: 'zh', setLang: () => {} });

const STORAGE_KEY = 'dxy:lang';

function detectInitial() {
  if (typeof window === 'undefined') return 'zh';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {}
  const nav = (window.navigator?.language || 'zh').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(detectInitial);

  const setLang = useCallback((next) => {
    setLangState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next === 'zh' ? 'zh' : 'en';
    }
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
