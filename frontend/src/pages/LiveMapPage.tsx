import React from 'react';
import { useDispatch } from '../context/DispatchContext';
import DispatchMap from '../maps/DispatchMap';
import StatusBadge from '../components/StatusBadge';

export default function LiveMapPage() {
  const { ambulances, emergencies, activeDispatches } = useDispatch();

  const available = ambulances.filter((a) => a.status === 'AVAILABLE').length;
  const enRoute = ambulances.filter((a) => a.status === 'EN_ROUTE').length;
  const onScene = ambulances.filter((a) => a.status === 'ON_SCENE').length;

  return (
    <div className="flex flex-col h-full gap-4" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Stats bar */}
      <div className="flex gap-4 flex-wrap">
        <Stat label="Ambulances on Map" value={ambulances.length} color="text-blue-400" />
        <Stat label="Available" value={available} color="text-green-400" />
        <Stat label="En Route" value={enRoute} color="text-orange-400" />
        <Stat label="On Scene" value={onScene} color="text-purple-400" />
        <Stat label="Active Emergencies" value={activeDispatches.length} color="text-red-400" />
      </div>

      <div className="flex gap-4 flex-1" style={{ minHeight: '500px' }}>
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-dispatch-border">
          <DispatchMap
            ambulances={ambulances}
            emergencies={emergencies}
            activeDispatches={activeDispatches}
          />
        </div>

        {/* Sidebar */}
        <div className="w-72 flex flex-col gap-3 overflow-y-auto">
          {/* Legend */}
          <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-300 mb-2">Map Legend</div>
            <div className="space-y-1.5 text-xs">
              <LegendItem color="#16A34A" icon="🚑" label="Available Ambulance" />
              <LegendItem color="#EA580C" icon="🚑" label="Assigned Ambulance" />
              <LegendItem color="#1D4ED8" icon="🚑" label="En Route" />
              <LegendItem color="#7C3AED" icon="🚑" label="On Scene" />
              <LegendItem color="#EF4444" icon="🆘" label="Emergency" />
              <div className="flex items-center gap-2 pt-1">
                <div className="w-8 border-t-2 border-blue-500 border-dashed" />
                <span className="text-gray-400">Active Route</span>
              </div>
            </div>
          </div>

          {/* Active Dispatches */}
          <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-3 flex-1">
            <div className="text-xs font-semibold text-gray-300 mb-2">Active Dispatches ({activeDispatches.length})</div>
            {activeDispatches.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">No active dispatches</div>
            ) : (
              <div className="space-y-2">
                {activeDispatches.map((d) => (
                  <div key={d.id} className="bg-dispatch-dark rounded-lg p-2.5 border border-dispatch-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">
                        {d.ambulance?.name || '—'}
                      </span>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="text-xs text-gray-400">
                      📏 {d.distanceKm?.toFixed(1)} km &nbsp;•&nbsp; ⏱️ {d.currentEtaMinutes?.toFixed(0)} min
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-dispatch-card border border-dispatch-border rounded-lg px-4 py-2 flex items-center gap-3">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

function LegendItem({ color, icon, label }: { color: string; icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
      <span className="text-gray-400">{label}</span>
    </div>
  );
}
