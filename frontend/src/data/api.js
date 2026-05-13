// HTTP client for the central backend.
// See docs/superpowers/specs/2026-05-12-backend-design.md for API contract.
// Paths are relative — Vite proxies /api/* to http://localhost:8080 in dev,
// same-origin in prod.

async function request(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
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
  }).then((d) => d.school);

export const createSchool = (school) =>
  request('/api/v1/schools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(school),
  }).then((d) => d.school);
