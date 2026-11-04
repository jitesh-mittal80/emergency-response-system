import React, { useEffect, useState } from 'react';
import { dispatchService } from '../services/dispatchService';
import StatusBadge from '../components/StatusBadge';

interface HistoryRecord {
  id: string;
  status: string;
  distanceKm: number;
  initialEtaMinutes: number;
  assignedAt: string;
  arrivedAt?: string | null;
  completedAt: string | null;
  ambulance?: { name: string; vehicleNumber: string };
  emergency?: { emergencyType: string; patient?: { name: string; locationName: string } };
}

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dispatchService.list()
      .then((r) => setRecords(r.data.dispatches as HistoryRecord[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const completed = records.filter((r) => r.status === 'COMPLETED');
  const all = records;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Emergency History</h1>
        <div className="text-sm text-gray-400">{completed.length} completed / {all.length} total</div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading history...</div>
      ) : (
        <div className="bg-dispatch-card border border-dispatch-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dispatch-border bg-dispatch-dark">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Patient</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Emergency</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Ambulance</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Distance</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Response Time</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Assigned At</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const responseTime = r.arrivedAt
                  ? ((new Date(r.arrivedAt).getTime() - new Date(r.assignedAt).getTime()) / 60000).toFixed(1)
                  : '—';
                return (
                  <tr key={r.id} className="border-b border-dispatch-border hover:bg-dispatch-dark/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{r.emergency?.patient?.name || '—'}</div>
                      <div className="text-xs text-gray-500">{r.emergency?.patient?.locationName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-300 text-xs">{r.emergency?.emergencyType?.replace('_', ' ')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-300">{r.ambulance?.name || '—'}</div>
                      <div className="text-xs text-gray-500">{r.ambulance?.vehicleNumber}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-gray-300">{r.distanceKm?.toFixed(1)} km</td>
                    <td className="px-4 py-3">
                      <span className={r.arrivedAt ? 'text-green-400' : 'text-gray-500'}>
                        {responseTime !== '—' ? `${responseTime} min` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(r.assignedAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {records.length === 0 && (
            <div className="text-center py-12 text-gray-500">No history yet</div>
          )}
        </div>
      )}
    </div>
  );
}
