import React, { useState } from 'react';
import { useDispatch } from '../context/DispatchContext';
import { dispatchService } from '../services/dispatchService';
import StatusBadge from '../components/StatusBadge';
import DispatchMap from '../maps/DispatchMap';
import { Dispatch } from '../types';

export default function ActiveDispatchesPage() {
  const { ambulances, emergencies, activeDispatches, refresh } = useDispatch();
  const [completing, setCompleting] = useState<string | null>(null);
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);

  const handleComplete = async (id: string) => {
    setCompleting(id);
    try {
      await dispatchService.complete(id);
      await refresh();
      if (selectedDispatch?.id === id) setSelectedDispatch(null);
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Active Dispatches</h1>
        <span className="text-sm text-gray-400">{activeDispatches.length} active</span>
      </div>

      {activeDispatches.length === 0 ? (
        <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-12 text-center text-gray-500">
          No active dispatches. Simulate an emergency to see dispatches here.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Dispatch cards */}
          <div className="space-y-3">
            {activeDispatches.map((d: Dispatch) => (
              <div
                key={d.id}
                onClick={() => setSelectedDispatch(d.id === selectedDispatch?.id ? null : d)}
                className={`bg-dispatch-card border rounded-xl p-4 cursor-pointer transition-all ${
                  selectedDispatch?.id === d.id
                    ? 'border-blue-500 shadow-lg shadow-blue-900/20'
                    : 'border-dispatch-border hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-white">{d.ambulance?.name || 'Ambulance'}</div>
                    <div className="text-xs text-gray-400">{d.ambulance?.vehicleNumber}</div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-dispatch-dark rounded p-2">
                    <div className="text-gray-500 mb-0.5">Distance</div>
                    <div className="text-white font-semibold">{d.distanceKm?.toFixed(1)} km</div>
                  </div>
                  <div className="bg-dispatch-dark rounded p-2">
                    <div className="text-gray-500 mb-0.5">Initial ETA</div>
                    <div className="text-white font-semibold">{d.initialEtaMinutes?.toFixed(0)} min</div>
                  </div>
                  <div className={`rounded p-2 ${d.currentEtaMinutes > 0 ? 'bg-blue-900/30' : 'bg-green-900/30'}`}>
                    <div className="text-gray-500 mb-0.5">Current ETA</div>
                    <div className={`font-bold ${d.currentEtaMinutes > 0 ? 'text-blue-300' : 'text-green-400'}`}>
                      {d.currentEtaMinutes?.toFixed(0)} min
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Assigned: {new Date(d.assignedAt).toLocaleTimeString()}
                  </div>
                  {(d.status === 'ON_SCENE' || d.status === 'EN_ROUTE') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleComplete(d.id); }}
                      disabled={completing === d.id}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      {completing === d.id ? 'Completing...' : '✓ Mark Complete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Map for selected dispatch */}
          <div className="bg-dispatch-card border border-dispatch-border rounded-xl overflow-hidden" style={{ minHeight: '400px' }}>
            <div className="px-4 py-3 border-b border-dispatch-border text-sm font-medium text-white">
              {selectedDispatch ? `Route: ${selectedDispatch.ambulance?.name} →` : 'Select a dispatch to view route'}
            </div>
            <div style={{ height: '380px' }}>
              <DispatchMap
                ambulances={selectedDispatch
                  ? ambulances.filter((a) => a.id === selectedDispatch.ambulanceId)
                  : ambulances
                }
                emergencies={selectedDispatch
                  ? emergencies.filter((e) => e.id === selectedDispatch.emergencyId)
                  : emergencies
                }
                activeDispatches={selectedDispatch ? [selectedDispatch] : activeDispatches}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
