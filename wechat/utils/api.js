// HTTP client for the central backend.
// See docs/superpowers/specs/2026-05-12-backend-design.md for API contract.

function url(path) {
  const app = getApp();
  return app.globalData.apiBase + path;
}

function request(path) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: url(path),
      method: 'GET',
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = (res.data && res.data.error) || `HTTP ${res.statusCode}`;
          reject(new Error(msg));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || 'request failed')),
    });
  });
}

function fetchCities() {
  return request('/api/v1/cities').then((d) => d.cities);
}

// Fetches one page of schools from the list endpoint. All four params are
// optional. Returns the full envelope: { schools, page, size, total,
// hasMore } — callers need `hasMore` for infinite-scroll termination.
function fetchSchools({ cityId, q, page, size } = {}) {
  const params = [];
  if (cityId) params.push(`city=${encodeURIComponent(cityId)}`);
  if (q)      params.push(`q=${encodeURIComponent(q)}`);
  if (page)   params.push(`page=${page}`);
  if (size)   params.push(`size=${size}`);
  const qs = params.length ? '?' + params.join('&') : '';
  return request('/api/v1/schools' + qs);
}

function fetchSchool(id) {
  return request(`/api/v1/schools/${encodeURIComponent(id)}`).then((d) => d.school);
}

module.exports = { fetchCities, fetchSchools, fetchSchool };
