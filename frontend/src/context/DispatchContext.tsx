import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Ambulance, EmergencyRequest, Dispatch } from '../types';
import { useSocket } from './SocketContext';
import { ambulanceService } from '../services/ambulanceService';
import { emergencyService } from '../services/emergencyService';
import { dispatchService } from '../services/dispatchService';

interface DispatchContextType {
  ambulances: Ambulance[];
  emergencies: EmergencyRequest[];
  activeDispatches: Dispatch[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setAmbulances: React.Dispatch<React.SetStateAction<Ambulance[]>>;
  setEmergencies: React.Dispatch<React.SetStateAction<EmergencyRequest[]>>;
}

const DispatchContext = createContext<DispatchContextType | null>(null);

export function DispatchProvider({ children }: { children: React.ReactNode }) {
  const { socket, connected } = useSocket();
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([]);
  const [activeDispatches, setActiveDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const [ambRes, emRes, dispRes] = await Promise.all([
        ambulanceService.list(),
        emergencyService.list(),
        dispatchService.list(),
      ]);
      if (!mountedRef.current) return;
      setAmbulances(ambRes.data.ambulances);
      setEmergencies(emRes.data.emergencies);
      setActiveDispatches(
        dispRes.data.dispatches.filter((d: Dispatch) =>
          ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE'].includes(d.status)
        )
      );
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err?.response?.data?.error || err?.message || 'Failed to load data';
      setError(msg);
      console.error('[DispatchContext] refresh failed:', msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  // Re-fetch when socket reconnects (catches missed updates)
  useEffect(() => {
    if (connected) {
      refresh();
    }
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const onLocationUpdate = (data: any) => {
      setAmbulances((prev) =>
        prev.map((a) =>
          a.id === data.ambulanceId
            ? { ...a, latitude: data.latitude, longitude: data.longitude, lastLocationUpdate: data.timestamp }
            : a
        )
      );
    };

    const onStatusUpdate = (data: any) => {
      setAmbulances((prev) =>
        prev.map((a) =>
          a.id === data.ambulanceId
            ? { ...a, status: data.status, assignedEmergencyId: data.assignedEmergencyId ?? null }
            : a
        )
      );
    };

    const onEmergencyNew = (data: any) => {
      setEmergencies((prev) => {
        // Avoid duplicates
        if (prev.find((e) => e.id === data.emergency.id)) return prev;
        return [data.emergency, ...prev];
      });
    };

    const onEmergencyStatus = (data: any) => {
      setEmergencies((prev) =>
        prev.map((e) => (e.id === data.emergencyId ? { ...e, status: data.status } : e))
      );
    };

    const onDispatchAssigned = (data: any) => {
      // Add to active list and update the emergency's dispatch reference
      setActiveDispatches((prev) => {
        const exists = prev.find((d) => d.id === data.dispatch.id);
        return exists ? prev.map((d) => d.id === data.dispatch.id ? data.dispatch : d) : [data.dispatch, ...prev];
      });
      // Also update the emergency to include the dispatch
      setEmergencies((prev) =>
        prev.map((e) =>
          e.id === data.emergency.id ? { ...e, status: data.emergency.status, dispatch: data.dispatch } : e
        )
      );
    };

    const onDispatchEta = (data: any) => {
      setActiveDispatches((prev) =>
        prev.map((d) =>
          d.id === data.dispatchId
            ? { ...d, currentEtaMinutes: data.currentEtaMinutes }
            : d
        )
      );
    };

    const onDispatchCompleted = (data: any) => {
      setActiveDispatches((prev) => prev.filter((d) => d.id !== data.dispatchId));
      // Refresh to get latest completed state
      setTimeout(refresh, 500);
    };

    socket.on('ambulance:location-update', onLocationUpdate);
    socket.on('ambulance:status-update', onStatusUpdate);
    socket.on('emergency:new-request', onEmergencyNew);
    socket.on('emergency:status-update', onEmergencyStatus);
    socket.on('dispatch:assigned', onDispatchAssigned);
    socket.on('dispatch:eta-update', onDispatchEta);
    socket.on('dispatch:completed', onDispatchCompleted);

    return () => {
      socket.off('ambulance:location-update', onLocationUpdate);
      socket.off('ambulance:status-update', onStatusUpdate);
      socket.off('emergency:new-request', onEmergencyNew);
      socket.off('emergency:status-update', onEmergencyStatus);
      socket.off('dispatch:assigned', onDispatchAssigned);
      socket.off('dispatch:eta-update', onDispatchEta);
      socket.off('dispatch:completed', onDispatchCompleted);
    };
  }, [socket, refresh]);

  return (
    <DispatchContext.Provider
      value={{ ambulances, emergencies, activeDispatches, loading, error, refresh, setAmbulances, setEmergencies }}
    >
      {children}
    </DispatchContext.Provider>
  );
}

export function useDispatch(): DispatchContextType {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error('useDispatch must be used within DispatchProvider');
  return ctx;
}
