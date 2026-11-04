import React, { useState, useEffect } from 'react';
import { useDispatch } from '../context/DispatchContext';
import { emergencyService } from '../services/emergencyService';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { Patient, EmergencyRequest } from '../types';

export default function EmergencyPage() {
  const { emergencies, refresh } = useDispatch();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState<any>(null);
  const [patientsLoading, setPatientsLoading] = useState(true);

  useEffect(() => {
    setPatientsLoading(true);
    emergencyService.listPatients()
      .then((r) => setPatients(r.data.patients))
      .catch((e) => console.error('Failed to load patients:', e))
      .finally(() => setPatientsLoading(false));
  }, []);

  const handleSimulate = async () => {
    if (!selectedPatient) return;
    setSimulating(true);
    setError('');
    setSimResult(null);
    setComparison(null);

    try {
      const res = await emergencyService.simulate(selectedPatient);
      setSimResult(res.data);

      // Refresh context so the list updates immediately
      await refresh();

      // Fetch algorithm comparison after a short delay (runs async on backend)
      if (res.data.emergency?.id) {
        const emergencyId = res.data.emergency.id;
        setTimeout(async () => {
          try {
            const cmpRes = await api.get(`/algorithms/comparison/${emergencyId}`);
            setComparison(cmpRes.data.comparison);
          } catch (e) {
            // comparison is best-effort, not critical
          }
        }, 1500);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Simulation failed';
      setError(msg);
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const selectedPatientData = patients.find((p) => p.id === selectedPatient);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">Emergency Simulation</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Simulator Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <span>🆘</span> Simulate Emergency Call
            </h2>

            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">
                Select Patient (Predefined Dataset)
              </label>
              {patientsLoading ? (
                <div className="input-field text-gray-500 text-sm">Loading patients...</div>
              ) : (
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="input-field"
                >
                  <option value="">— Choose patient —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.locationName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedPatientData && (
              <div className="bg-dispatch-dark rounded-lg p-3 mb-4 border border-dispatch-border text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Location</span>
                  <span className="text-white">{selectedPatientData.locationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Emergency</span>
                  <span className="text-white">{selectedPatientData.emergencyType?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="text-gray-300">{selectedPatientData.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Coords</span>
                  <span className="text-gray-300">
                    {selectedPatientData.latitude?.toFixed(4)}, {selectedPatientData.longitude?.toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 text-xs rounded-lg px-3 py-2 mb-3">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleSimulate}
              disabled={!selectedPatient || simulating || patientsLoading}
              className="btn-primary w-full"
            >
              {simulating ? '🔄 Dispatching ambulance...' : '📞 Simulate Emergency Call'}
            </button>
          </div>

          {/* Dispatch Result */}
          {simResult && (
            <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 text-sm">
              <div className="font-semibold text-green-400 mb-3">✅ Emergency Dispatched</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Patient</span>
                  <span className="text-white">{simResult.emergency?.patient?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <StatusBadge status={simResult.emergency?.status || ''} />
                </div>
                {simResult.dispatch?.success ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ambulance</span>
                      <span className="text-white">{simResult.dispatch.ambulanceId?.slice(0, 8)}…</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Road Distance</span>
                      <span className="text-white">{simResult.dispatch.distanceKm?.toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ETA</span>
                      <span className="text-blue-300 font-semibold">
                        {simResult.dispatch.etaMinutes?.toFixed(1)} min
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-yellow-400">⚠️ {simResult.dispatch?.error || 'No ambulance available'}</div>
                )}
              </div>
            </div>
          )}

          {/* Algorithm Comparison */}
          {comparison && (
            <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <span>🤖</span> Algorithm Comparison
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <AlgoCard title="A* Search" result={comparison.astar} isWinner={comparison.winner === 'ASTAR'} />
                <AlgoCard title="Dijkstra" result={comparison.dijkstra} isWinner={comparison.winner === 'DIJKSTRA'} />
              </div>
              <div className="mt-2.5 space-y-1 text-xs text-center text-gray-400 pt-2 border-t border-dispatch-border">
                <div>
                  Ambulance selection: <span className="text-green-400 font-semibold">A* selected the ambulance</span>
                </div>
                <div>
                  Route distance: <span className="text-blue-300 font-semibold">tied / optimal</span>
                </div>
                <div>
                  Runtime winner: <span className="text-yellow-400 font-semibold">{comparison.winner}</span>
                  {' '}({comparison.speedupPercent?.toFixed(1)}% faster, benchmark only)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Emergency List */}
        <div className="lg:col-span-2">
          <div className="bg-dispatch-card border border-dispatch-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-dispatch-border flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Emergency Requests</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{emergencies.length} total</span>
                <button onClick={refresh} className="btn-secondary text-xs px-2 py-1">↻ Refresh</button>
              </div>
            </div>

            {emergencies.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-sm">
                <div className="text-3xl mb-3">🆘</div>
                No emergencies yet. Select a patient and click Simulate Emergency Call.
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[600px] divide-y divide-dispatch-border">
                {emergencies.map((e: EmergencyRequest) => (
                  <div key={e.id} className="hover:bg-dispatch-dark/50 px-4 py-3 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm text-white">{e.patient?.name}</span>
                        </div>
                        <div className="text-xs text-gray-400">{e.patient?.locationName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {e.emergencyType?.replace(/_/g, ' ')} · {new Date(e.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
                        <StatusBadge status={e.status} />
                        {e.dispatch && (
                          <div className="text-xs text-blue-400">
                            ⏱️ {e.dispatch.currentEtaMinutes?.toFixed(0)} min
                          </div>
                        )}
                      </div>
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

function AlgoCard({ title, result, isWinner }: { title: string; result: any; isWinner: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 border ${isWinner ? 'border-yellow-600 bg-yellow-900/20' : 'border-dispatch-border bg-dispatch-dark'}`}>
      <div className="flex items-center gap-1 mb-2">
        <span className="font-semibold text-white text-xs">{title}</span>
        {isWinner && <span className="text-yellow-400 text-sm">🏆</span>}
      </div>
      <div className="space-y-0.5 text-gray-400 text-xs">
        <div>⏱ {result?.executionTimeMs?.toFixed(3)} ms</div>
        <div>🔍 {result?.exploredNodes} nodes</div>
        <div>📏 {result?.cost?.toFixed(3)} km</div>
      </div>
    </div>
  );
}
