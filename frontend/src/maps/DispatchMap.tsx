import React, { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Ambulance, EmergencyRequest, Dispatch, RoutePoint } from '../types';
import StatusBadge from '../components/StatusBadge';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createAmbulanceIcon(status: string): L.DivIcon {
  const color =
    status === 'AVAILABLE' ? '#16A34A' :
    status === 'ASSIGNED'  ? '#F97316' :
    status === 'EN_ROUTE'  ? '#3B82F6' :
    status === 'ON_SCENE'  ? '#A855F7' :
    '#6B7280';

  const pulse = status === 'EN_ROUTE' || status === 'ASSIGNED';

  return L.divIcon({
    html: `<div style="
      background:${color};
      border:2.5px solid white;
      border-radius:50%;
      width:30px;height:30px;
      display:flex;align-items:center;justify-content:center;
      font-size:15px;
      box-shadow:0 2px 8px rgba(0,0,0,0.6);
      ${pulse ? 'animation:dispatch-pulse 1.4s ease-in-out infinite;' : ''}
    ">🚑</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

function createEmergencyIcon(priority: string): L.DivIcon {
  const color =
    priority === 'CRITICAL' ? '#EF4444' :
    priority === 'HIGH'     ? '#F97316' :
    priority === 'MEDIUM'   ? '#EAB308' :
    '#6B7280';

  return L.divIcon({
    html: `<div style="
      background:${color};
      border:2.5px solid white;
      border-radius:50%;
      width:34px;height:34px;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
      box-shadow:0 0 16px ${color}99;
      animation:emergency-pulse 1.1s ease-in-out infinite;
    ">🆘</div>`,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
}

interface Props {
  ambulances: Ambulance[];
  emergencies: EmergencyRequest[];
  activeDispatches: Dispatch[];
  center?: [number, number];
  zoom?: number;
}

function FitBoundsController({
  ambulances,
  emergencies,
}: {
  ambulances: Ambulance[];
  emergencies: EmergencyRequest[];
}) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (didFit.current) return;
    const points: [number, number][] = [
      ...ambulances.map((a): [number, number] => [a.latitude, a.longitude]),
      ...emergencies.map((e): [number, number] => [e.latitude, e.longitude]),
    ];
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 15 });
      didFit.current = true;
    }
  }, [ambulances, emergencies, map]);

  return null;
}

/**
 * Trim already-travelled portion of route so the polyline shrinks as the
 * ambulance moves. We find the closest waypoint to the ambulance's current
 * position and only draw from there onward.
 */
function trimRoute(
  route: RoutePoint[],
  ambulanceLat: number,
  ambulanceLng: number
): RoutePoint[] {
  if (route.length < 2) return route;

  let closestIdx = 0;
  let closestDist = Infinity;

  for (let i = 0; i < route.length; i++) {
    const dlat = route[i].lat - ambulanceLat;
    const dlng = route[i].lng - ambulanceLng;
    const d = Math.sqrt(dlat * dlat + dlng * dlng);
    if (d < closestDist) {
      closestDist = d;
      closestIdx = i;
    }
  }

  // Return from current position onward (including a point at ambulance position)
  const remaining = route.slice(closestIdx);
  return [{ lat: ambulanceLat, lng: ambulanceLng }, ...remaining];
}

export default function DispatchMap({
  ambulances,
  emergencies,
  activeDispatches,
  center,
  zoom,
}: Props) {
  const mapCenter: [number, number] = center || [28.605, 77.065];

  // Quick lookup: ambulanceId → dispatch
  const dispatchByAmbulance: Record<string, Dispatch> = {};
  for (const d of activeDispatches) {
    dispatchByAmbulance[d.ambulanceId] = d;
  }

  // Quick lookup: ambulanceId → current position (from ambulances prop)
  const ambulancePos: Record<string, { lat: number; lng: number }> = {};
  for (const a of ambulances) {
    ambulancePos[a.id] = { lat: a.latitude, lng: a.longitude };
  }

  const activeEmergencyIds = new Set(activeDispatches.map((d) => d.emergencyId));
  const activeEmergencies = emergencies.filter(
    (e) =>
      activeEmergencyIds.has(e.id) ||
      ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'WAITING_FOR_AMBULANCE'].includes(e.status)
  );

  return (
    <>
      <style>{`
        @keyframes dispatch-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.75; }
        }
        @keyframes emergency-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 8px currentColor; }
          50% { transform: scale(1.2); box-shadow: 0 0 20px currentColor; }
        }
      `}</style>

      <MapContainer
        center={mapCenter}
        zoom={zoom || 13}
        style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBoundsController ambulances={ambulances} emergencies={activeEmergencies} />

        {/* ── Active dispatch routes ── */}
        {activeDispatches.map((d) => {
          const fullRoute = d.route as unknown as RoutePoint[] | null;
          if (!fullRoute || fullRoute.length < 2) return null;

          const pos = ambulancePos[d.ambulanceId];
          // Trim the already-passed portion so the line moves with the ambulance
          const remaining = pos
            ? trimRoute(fullRoute, pos.lat, pos.lng)
            : fullRoute;

          if (remaining.length < 2) return null;

          const positions: [number, number][] = remaining.map((p) => [p.lat, p.lng]);

          return (
            <React.Fragment key={`route-${d.id}`}>
              {/* Glow shadow layer */}
              <Polyline
                positions={positions}
                color="#93C5FD"
                weight={8}
                opacity={0.25}
              />
              {/* Main route line */}
              <Polyline
                positions={positions}
                color="#3B82F6"
                weight={4}
                opacity={0.9}
                dashArray="10 5"
              />
            </React.Fragment>
          );
        })}

        {/* ── Ambulance markers ── */}
        {ambulances.map((amb) => {
          const dispatch = dispatchByAmbulance[amb.id];
          return (
            <Marker
              key={amb.id}
              position={[amb.latitude, amb.longitude]}
              icon={createAmbulanceIcon(amb.status)}
            >
              <Popup>
                <div style={{ minWidth: 170, color: '#fff', background: '#1E293B', padding: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{amb.name}</div>
                  <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>{amb.vehicleNumber}</div>
                  <StatusBadge status={amb.status} />
                  {dispatch && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#60A5FA' }}>
                      ⏱️ ETA: <b>{dispatch.currentEtaMinutes?.toFixed(0)}</b> min
                      <br />
                      📏 {dispatch.distanceKm?.toFixed(1)} km
                    </div>
                  )}
                  <div style={{ marginTop: 6, fontSize: 11, color: '#64748B' }}>
                    {amb.latitude.toFixed(4)}, {amb.longitude.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ── Emergency markers ── */}
        {activeEmergencies.map((em) => (
          <Marker
            key={em.id}
            position={[em.latitude, em.longitude]}
            icon={createEmergencyIcon(em.priority)}
          >
            <Popup>
              <div style={{ minWidth: 190, color: '#fff', background: '#1E293B', padding: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{em.patient?.name}</div>
                <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>{em.patient?.locationName}</div>
                <StatusBadge status={em.status} />
                <div style={{ marginTop: 6, fontSize: 12, color: '#94A3B8' }}>
                  {em.emergencyType?.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                  {em.latitude.toFixed(4)}, {em.longitude.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
