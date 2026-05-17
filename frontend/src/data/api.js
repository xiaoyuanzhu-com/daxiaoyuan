// HTTP client for the central backend.
// See docs/superpowers/specs/2026-05-12-backend-design.md for API contract.
// Paths are relative — Vite proxies /api/* to http://localhost:8080 in dev,
// same-origin in prod.

const ADMIN_TOKEN_KEY = 'ddxy_admin_token';

export const getAdminToken = () => {
  try { return localStorage.getItem(ADMIN_TOKEN_KEY) || ''; }
  catch { return ''; }
};

export const setAdminToken = (token) => {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch { /* storage unavailable, treat as ephemeral */ }
};

async function request(path, opts = {}) {
  const { auth, headers, ...rest } = opts;
  const finalHeaders = { ...(headers || {}) };
  if (auth) {
    const token = getAdminToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, { ...rest, headers: finalHeaders });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const fetchCities = () =>
  request('/api/v1/cities').then((d) => d.cities);

// Backend paginates with default size=10. Web frontend currently
// renders every school for the selected city in one shot, so we ask for
// the maximum page size (capped server-side at 50). Switch to true
// pagination if cities ever exceed 50 schools.
export const fetchSchools = (cityId) => {
  const params = ['size=50'];
  if (cityId) params.push(`city=${encodeURIComponent(cityId)}`);
  return request('/api/v1/schools?' + params.join('&')).then((d) => d.schools);
};

export const fetchSchool = (id) =>
  request(`/api/v1/schools/${encodeURIComponent(id)}`).then((d) => d.school);

export const updateSchool = (id, school) =>
  request(`/api/v1/schools/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(school),
    auth: true,
  }).then((d) => d.school);

export const createSchool = (school) =>
  request('/api/v1/schools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(school),
    auth: true,
  }).then((d) => d.school);

export const fetchRankings985 = () =>
  request('/api/v1/rankings/985');

export const fetchRankings211 = () =>
  request('/api/v1/rankings/211');

export const fetchRankingsC9 = () =>
  request('/api/v1/rankings/c9');

export const fetchRankingsQS30 = () =>
  request('/api/v1/rankings/qs30');
