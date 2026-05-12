// Haversine — km between two GCJ-02 lat/lng points.
// Note: browser navigator.geolocation returns WGS84, backend stores GCJ-02.
// For mainland China km-scale distance display, the ~500m offset is
// negligible. Worth a proper conversion if/when a real map library lands.

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
