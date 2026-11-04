import axios from 'axios';
import { haversineDistance, estimateEta } from '../../utils/haversine';
import { logger } from '../../utils/logger';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  points: RoutePoint[];
  distanceKm: number;
  durationMinutes: number;
  isMock: boolean;
}

// ── OSRM public demo server — free, no API key, real OSM roads ──────────────
// Uses the car profile (driving).
const OSRM_BASE = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
const OSRM_ENABLED = process.env.DISABLE_OSRM !== 'true';

// Google Routes API (optional — set GOOGLE_MAPS_API_KEY to use)
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const USE_GOOGLE = process.env.MOCK_ROUTING !== 'true' &&
  GOOGLE_KEY &&
  GOOGLE_KEY !== 'API_HERE';

/**
 * Get a real road route between two coordinates.
 *
 * Priority:
 *   1. Google Routes API  (if GOOGLE_MAPS_API_KEY is set and MOCK_ROUTING=false)
 *   2. OSRM public server (free, no key, real OSM road geometry)  ← default
 *   3. Straight-line fallback (only if both above fail)
 */
export async function getRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  // 1. Google Routes API
  if (USE_GOOGLE) {
    try {
      return await getGoogleRoute(originLat, originLng, destLat, destLng);
    } catch (err) {
      logger.warn('[Routing] Google API failed, falling back to OSRM');
    }
  }

  // 2. OSRM (real road routing, free)
  if (OSRM_ENABLED) {
    try {
      return await getOSRMRoute(originLat, originLng, destLat, destLng);
    } catch (err) {
      logger.warn('[Routing] OSRM failed, falling back to straight-line:', err);
    }
  }

  // 3. Last-resort straight-line fallback
  return getStraightLineRoute(originLat, originLng, destLat, destLng);
}

// ── OSRM ─────────────────────────────────────────────────────────────────────

async function getOSRMRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  // OSRM expects lng,lat order
  const url =
    `${OSRM_BASE}/route/v1/driving/` +
    `${originLng},${originLat};${destLng},${destLat}` +
    `?overview=full&geometries=geojson&steps=false`;

  const response = await axios.get(url, { timeout: 8000 });

  if (response.data?.code !== 'Ok') {
    throw new Error(`OSRM error: ${response.data?.code}`);
  }

  const route = response.data.routes?.[0];
  if (!route) throw new Error('OSRM returned no route');

  const distanceKm = route.distance / 1000;
  const durationMinutes = route.duration / 60;

  // GeoJSON coordinates are [lng, lat] — convert to {lat, lng}
  const points: RoutePoint[] = (route.geometry.coordinates as [number, number][]).map(
    ([lng, lat]) => ({ lat, lng })
  );
  if (points.length < 2) throw new Error('OSRM returned insufficient route geometry');

  logger.info(
    `[OSRM] Route: ${distanceKm.toFixed(2)} km, ${durationMinutes.toFixed(1)} min, ${points.length} waypoints`
  );

  return { points, distanceKm, durationMinutes, isMock: false };
}

// ── Google Routes API ─────────────────────────────────────────────────────────

async function getGoogleRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  const response = await axios.post(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
      destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      routeModifiers: { avoidHighways: false, avoidTolls: false },
      languageCode: 'en-US',
      units: 'METRIC',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      timeout: 10000,
    }
  );

  const route = response.data?.routes?.[0];
  if (!route) throw new Error('No route from Google');

  const distanceKm = (route.distanceMeters || 0) / 1000;
  const durationMinutes = parseInt(route.duration?.replace('s', '') || '0', 10) / 60;
  const points = decodePolyline(route.polyline?.encodedPolyline || '');
  if (points.length < 2) throw new Error('Google returned insufficient route geometry');

  return { points, distanceKm, durationMinutes, isMock: false };
}

// ── Straight-line fallback (last resort only) ─────────────────────────────────

function getStraightLineRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): RouteResult {
  const distanceKm = haversineDistance(originLat, originLng, destLat, destLng) * 1.3;
  const durationMinutes = estimateEta(distanceKm, 40);
  const numPoints = Math.max(10, Math.round(distanceKm * 6));
  const points: RoutePoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    points.push({
      lat: originLat + (destLat - originLat) * t,
      lng: originLng + (destLng - originLng) * t,
    });
  }

  logger.warn('[Routing] Using straight-line fallback — OSRM unavailable');
  return { points, distanceKm, durationMinutes, isMock: true };
}

// Kept for roaming simulation (random movement between two points, not shown on map)
export function getMockRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): RouteResult {
  return getStraightLineRoute(originLat, originLng, destLat, destLng);
}

// ── Polyline decoder (Google Maps encoded polyline format) ────────────────────

function decodePolyline(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let b: number;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
