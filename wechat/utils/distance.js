// Haversine — km between two GCJ-02 lat/lng points. Both ends must use
// the same coordinate system (we use GCJ-02 throughout — wx.getLocation
// returns GCJ-02 when type='gcj02', and school lat/lng from backend are GCJ-02).

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = { distanceKm };
