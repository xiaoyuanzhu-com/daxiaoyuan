import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { FacilityIcon } from '../components/FacilityIcon.jsx';
import { BigButton, Spacer, FormQuestion } from '../components/Form.jsx';
import { SCHOOLS, findSchool } from '../data/seed.js';
import { STATUS, FACILITIES } from '../data/status.js';
import { t } from '../data/i18n.js';
import { useLang } from '../context/LangContext.jsx';
import { C, serif } from '../theme.js';

export default function UpdateFormScreen() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { id: schoolId } = useParams();

  const [step, setStep] = useState(schoolId ? 1 : 0);
  const [selectedSchool, setSelectedSchool] = useState(schoolId || null);
  const [status, setStatus] = useState(null);
  const [facs, setFacs] = useState({});
  const [note, setNote] = useState('');

  const school = findSchool(selectedSchool);

  const backTitle = step === 4 ? '' : t('iveBeen', lang);

  const handleBack = () => {
    if (step === 0 || (step === 1 && !schoolId)) return navigate(-1);
    if (step === 4) return navigate('/');
    setStep(step - 1);
  };

  const onDone = () => navigate('/');

  const stepNum = (offset) => (schoolId ? offset : offset + 1);
  const stepKicker = (n, total = 4) =>
    lang === 'zh' ? `第 ${n} 步 · 共 ${total} 步` : `Step ${n} of ${total}`;

  return (
    <div style={{ background: C.paper, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppHeader title={backTitle} onBack={handleBack} accent={C.paper} />

      {step < 4 && (
        <div style={{ padding: '8px 16px 4px', display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3].slice(schoolId ? 1 : 0).map((i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? C.ink : C.ink20,
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
      )}

      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
        {step === 0 && (
          <>
            <FormQuestion lang={lang}
              kicker={stepKicker(1)}
              title={t('stepPickSchool', lang)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
              {SCHOOLS.map((s) => (
                <button key={s.id} onClick={() => { setSelectedSchool(s.id); setStep(1); }} type="button" style={{
                  background: C.card, border: `1px solid ${C.line}`, borderRadius: 10,
                  padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: 'inherit',
                }}>
                  <div>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: C.ink,
                      letterSpacing: lang === 'zh' ? 0.4 : 0,
                    }}>{lang === 'zh' ? s.zh : s.en}</div>
                    <div style={{ fontSize: 11, color: C.ink40, marginTop: 2 }}>
                      {lang === 'zh' ? s.district.zh : s.district.en}
                    </div>
                  </div>
                  <StatusBadge status={s.status} lang={lang} size="sm" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && school && (
          <>
            <SchoolHeader school={school} lang={lang} />
            <FormQuestion lang={lang}
              kicker={stepKicker(stepNum(1))}
              title={t('stepStatus', lang)}
              sub={t('basedOn', lang)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
              {Object.values(STATUS).map((s) => (
                <button key={s.key} onClick={() => setStatus(s.key)} type="button" style={{
                  background: status === s.key ? s.bg : C.card,
                  border: `1.5px solid ${status === s.key ? s.dot : C.line}`,
                  borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  fontFamily: 'inherit',
                }}>
                  <span style={{ width: 12, height: 12, borderRadius: 999, background: s.dot, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 15, fontWeight: 600,
                      color: status === s.key ? s.ink : C.ink,
                      letterSpacing: lang === 'zh' ? 0.5 : 0,
                    }}>{lang === 'zh' ? s.zh : s.en}</div>
                  </div>
                  {status === s.key && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l5 5 9-11" stroke={s.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <Spacer />
            <BigButton onClick={() => setStep(2)} disabled={!status} lang={lang}>{t('next', lang)}</BigButton>
          </>
        )}

        {step === 2 && school && (
          <>
            <SchoolHeader school={school} lang={lang} />
            <FormQuestion lang={lang}
              kicker={stepKicker(stepNum(2))}
              title={t('stepFacility', lang)}
              sub={t('cycleHint', lang)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
              {Object.keys(FACILITIES).map((k) => {
                const state = facs[k] || 'unsure';
                const cycle = state === 'unsure' ? 'open' : state === 'open' ? 'closed' : 'unsure';
                const bg = state === 'open' ? STATUS.open.bg : state === 'closed' ? STATUS.closed.bg : C.card;
                const dot = state === 'open' ? STATUS.open.dot : state === 'closed' ? STATUS.closed.dot : C.ink20;
                const label = state === 'open' ? t('facOpen', lang)
                  : state === 'closed' ? t('facClosed', lang)
                  : t('facUnsure', lang);
                return (
                  <button key={k} onClick={() => setFacs((prev) => ({ ...prev, [k]: cycle }))} type="button" style={{
                    background: bg, border: `1px solid ${state === 'unsure' ? C.line : dot}`,
                    borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                    fontFamily: 'inherit',
                  }}>
                    <FacilityIcon kind={k} size={20} color={C.ink} />
                    <div style={{
                      flex: 1, fontSize: 15, fontWeight: 500, color: C.ink,
                      letterSpacing: lang === 'zh' ? 0.4 : 0,
                    }}>{lang === 'zh' ? FACILITIES[k].zh : FACILITIES[k].en}</div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                      color: C.ink60, letterSpacing: lang === 'zh' ? 0.3 : 0,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: dot }} />
                      {label}
                    </div>
                  </button>
                );
              })}
            </div>
            <Spacer />
            <BigButton onClick={() => setStep(3)} lang={lang}>{t('next', lang)}</BigButton>
          </>
        )}

        {step === 3 && school && (
          <>
            <SchoolHeader school={school} lang={lang} />
            <FormQuestion lang={lang}
              kicker={stepKicker(stepNum(3))}
              title={t('stepDetail', lang)}
              sub={t('optional', lang)} />
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={t('placeholder', lang)} style={{
                marginTop: 20, width: '100%', minHeight: 140, padding: 14,
                background: C.card, border: `1px solid ${C.line}`, borderRadius: 10,
                fontSize: 14, color: C.ink, fontFamily: 'inherit', resize: 'none',
                letterSpacing: lang === 'zh' ? 0.3 : 0, lineHeight: 1.55,
                boxSizing: 'border-box', outline: 'none',
              }} />
            <div style={{
              marginTop: 16, padding: 14, background: 'rgba(91,161,60,0.08)',
              border: '1px solid rgba(91,161,60,0.25)', borderRadius: 10,
              fontSize: 12, color: C.ink60, lineHeight: 1.55,
              letterSpacing: lang === 'zh' ? 0.3 : 0,
            }}>
              <strong style={{ color: C.ink }}>{t('transparency', lang)}</strong>
              {' · '}{t('transparencyBody', lang)}
            </div>
            <Spacer />
            <BigButton onClick={() => setStep(4)} lang={lang}>{t('submit', lang)}</BigButton>
          </>
        )}

        {step === 4 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', textAlign: 'center', paddingTop: 0,
          }}>
            <div style={{
              width: 84, height: 84, borderRadius: 999,
              background: STATUS.open.bg, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 24,
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-11" stroke={STATUS.open.ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{
              fontSize: 24, fontWeight: 700, color: C.ink,
              letterSpacing: lang === 'zh' ? 1 : 0,
              fontFamily: serif(lang),
            }}>{t('stepThanks', lang)}</div>
            <div style={{
              fontSize: 14, color: C.ink60, marginTop: 8, maxWidth: 280, lineHeight: 1.5,
              letterSpacing: lang === 'zh' ? 0.3 : 0,
            }}>{t('stepThanksSub', lang)}</div>
            <div style={{
              marginTop: 32, padding: '12px 16px', background: C.card,
              border: `1px solid ${C.line}`, borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999,
                background: C.ink, color: C.paper,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>
                {school?.confirms ? school.confirms + 1 : '+1'}
              </div>
              <div style={{
                fontSize: 12, color: C.ink60, lineHeight: 1.4,
                letterSpacing: lang === 'zh' ? 0.3 : 0, textAlign: 'left',
              }}>{t('thisWeekRank', lang)}</div>
            </div>
            <Spacer />
            <BigButton onClick={onDone} lang={lang}>{t('done', lang)}</BigButton>
          </div>
        )}
      </div>
    </div>
  );
}

function SchoolHeader({ school, lang }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 8px',
      borderBottom: `1px solid ${C.line}`, marginBottom: 4,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: STATUS[school.status].bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, color: STATUS[school.status].ink,
        fontFamily: 'serif',
      }}>
        {lang === 'zh' ? school.zh.charAt(0) : school.short.charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: C.ink,
          letterSpacing: lang === 'zh' ? 0.4 : 0, lineHeight: 1.2,
        }}>{lang === 'zh' ? school.zh : school.en}</div>
        <div style={{ fontSize: 11, color: C.ink40, marginTop: 2 }}>
          {lang === 'zh' ? school.district.zh : school.district.en}
        </div>
      </div>
    </div>
  );
}
