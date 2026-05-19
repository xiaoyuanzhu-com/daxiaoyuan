import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TMap, MultiMarker } from 'tlbs-map-react';
import { SchoolCard } from '../components/SchoolCard.jsx';
import { Segment } from '../components/Segment.jsx';
import { SectionLabel } from '../components/SectionLabel.jsx';
import { FacilityIcon } from '../components/FacilityIcon.jsx';
import { LangToggle } from '../components/AppHeader.jsx';
import { fetchSchools } from '../data/api.js';
import { distanceKm } from '../data/distance.js';
import { STATUS, STATUS_ORDER, FACILITIES, campusStatus } from '../data/status.js';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { useCity } from '../context/CityContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { C, serif } from '../theme.js';

export default function HomeScreen() {
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const accent = C.paper;
  const [view, setView] = useState('map');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => new Set());
  const [facFilter, setFacFilter] = useState(() => new Set());

  const { cityId, cityName, cityLat, cityLng } = useCity();

  // User location (browser geolocation). Fail silently — distance just won't show.
  const [coords, setCoords] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000 },
    );
  }, []);

  // Fetch schools for current city.
  const { data: schools, loading, error, retry } = useApi(
    () => fetchSchools(cityId),
    [cityId],
  );

  // Pre-compute distance for sorting and display.
  const schoolsWithDistance = useMemo(() => {
    if (!schools) return [];
    return schools.map((s) => ({
      ...s,
      distanceKm: coords ? distanceKm(coords.lat, coords.lng, s.lat, s.lng) : null,
    }));
  }, [schools, coords]);

  const toggle = (set, setter, v) => {
    const next = new Set(set);
    next.has(v) ? next.delete(v) : next.add(v);
    setter(next);
  };

  // Filter + sort. Note: list endpoint returns summary (no facilities), so
  // facility filtering does nothing here. We keep the UI to avoid an extra
  // task, with a known limitation in the plan.
  const filtered = schoolsWithDistance.filter((s) => {
    if (statusFilter.size && !statusFilter.has(campusStatus(s))) return false;
    // Summary endpoint has no facilities; facility filter would require a heavier
    // endpoint. For now any active facility filter yields no results (matches wechat).
    if (facFilter.size) return false;
    return true;
  }).sort((a, b) => {
    const aOrder = STATUS[campusStatus(a)].order;
    const bOrder = STATUS[campusStatus(b)].order;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const da = a.distanceKm === null ? Infinity : a.distanceKm;
    const db = b.distanceKm === null ? Infinity : b.distanceKm;
    return da - db;
  });

  const hasFilters = statusFilter.size + facFilter.size > 0;

  return (
    <div style={{ background: C.paper, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 30, background: accent,
        paddingTop: 'max(env(safe-area-inset-top), 18px)', paddingBottom: 12,
        paddingLeft: 16, paddingRight: 16,
        borderBottom: `1px solid ${C.line}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={() => navigate('/about')} type="button" style={{
            background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'baseline', gap: 8,
          }}>
            <div style={{
              fontSize: 22, fontWeight: 700, color: C.ink,
              letterSpacing: lang === 'zh' ? 2 : 0,
              fontFamily: serif(lang),
            }}>{t('appName', lang)}</div>
            <div style={{
              fontSize: 11, color: C.ink60,
              letterSpacing: lang === 'zh' ? 0.5 : 0,
            }}>{t('brandKicker', lang)}</div>
          </button>
          <LangToggle lang={lang} setLang={setLang} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/cities')} type="button" style={{
            background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, letterSpacing: lang === 'zh' ? 0.6 : 0 }}>
              {cityName}
            </div>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke={C.ink60} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 11, color: C.ink60, marginLeft: 4 }}>
              {filtered.length} / {schoolsWithDistance.length} {t('schoolsCount', lang)}
            </span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate('/s/new')} type="button"
              aria-label={lang === 'zh' ? '新建学校' : 'New school'}
              title={lang === 'zh' ? '新建学校' : 'New school'} style={{
              width: 28, height: 28, borderRadius: 999,
              background: C.card, border: `1px solid ${C.line}`,
              color: C.ink, cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <Segment value={view} onChange={setView} lang={lang} options={[
              { value: 'map',  label: t('tabMap', lang) },
              { value: 'list', label: t('tabList', lang) },
            ]} />
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 16px', display: 'flex', gap: 8, background: accent }}>
        <div style={{
          flex: 1, height: 32, background: 'rgba(255,255,255,0.6)', borderRadius: 8,
          display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6,
          border: `1px solid ${C.line}`,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke={C.ink60} strokeWidth="1.8" />
            <path d="M20 20l-3.5-3.5" stroke={C.ink60} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 13, color: C.ink40, letterSpacing: lang === 'zh' ? 0.3 : 0 }}>{t('search', lang)}</span>
        </div>
        <button onClick={() => setFilterOpen(true)} type="button" style={{
          height: 32, padding: '0 12px',
          background: hasFilters ? C.ink : C.card,
          color: hasFilters ? C.paper : C.ink,
          border: `1px solid ${hasFilters ? C.ink : C.line}`,
          borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          letterSpacing: lang === 'zh' ? 0.4 : 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M4 5h16M7 12h10M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t('filter', lang)}
          {hasFilters && <span style={{ fontSize: 10, opacity: 0.8 }}>· {statusFilter.size + facFilter.size}</span>}
        </button>
      </div>

      {loading && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: C.ink60, fontSize: 14 }}>
          {lang === 'zh' ? '加载中…' : 'Loading…'}
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, color: C.ink60 }}>
            {error.message || (lang === 'zh' ? '加载失败' : 'Failed to load')}
          </div>
          <button onClick={retry} type="button" style={{
            background: C.ink, color: '#fff', padding: '8px 20px', border: 0,
            borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {lang === 'zh' ? '重试' : 'Retry'}
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {view === 'map'
            ? <MapView lang={lang} schools={filtered} coords={coords} cityName={cityName} cityLat={cityLat} cityLng={cityLng} onOpen={(id) => navigate(`/s/${id}`)} />
            : <ListView lang={lang} schools={filtered} cityName={cityName} onOpen={(id) => navigate(`/s/${id}`)} />}
        </>
      )}

      {filterOpen && (
        <FilterSheet
          lang={lang}
          statusFilter={statusFilter}
          facFilter={facFilter}
          onToggleStatus={(v) => toggle(statusFilter, setStatusFilter, v)}
          onToggleFac={(v) => toggle(facFilter, setFacFilter, v)}
          onReset={() => { setStatusFilter(new Set()); setFacFilter(new Set()); }}
          onClose={() => setFilterOpen(false)}
          resultsCount={filtered.length}
        />
      )}
    </div>
  );
}

const TENCENT_KEY = import.meta.env.VITE_TENCENT_MAP_KEY;

const dotSvg = (color) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" fill="${color}" stroke="#fff" stroke-width="2.5"/></svg>`
  );

const MARKER_STYLES = {
  open:       { width: 22, height: 22, anchor: { x: 11, y: 11 }, src: dotSvg(STATUS.open.dot) },
  appt:       { width: 22, height: 22, anchor: { x: 11, y: 11 }, src: dotSvg(STATUS.appt.dot) },
  restricted: { width: 22, height: 22, anchor: { x: 11, y: 11 }, src: dotSvg(STATUS.restricted.dot) },
  alumni:     { width: 22, height: 22, anchor: { x: 11, y: 11 }, src: dotSvg(STATUS.alumni.dot) },
  closed:     { width: 22, height: 22, anchor: { x: 11, y: 11 }, src: dotSvg(STATUS.closed.dot) },
};

const ME_STYLES = {
  me: { width: 18, height: 18, anchor: { x: 9, y: 9 }, src: dotSvg('#1E73D6') },
};

function MapView({ lang, schools, coords, cityName, cityLat, cityLng, onOpen }) {
  const H = 360;

  const geometries = useMemo(
    () => schools.map((s) => ({
      id: s.id,
      position: { lat: s.lat, lng: s.lng },
      styleId: campusStatus(s),
      properties: { name: s.name },
    })),
    [schools],
  );

  const meGeometries = useMemo(
    () => (coords ? [{ id: 'me', position: { lat: coords.lat, lng: coords.lng }, styleId: 'me' }] : []),
    [coords],
  );

  const handleMarkerClick = useCallback((evt) => {
    const id = evt?.geometry?.id;
    if (id) onOpen(id);
  }, [onOpen]);

  return (
    <div style={{ padding: '8px 16px 0 16px', background: C.paper }}>
      <div style={{
        position: 'relative', width: '100%', height: H, borderRadius: 14,
        overflow: 'hidden', border: `1px solid ${C.line}`,
        background: '#E8E3D5',
      }}>
        {TENCENT_KEY ? (
          <TMap
            apiKey={TENCENT_KEY}
            style={{ width: '100%', height: '100%' }}
            options={{
              center: { lat: cityLat, lng: cityLng },
              zoom: 11,
              viewMode: '2D',
              showControl: false,
            }}
          >
            <MultiMarker
              styles={MARKER_STYLES}
              geometries={geometries}
              onClick={handleMarkerClick}
            />
            {coords && (
              <MultiMarker styles={ME_STYLES} geometries={meGeometries} />
            )}
          </TMap>
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 24, textAlign: 'center',
            color: C.ink60, fontSize: 13, lineHeight: 1.6,
          }}>
            {lang === 'zh'
              ? '地图未配置：在 frontend/.env.local 设置 VITE_TENCENT_MAP_KEY'
              : 'Map not configured: set VITE_TENCENT_MAP_KEY in frontend/.env.local'}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
        padding: '10px 6px 16px', fontSize: 11, color: C.ink60,
      }}>
        {Object.values(STATUS).map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: s.dot }} />
            <span style={{ letterSpacing: lang === 'zh' ? 0.3 : 0 }}>{lang === 'zh' ? s.zh : s.en}</span>
          </div>
        ))}
      </div>

      <div style={{ paddingBottom: 100 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px 8px' }}>
          <SectionLabel lang={lang}>{t('nearby', lang)}</SectionLabel>
          <span style={{ fontSize: 11, color: C.ink40 }}>{schools.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {schools.map((s) => (
            <SchoolCard
              key={s.id}
              school={s}
              cityName={cityName}
              distanceKm={s.distanceKm}
              lang={lang}
              density="compact"
              onClick={() => onOpen(s.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ListView({ lang, schools, cityName, onOpen }) {
  const groups = {};
  schools.forEach((s) => { const k = campusStatus(s); (groups[k] = groups[k] || []).push(s); });
  return (
    <div style={{ padding: '12px 16px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {STATUS_ORDER.filter((o) => groups[o]).map((key) => {
        const s = STATUS[key];
        return (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 8px' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: s.dot }} />
              <SectionLabel lang={lang}>{lang === 'zh' ? s.zh : s.en}</SectionLabel>
              <span style={{ fontSize: 11, color: C.ink40 }}>· {groups[key].length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groups[key].map((school) => (
                <SchoolCard
                  key={school.id}
                  school={school}
                  cityName={cityName}
                  distanceKm={school.distanceKm}
                  lang={lang}
                  onClick={() => onOpen(school.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
      {schools.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.ink40, fontSize: 13 }}>
          {t('noMatch', lang)}
        </div>
      )}
    </div>
  );
}

function FilterSheet({ lang, statusFilter, facFilter, onToggleStatus, onToggleFac, onReset, onClose, resultsCount }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: 'rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.18s ease-out',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.paper, borderTopLeftRadius: 18, borderTopRightRadius: 18,
        padding: 20, paddingBottom: 28,
        animation: 'slideUp 0.22s ease-out',
      }}>
        <div style={{ width: 36, height: 4, background: C.ink20, borderRadius: 999, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: lang === 'zh' ? 0.6 : 0 }}>
            {t('filter', lang)}
          </div>
          <button onClick={onReset} type="button" style={{
            background: 'transparent', border: 0, color: C.ink60, fontSize: 13,
            cursor: 'pointer', letterSpacing: lang === 'zh' ? 0.3 : 0,
          }}>{t('reset', lang)}</button>
        </div>

        <SectionLabel lang={lang}>{t('filterStatus', lang)}</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 0 20px' }}>
          {Object.values(STATUS).map((s) => {
            const on = statusFilter.has(s.key);
            return (
              <button key={s.key} onClick={() => onToggleStatus(s.key)} type="button" style={{
                padding: '6px 12px',
                border: `1px solid ${on ? s.dot : C.line}`,
                background: on ? s.bg : C.card,
                color: on ? s.ink : C.ink,
                borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                letterSpacing: lang === 'zh' ? 0.3 : 0,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot }} />
                {lang === 'zh' ? s.zh : s.en}
              </button>
            );
          })}
        </div>

        <SectionLabel lang={lang}>{t('filterFac', lang)}</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 0 24px' }}>
          {Object.keys(FACILITIES).map((k) => {
            const on = facFilter.has(k);
            return (
              <button key={k} onClick={() => onToggleFac(k)} type="button" style={{
                padding: '6px 12px',
                border: `1px solid ${on ? C.ink : C.line}`,
                background: on ? C.ink : C.card,
                color: on ? C.paper : C.ink,
                borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                letterSpacing: lang === 'zh' ? 0.3 : 0,
              }}>
                <FacilityIcon kind={k} size={13} color={on ? C.paper : C.ink} />
                {lang === 'zh' ? FACILITIES[k].zh : FACILITIES[k].en}
              </button>
            );
          })}
        </div>

        <button onClick={onClose} type="button" style={{
          width: '100%', padding: 14, background: C.ink, color: C.paper,
          border: 0, borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          letterSpacing: lang === 'zh' ? 0.6 : 0,
        }}>
          {t('apply', lang)} <span style={{ opacity: 0.7, fontWeight: 400 }}>· {resultsCount} {t('results', lang)}</span>
        </button>
      </div>
    </div>
  );
}
