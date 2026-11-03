import React, { useState } from 'react';
import { useDispatch } from '../context/DispatchContext';
import { ambulanceService } from '../services/ambulanceService';
import StatusBadge from '../components/StatusBadge';
import { Ambulance } from '../types';

const statusOptions = ['AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'OFFLINE'];

export default function AmbulancePage() {
  const { ambulances, refresh, loading, error: contextError } = useDispatch();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', vehicleNumber: '', latitude: '28.5921', longitude: '77.0460' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await ambulanceService.create({
        name: formData.name,
        vehicleNumber: formData.vehicleNumber,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      });
      setShowForm(false);
      setFormData({ name: '', vehicleNumber: '', latitude: '28.5921', longitude: '77.0460' });
      await refresh();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to create ambulance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await ambulanceService.updateStatus(id, status);
      await refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ambulance?')) return;
    try {
      await ambulanceService.delete(id);
      await refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Ambulance Management</h1>
        <div className="flex items-center gap-3">
          <button onClick={refresh} disabled={loading} className="btn-secondary text-xs px-3 py-1.5">
            {loading ? '↻ Loading...' : '↻ Refresh'}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-4 py-2">
            {showForm ? 'Cancel' : '+ Add Ambulance'}
          </button>
        </div>
      </div>

          {contextError && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm rounded-lg px-4 py-3">
          ⚠️ {contextError} — <button onClick={refresh} className="underline">Retry</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-dispatch-card border border-dispatch-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">Register New Ambulance</h2>
          {formError && <div className="text-red-400 text-sm mb-3">{formError}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="AMB-DW-10" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Vehicle Number</label>
              <input className="input-field" value={formData.vehicleNumber} onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })} placeholder="DL-01-AA-1234" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Latitude</label>
              <input type="number" step="any" className="input-field" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Longitude</label>
              <input type="number" step="any" className="input-field" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} required />
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary text-sm">{submitting ? 'Saving...' : 'Register'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Ambulance table */}
      <div className="bg-dispatch-card border border-dispatch-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dispatch-border bg-dispatch-dark">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Vehicle No.</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Location</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Last Update</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ambulances.map((a: Ambulance) => (
              <tr key={a.id} className="border-b border-dispatch-border hover:bg-dispatch-dark/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                <td className="px-4 py-3 text-gray-300">{a.vehicleNumber}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(a.lastLocationUpdate).toLocaleTimeString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <select
                      value={a.status}
                      onChange={(e) => handleStatusChange(a.id, e.target.value)}
                      className="bg-dispatch-dark border border-dispatch-border text-xs text-white rounded px-2 py-1"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1 border border-red-900 rounded hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ambulances.length === 0 && (
          <div className="text-center py-12 text-gray-500">No ambulances registered</div>
        )}
      </div>
    </div>
  );
}
