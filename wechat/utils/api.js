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

function fetchSchools(cityId) {
  const q = cityId ? `?city=${encodeURIComponent(cityId)}` : '';
  return request('/api/v1/schools' + q).then((d) => d.schools);
}

function fetchSchool(id) {
  return request(`/api/v1/schools/${encodeURIComponent(id)}`).then((d) => d.school);
}

module.exports = { fetchCities, fetchSchools, fetchSchool };
