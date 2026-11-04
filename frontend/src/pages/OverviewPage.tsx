import React, { useEffect, useState } from 'react';
import { useDispatch } from '../context/DispatchContext';
import { useSocket } from '../context/SocketContext';
import { analyticsService } from '../services/analyticsService';
import StatusBadge from '../components/StatusBadge';
import { EmergencyRequest } from '../types';

interface Stats {
  totalAmbulances: number;
  availableAmbulances: number;
  busyAmbulances: number;
  offlineAmbulances: number;
  totalEmergencies: number;
  activeEmergencies: number;
  completedEmergencies: number;
  averageResponseTimeMinutes: number;
  fastestResponseTimeMinutes: number;
  slowestResponseTimeMinutes: number;
}

export default function OverviewPage() {
  const { ambulances, emergencies, activeDispatches, refresh, loading, error } = useDispatch();
  const { connected } = useSocket();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    analyticsService.overview().then((r) => setStats(r.data.stats)).catch(console.error);
  }, [emergencies, ambulances]);

  const recentEmergencies = emergencies.slice(0, 6);

  const kpis = [
    { label: 'Total Ambulances', value: stats?.totalAmbulances ?? ambulances.length, icon: '🚑', color: 'text-blue-400' },
    { label: 'Available', value: stats?.availableAmbulances ?? ambulances.filter((a) => a.status === 'AVAILABLE').length, icon: '✅', color: 'text-green-400' },
    { label: 'Busy', value: stats?.busyAmbulances ?? ambulances.filter((a) => ['ASSIGNED','EN_ROUTE','ON_SCENE'].includes(a.status)).length, icon: '🔄', color: 'text-orange-400' },
    { label: 'Active Emergencies', value: stats?.activeEmergencies ?? activeDispatches.length, icon: '🆘', color: 'text-red-400' },
    { label: 'Completed Today', value: stats?.completedEmergencies ?? 0, icon: '✔️', color: 'text-green-400' },
    { label: 'Avg Response', value: stats ? `${stats.averageResponseTimeMinutes} min` : '—', icon: '⏱️', color: 'text-yellow-400' },
    { label: 'Fastest Response', value: stats ? `${stats.fastestResponseTimeMinutes} min` : '—', icon: '⚡', color: 'text-purple-400' },
    { label: 'Active Dispatches', value: activeDispatches.length, icon: '📍', color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-sm text-gray-400">AI-Powered Emergency Ambulance Dispatch — West Delhi</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${connected ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-red-900/30 text-red-400 border border-red-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {connected ? 'Live Updates Active' : 'Reconnecting...'}
          </span>
          <button onClick={refresh} className="btn-secondary text-xs px-3 py-1.5">↻ Refresh</button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={refresh} className="text-xs underline">Retry</button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{kpi.icon}</span>
              <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
            </div>
            <div className="text-xs text-gray-400">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Dispatches */}
        <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-4">
          <h2 className="section-title flex items-center gap-2">
            <span>📍</span> Active Dispatches
          </h2>
          {activeDispatches.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No active dispatches</div>
          ) : (
            <div className="space-y-3">
              {activeDispatches.slice(0, 5).map((d) => (
                <div key={d.id} className="bg-dispatch-dark rounded-lg p-3 border border-dispatch-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">
                      {d.ambulance?.name || d.ambulanceId.slice(0, 8)}
                    </span>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>📏 {d.distanceKm?.toFixed(1)} km</span>
                    <span>⏱️ ETA: {d.currentEtaMinutes?.toFixed(0)} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Emergencies */}
        <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-4">
          <h2 className="section-title flex items-center gap-2">
            <span>🆘</span> Recent Emergencies
          </h2>
          {recentEmergencies.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No emergencies yet</div>
          ) : (
            <div className="space-y-2">
              {recentEmergencies.map((e: EmergencyRequest) => (
                <div key={e.id} className="bg-dispatch-dark rounded-lg p-3 border border-dispatch-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{e.patient?.name}</div>
                      <div className="text-xs text-gray-400">{e.patient?.locationName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ambulance Status Grid */}
      <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-4">
        <h2 className="section-title flex items-center gap-2">
          <span>🚑</span> Ambulance Fleet Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ambulances.map((a) => (
            <div key={a.id} className="bg-dispatch-dark rounded-lg p-3 border border-dispatch-border">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${
                  a.status === 'AVAILABLE' ? 'bg-green-500' :
                  a.status === 'ASSIGNED' || a.status === 'EN_ROUTE' ? 'bg-orange-500 animate-pulse' :
                  a.status === 'ON_SCENE' ? 'bg-purple-500' :
                  'bg-gray-600'
                }`} />
                <span className="text-sm font-medium text-white truncate">{a.name}</span>
              </div>
              <div className="text-xs text-gray-500">{a.vehicleNumber}</div>
              <StatusBadge status={a.status} className="mt-1.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
