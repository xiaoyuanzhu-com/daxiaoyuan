import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.jsx';
import { useApi } from '../hooks/useApi.js';
import { fetchSchool, fetchCities, updateSchool, createSchool } from '../data/api.js';
import { STATUS, FACILITIES, STATUS_ORDER } from '../data/status.js';
import { C } from '../theme.js';

// EditScreen — handles both edit (/s/:id/edit) and create (/s/new).
// No auth, no audit. In create mode id + cityId are editable; in edit mode
// they are locked. `others` round-trips unchanged in both modes.
export default function EditScreen() {
  const { id } = useParams();
  const isCreate = !id;
  const navigate = useNavigate();

  const { data: loaded, loading, error, retry } = useApi(
    () => (isCreate ? Promise.resolve(blankSchool()) : fetchSchool(id)),
    [id, isCreate],
  );
  const { data: cities } = useApi(
    () => (isCreate ? fetchCities() : Promise.resolve(null)),
    [isCreate],
  );

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (loaded) setForm(JSON.parse(JSON.stringify(loaded)));
  }, [loaded]);

  if (loading) return <Shell title="加载中…"><Note>加载中…</Note></Shell>;
  if (error) return (
    <Shell title="加载失败">
      <Note>{error.message}</Note>
      <button type="button" onClick={retry} style={btnSecondary}>重试</button>
    </Shell>
  );
  if (!form) return <Shell title="未找到"><Note>没有这所学校。</Note></Shell>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      if (isCreate) {
        const created = await createSchool(form);
        navigate(`/s/${created.id}`);
      } else {
        await updateSchool(id, form);
        navigate(`/s/${id}`);
      }
    } catch (err) {
      setSaveError(err.message || (isCreate ? '创建失败' : '保存失败'));
      setSaving(false);
    }
  };

  // Switching city in create mode auto-fills lat/lng to that city's center
  // as a starting point — user can override.
  const handleCityChange = (newCityId) => {
    const city = (cities || []).find((c) => c.id === newCityId);
    setForm({
      ...form,
      cityId: newCityId,
      ...(city ? { lat: city.lat, lng: city.lng } : {}),
    });
  };

  const title = isCreate ? '新建学校' : `编辑 · ${form.name || id}`;
  const cancelTo = isCreate ? '/' : `/s/${id}`;

  return (
    <Shell title={title}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {isCreate && (
          <>
            <Field label="学校 ID（slug，小写英文 / 数字 / 连字符）">
              <input type="text" value={form.id} required pattern="[a-z0-9-]+"
                placeholder="例如 pku、tsinghua、bnu"
                onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().trim() })}
                style={inputStyle} />
              <Hint>取学校官网 https://www.&lt;X&gt;.edu.cn 中的 &lt;X&gt;。</Hint>
            </Field>
            <Field label="城市">
              <select value={form.cityId} required
                onChange={(e) => handleCityChange(e.target.value)}
                style={inputStyle}>
                {(cities || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.active ? '' : '（未上线）'}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {!isCreate && (
          <Field label="ID · 城市">
            <div style={{ ...inputStyle, color: C.ink60, background: C.paperAlt || C.card }}>
              {form.id} · {form.cityId}
            </div>
          </Field>
        )}

        <Field label="学校名">
          <input type="text" value={form.name} required
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={inputStyle} />
        </Field>
        <Field label="校徽 URL">
          <input type="text" value={form.logo || ''} placeholder="https://…/logo.svg"
            onChange={(e) => setForm({ ...form, logo: e.target.value })}
            style={inputStyle} />
          {form.logo && (
            <img src={form.logo} alt="logo preview" style={{
              width: 56, height: 56, objectFit: 'contain', marginTop: 6,
              border: `1px solid ${C.line}`, borderRadius: 4, alignSelf: 'flex-start',
              background: C.card,
            }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          )}
        </Field>
        <Field label="地址">
          <input type="text" value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            style={inputStyle} />
        </Field>
        <Field label="坐标">
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" step="any" value={form.lat} required
              onChange={(e) => setForm({ ...form, lat: parseFloat(e.target.value) })}
              style={{ ...inputStyle, flex: 1 }} placeholder="纬度 lat" />
            <input type="number" step="any" value={form.lng} required
              onChange={(e) => setForm({ ...form, lng: parseFloat(e.target.value) })}
              style={{ ...inputStyle, flex: 1 }} placeholder="经度 lng" />
          </div>
        </Field>

        <Section title="学校开放状态">
          <StatusPicker value={form.status}
            onChange={(v) => setForm({ ...form, status: v })} />
          <ReservationFields
            value={form.reservation}
            onChange={(r) => setForm({ ...form, reservation: r })} />
        </Section>

        <Section title="设施">
          {Object.keys(FACILITIES).map((k) => {
            const f = form.facilities[k] || { status: 'closed', reservation: null };
            return (
              <div key={k} style={{
                padding: 12, background: C.card, borderRadius: 8,
                border: `1px solid ${C.line}`, display: 'flex',
                flexDirection: 'column', gap: 10,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
                  {FACILITIES[k].zh}
                </div>
                <StatusPicker value={f.status}
                  onChange={(v) => setForm({
                    ...form,
                    facilities: { ...form.facilities, [k]: { ...f, status: v } },
                  })} />
                <ReservationFields
                  value={f.reservation}
                  onChange={(r) => setForm({
                    ...form,
                    facilities: { ...form.facilities, [k]: { ...f, reservation: r } },
                  })} />
              </div>
            );
          })}
        </Section>

        {saveError && <Note tone="error">{saveError}</Note>}

        <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
          <button type="button" onClick={() => navigate(cancelTo)}
            disabled={saving} style={{ ...btnSecondary, flex: 1 }}>
            取消
          </button>
          <button type="submit" disabled={saving}
            style={{ ...btnPrimary, flex: 2, opacity: saving ? 0.6 : 1 }}>
            {saving ? '保存中…' : (isCreate ? '创建' : '保存')}
          </button>
        </div>
      </form>
    </Shell>
  );
}

function blankSchool() {
  return {
    id: '',
    cityId: 'bj',
    name: '',
    logo: '',
    address: '',
    lat: 39.96,
    lng: 116.34,
    status: 'open',
    reservation: null,
    facilities: {
      library: { status: 'closed', reservation: null },
      track:   { status: 'closed', reservation: null },
      gym:     { status: 'closed', reservation: null },
      canteen: { status: 'closed', reservation: null },
    },
    others: [],
  };
}

function Shell({ title, children }) {
  return (
    <div style={{ background: C.paper, minHeight: '100%', paddingBottom: 60 }}>
      <AppHeader title={title} />
      <div style={{ padding: '16px 16px 24px' }}>{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: C.ink40, letterSpacing: 1,
      }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.ink40, letterSpacing: 1 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Hint({ children }) {
  return <span style={{ fontSize: 11, color: C.ink60 }}>{children}</span>;
}

function StatusPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {STATUS_ORDER.map((k) => {
        const s = STATUS[k];
        const selected = value === k;
        return (
          <button key={k} type="button" onClick={() => onChange(k)} style={{
            padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            background: selected ? s.bg : C.card,
            color: selected ? s.ink : C.ink60,
            border: `1px solid ${selected ? s.ink : C.line}`,
          }}>{s.zh}</button>
        );
      })}
    </div>
  );
}

// Reservation block — three optional fields. Empty hint+url+link → null on save.
function ReservationFields({ value, onChange }) {
  const r = value || { qrcodeUrl: '', hint: '', link: '' };
  const update = (patch) => {
    const next = { ...r, ...patch };
    const empty = !next.qrcodeUrl && !next.hint && !next.link;
    onChange(empty ? null : next);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input type="text" value={r.qrcodeUrl || ''} placeholder="预约二维码图片 URL"
        onChange={(e) => update({ qrcodeUrl: e.target.value })} style={inputStyle} />
      <input type="text" value={r.hint || ''} placeholder="预约提示文案"
        onChange={(e) => update({ hint: e.target.value })} style={inputStyle} />
      <input type="text" value={r.link || ''} placeholder="预约入口链接（可选）"
        onChange={(e) => update({ link: e.target.value })} style={inputStyle} />
      {r.qrcodeUrl && (
        <img src={r.qrcodeUrl} alt="QR preview" style={{
          width: 80, height: 80, objectFit: 'contain',
          border: `1px solid ${C.line}`, borderRadius: 4, alignSelf: 'flex-start',
        }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      )}
    </div>
  );
}

function Note({ children, tone }) {
  return (
    <div style={{
      padding: 12, fontSize: 13,
      color: tone === 'error' ? C.alert : C.ink60,
      background: tone === 'error' ? 'rgba(180,58,40,0.08)' : 'transparent',
      borderRadius: 6, textAlign: 'center',
    }}>{children}</div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 14,
  border: `1px solid ${C.line}`, borderRadius: 6, background: C.card,
  color: C.ink, fontFamily: 'inherit', boxSizing: 'border-box',
};

const btnPrimary = {
  padding: '12px 16px', borderRadius: 8, border: 0,
  background: C.ink, color: C.paper, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};

const btnSecondary = {
  padding: '12px 16px', borderRadius: 8,
  background: C.card, color: C.ink, fontSize: 14, fontWeight: 600,
  border: `1px solid ${C.line}`, cursor: 'pointer', fontFamily: 'inherit',
};
