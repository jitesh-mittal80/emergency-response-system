import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { admin } = useAuth();
  const [simStatus, setSimStatus] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const simAction = async (action: 'start' | 'pause' | 'reset') => {
    setSimLoading(true);
    setMsg('');
    try {
      const r = await api.post(`/simulation/${action}`);
      setSimStatus(r.data.status);
      setMsg(`Simulation ${action}ed successfully`);
    } catch (err: any) {
      setMsg(err?.response?.data?.error || `Failed to ${action} simulation`);
    } finally {
      setSimLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const r = await api.get('/simulation/status');
      setSimStatus(r.data.status);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      {/* Admin Info */}
      <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Admin Profile</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Name</span>
            <span className="text-white">{admin?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Email</span>
            <span className="text-white">{admin?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Role</span>
            <span className="text-white">{admin?.role}</span>
          </div>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Simulation Controls</h2>
        <p className="text-sm text-gray-400 mb-4">
          Control the ambulance roaming simulation. The simulation runs automatically when the backend starts.
        </p>

        {msg && (
          <div className="bg-blue-900/20 border border-blue-700 text-blue-300 text-sm rounded-lg px-4 py-2 mb-4">
            {msg}
          </div>
        )}

        {simStatus && (
          <div className="bg-dispatch-dark rounded-lg p-3 mb-4 text-sm space-y-1 border border-dispatch-border">
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className={simStatus.running ? 'text-green-400' : 'text-red-400'}>
                {simStatus.running ? '● Running' : '● Stopped'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ambulances</span>
              <span className="text-white">{simStatus.ambulanceCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tick Interval</span>
              <span className="text-white">{simStatus.tickMs}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Speed Multiplier</span>
              <span className="text-white">×{simStatus.speed}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button onClick={fetchStatus} className="btn-secondary text-sm">📊 Get Status</button>
          <button onClick={() => simAction('start')} disabled={simLoading} className="btn-secondary text-sm">▶ Start</button>
          <button onClick={() => simAction('pause')} disabled={simLoading} className="btn-secondary text-sm">⏸ Pause</button>
          <button onClick={() => simAction('reset')} disabled={simLoading} className="btn-primary text-sm">↺ Reset</button>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">System Information</h2>
        <div className="space-y-2 text-sm">
          <InfoRow label="Service Area" value="West Delhi (Dwarka, Janakpuri, Uttam Nagar, Palam, Vikaspuri)" />
          <InfoRow label="Algorithms" value="A* Search & Dijkstra's Shortest Path" />
          <InfoRow label="Routing Mode" value={import.meta.env.VITE_MOCK_ROUTING !== 'false' ? 'Mock (Simulated)' : 'Google Routes API'} />
          <InfoRow label="Map Provider" value="OpenStreetMap (Leaflet)" />
          <InfoRow label="Version" value="1.0.0 — Academic Prototype" />
        </div>
        <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-dispatch-border">
          ⚠️ This is an academic simulation prototype and is NOT a real emergency dispatch service.
          Do not use for actual emergencies. Call 112 for real emergencies.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-white text-right">{value}</span>
    </div>
  );
}
