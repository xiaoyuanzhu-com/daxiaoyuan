import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { AppHeader } from '../components/AppHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { SectionLabel } from '../components/SectionLabel.jsx';
import { useApi } from '../hooks/useApi.js';
import { fetchSchool } from '../data/api.js';
import { STATUS, FACILITIES } from '../data/status.js';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { C, serif } from '../theme.js';

const FACILITY_ORDER = ['campus', 'library', 'track', 'gym', 'canteen'];

function buildFacilityRows(school, lang) {
  const main = FACILITY_ORDER.map((k) => {
    const f = school.facilities?.[k] || { status: 'closed', reservation: null };
    return {
      key: k,
      short: FACILITIES[k].short,
      label: lang === 'zh' ? FACILITIES[k].zh : FACILITIES[k].en,
      status: f.status,
      reservation: f.reservation || null,
    };
  });
  const others = (school.others || []).map((o, i) => ({
    key: `other:${o.kind || i}`,
    short: (o.name || '').charAt(0) || '·',
    label: o.name || o.kind || '',
    status: o.status,
    reservation: o.reservation || null,
  }));
  return [...main, ...others];
}

export default function DetailScreen() {
  const { lang } = useLang();
  const { id } = useParams();
  const { data: school, loading, error, retry } = useApi(
    () => fetchSchool(id),
    [id],
  );
  const [modal, setModal] = useState(null);

  if (loading) {
    return (
      <div style={{ background: C.paper, minHeight: '100%' }}>
        <AppHeader title={lang === 'zh' ? '加载中…' : 'Loading…'} />
        <div style={{ padding: 40, color: C.ink60, fontSize: 14, textAlign: 'center' }}>
          {lang === 'zh' ? '加载中…' : 'Loading…'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: C.paper, minHeight: '100%' }}>
        <AppHeader title={lang === 'zh' ? '加载失败' : 'Failed'} />
        <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ color: C.ink60, fontSize: 14 }}>{error.message}</div>
          <button onClick={retry} type="button" style={{
            background: C.ink, color: '#fff', padding: '8px 20px', border: 0,
            borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {lang === 'zh' ? '重试' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div style={{ background: C.paper, minHeight: '100%' }}>
        <AppHeader title={lang === 'zh' ? '未找到' : 'Not found'} />
        <div style={{ padding: 24, color: C.ink60, fontSize: 14 }}>
          {lang === 'zh' ? '没有这所学校。' : 'No such school.'}
        </div>
      </div>
    );
  }

  const name = school.name;

  return (
    <div style={{ background: C.paper, minHeight: '100%', paddingBottom: 120 }}>
      <AppHeader title={name} />

      {/* Hero — matches wechat detail: minimal, logo as transparent decoration */}
      <div style={{ padding: '12px 20px 28px', position: 'relative', overflow: 'hidden' }}>
        {school.logo ? (
          <img src={school.logo} alt=""
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{
              position: 'absolute', right: -20, top: -20, width: 180, height: 180,
              objectFit: 'contain', opacity: 0.18, pointerEvents: 'none',
            }} />
        ) : (
          <div style={{
            position: 'absolute', right: -20, top: -20, width: 180, height: 180,
            borderRadius: '50%', border: `1.5px solid ${C.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 70, fontWeight: 700, opacity: 0.10, pointerEvents: 'none',
            fontFamily: serif(lang),
          }}>{name.charAt(0)}</div>
        )}

        {school.address && (
          <div style={{
            display: 'inline-block', padding: '3px 8px',
            background: C.ink08, color: C.ink60,
            borderRadius: 4, fontSize: 11, fontWeight: 600,
            letterSpacing: lang === 'zh' ? 0.3 : 0, marginBottom: 12,
          }}>
            {school.address}
          </div>
        )}

        <div style={{
          fontSize: 28, fontWeight: 700, color: C.ink, lineHeight: 1.15,
          letterSpacing: lang === 'zh' ? 1 : 0,
          fontFamily: serif(lang),
        }}>{name}</div>

        <div style={{
          fontSize: 11, color: C.ink60, marginTop: 10,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {relativeTime(school.lastUpdate, lang)}
        </div>
      </div>

      {/* Facilities — all 5, campus first, with reservation CTA when bookable */}
      <DetailSection lang={lang} label={t('facilities', lang)}>
        <div style={{
          background: C.card, borderRadius: 12, border: `1px solid ${C.line}`,
          overflow: 'hidden',
        }}>
          {buildFacilityRows(school, lang).map((row, i) => {
            const fst = STATUS[row.status];
            const muted = row.status === 'closed';
            return (
              <div key={row.key} style={{
                display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 10,
                borderTop: i === 0 ? 'none' : `1px solid ${C.line}`,
              }}>
                <div style={{
                  flex: 1, fontSize: 14, color: muted ? C.ink40 : C.ink,
                  letterSpacing: lang === 'zh' ? 0.3 : 0,
                }}>{row.label}</div>
                {row.reservation ? (
                  <button type="button"
                    onClick={() => setModal({
                      title: lang === 'zh' ? `${row.label}预约` : `${row.label} reservation`,
                      ...row.reservation,
                    })}
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '3px 8px', fontSize: 11, fontWeight: 600,
                      letterSpacing: lang === 'zh' ? 0.3 : 0, lineHeight: 1.1,
                      borderRadius: 4, background: fst.bg, color: fst.ink,
                      border: 0, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {lang === 'zh' ? fst.zh : fst.en}
                  </button>
                ) : (
                  <StatusBadge status={row.status} lang={lang} size="sm" />
                )}
              </div>
            );
          })}
        </div>
      </DetailSection>

      {modal && <ReservationModal lang={lang} modal={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function DetailSection({ lang, label, children }) {
  return (
    <div style={{ padding: '20px 16px 4px' }}>
      <div style={{ paddingBottom: 12 }}>
        <SectionLabel lang={lang}>{label}</SectionLabel>
      </div>
      {children}
    </div>
  );
}

function ReservationModal({ lang, modal, onClose }) {
  const { title, qrcodeUrl, url, hint, link, officialAccount, miniProgram } = modal;
  const qrTarget = url || link || null;
  const copy = (value) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(26,24,21,0.55)',
      zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, background: '#fff',
        borderRadius: '16px 16px 0 0',
        padding: '24px 24px calc(28px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          fontSize: 16, fontWeight: 700, color: C.ink,
          letterSpacing: lang === 'zh' ? 0.5 : 0, marginBottom: 18,
        }}>{title}</div>

        {qrcodeUrl ? (
          <>
            <img src={qrcodeUrl} alt="" style={{
              width: 220, height: 220, objectFit: 'contain',
              background: C.ink08, borderRadius: 8,
            }} />
            <div style={{
              marginTop: 10, fontSize: 12, color: C.ink60,
              letterSpacing: lang === 'zh' ? 0.4 : 0, textAlign: 'center',
            }}>
              {lang === 'zh' ? '长按或右键保存二维码到本地' : 'Long-press or right-click to save'}
            </div>
          </>
        ) : qrTarget ? (
          <div style={{
            width: 220, height: 220, background: '#fff', borderRadius: 8,
            padding: 10, boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${C.line}`,
          }}>
            <QRCodeSVG value={normalizeUrl(qrTarget)} size={200} level="M" />
          </div>
        ) : null}

        {hint && (
          <div style={{
            marginTop: 14, fontSize: 13, color: C.ink, lineHeight: 1.55,
            letterSpacing: lang === 'zh' ? 0.3 : 0, textAlign: 'center',
          }}>{hint}</div>
        )}

        {officialAccount && (
          <ModalKV lang={lang}
            label={lang === 'zh' ? '公众号' : 'Official account'}
            value={officialAccount}
            onCopy={() => copy(officialAccount)} />
        )}
        {miniProgram && (
          <ModalKV lang={lang}
            label={lang === 'zh' ? '小程序' : 'Mini program'}
            value={miniProgram}
            onCopy={() => copy(miniProgram)} />
        )}

        {link && (
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <a href={link} target="_blank" rel="noopener noreferrer" style={{
              padding: '10px 22px', border: `1px solid ${C.ink20}`,
              borderRadius: 6, fontSize: 13, color: C.ink,
              textDecoration: 'none', letterSpacing: lang === 'zh' ? 0.3 : 0,
            }}>{lang === 'zh' ? '打开链接' : 'Open link'}</a>
            <button type="button" onClick={() => copy(link)} style={{
              padding: '10px 22px', border: `1px solid ${C.ink20}`,
              borderRadius: 6, fontSize: 13, color: C.ink, background: 'transparent',
              cursor: 'pointer', fontFamily: 'inherit',
              letterSpacing: lang === 'zh' ? 0.3 : 0,
            }}>{lang === 'zh' ? '复制链接' : 'Copy link'}</button>
          </div>
        )}

        <button type="button" onClick={onClose} style={{
          marginTop: 20, fontSize: 13, color: C.ink60,
          background: 'transparent', border: 0, cursor: 'pointer',
          letterSpacing: lang === 'zh' ? 0.3 : 0, fontFamily: 'inherit',
        }}>{lang === 'zh' ? '关闭' : 'Close'}</button>
      </div>
    </div>
  );
}

function ModalKV({ lang, label, value, onCopy }) {
  return (
    <div style={{
      marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', background: 'rgba(26,24,21,0.04)', borderRadius: 8,
      boxSizing: 'border-box',
    }}>
      <div style={{
        fontSize: 11, color: C.ink60, letterSpacing: 0.3, flexShrink: 0,
      }}>{label}</div>
      <div style={{
        flex: 1, fontSize: 14, color: C.ink, fontWeight: 600,
        letterSpacing: lang === 'zh' ? 0.3 : 0, wordBreak: 'break-all',
      }}>{value}</div>
      <button type="button" onClick={onCopy} style={{
        padding: '5px 12px', fontSize: 12, fontWeight: 600,
        letterSpacing: lang === 'zh' ? 0.3 : 0, lineHeight: 1.1,
        borderRadius: 4, background: C.ink, color: '#fff', border: 0,
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
      }}>{lang === 'zh' ? '复制' : 'Copy'}</button>
    </div>
  );
}

function normalizeUrl(u) {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function relativeTime(iso, lang) {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  const min = 60, hour = 3600, day = 86400, week = day * 7;
  if (lang === 'zh') {
    if (diffSec < hour)      return `${Math.max(1, Math.floor(diffSec / min))} 分钟前更新`;
    if (diffSec < day)       return `${Math.floor(diffSec / hour)} 小时前更新`;
    if (diffSec < week)      return `${Math.floor(diffSec / day)} 天前更新`;
    return `${Math.floor(diffSec / week)} 周前更新`;
  }
  if (diffSec < hour)        return `Updated ${Math.max(1, Math.floor(diffSec / min))}m ago`;
  if (diffSec < day)         return `Updated ${Math.floor(diffSec / hour)}h ago`;
  if (diffSec < week)        return `Updated ${Math.floor(diffSec / day)}d ago`;
  return `Updated ${Math.floor(diffSec / week)}w ago`;
}
