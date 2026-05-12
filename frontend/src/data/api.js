// HTTP client for the central backend.
// See docs/superpowers/specs/2026-05-12-backend-design.md for API contract.
// Paths are relative — Vite proxies /api/* to http://localhost:8080 in dev,
// same-origin in prod.

async function request(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const fetchCities = () =>
  request('/api/v1/cities').then((d) => d.cities);

export const fetchSchools = (cityId) =>
  request(cityId ? `/api/v1/schools?city=${encodeURIComponent(cityId)}` : '/api/v1/schools')
    .then((d) => d.schools);

export const fetchSchool = (id) =>
  request(`/api/v1/schools/${encodeURIComponent(id)}`).then((d) => d.school);
