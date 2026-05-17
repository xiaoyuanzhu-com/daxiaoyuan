import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const DEFAULT = { id: 'bj', name: '北京', lat: 39.96, lng: 116.34 };

const CityContext = createContext({
  cityId: DEFAULT.id,
  cityName: DEFAULT.name,
  cityLat: DEFAULT.lat,
  cityLng: DEFAULT.lng,
  setCity: () => {},
});

const STORAGE_KEY = 'dxy:city';

function detectInitial() {
  if (typeof window === 'undefined') return DEFAULT;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id && parsed.name && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT;
}

export function CityProvider({ children }) {
  const [city, setCityState] = useState(detectInitial);

  const setCity = useCallback((id, name, lat, lng) => {
    const next = { id, name, lat, lng };
    setCityState(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const value = useMemo(
    () => ({
      cityId: city.id,
      cityName: city.name,
      cityLat: city.lat,
      cityLng: city.lng,
      setCity,
    }),
    [city, setCity],
  );
  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  return useContext(CityContext);
}
