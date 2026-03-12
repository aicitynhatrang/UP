/**
 * Geo utility service — distance, radius checks, geofencing.
 */
export class GeoService {
  constructor() {}

  /**
   * Haversine distance between two coords in meters
   */
  distanceMeters(lat1, lng1, lat2, lng2) {
    const R   = 6371000 // earth radius in meters
    const φ1  = (lat1 * Math.PI) / 180
    const φ2  = (lat2 * Math.PI) / 180
    const Δφ  = ((lat2 - lat1) * Math.PI) / 180
    const Δλ  = ((lng2 - lng1) * Math.PI) / 180
    const a   = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(a))
  }

  /**
   * Returns true if point is within radiusMeters of target
   */
  isWithinRadius(lat, lng, targetLat, targetLng, radiusMeters) {
    return this.distanceMeters(lat, lng, targetLat, targetLng) <= radiusMeters
  }

  /**
   * Detect impossible speed: two checkins too far apart in too little time.
   * @param {number} prevTimestamp - Unix ms
   * @param {number} nowTimestamp  - Unix ms
   * @param {number} distMeters
   * @param {number} maxKmIn5Min
   */
  isImpossibleSpeed(prevTimestamp, nowTimestamp, distMeters, maxKmIn5Min = 5) {
    const deltaMin = (nowTimestamp - prevTimestamp) / 60000
    if (deltaMin <= 0) return true
    const speedKmPerMin = (distMeters / 1000) / deltaMin
    return speedKmPerMin > (maxKmIn5Min / 5)
  }
}
