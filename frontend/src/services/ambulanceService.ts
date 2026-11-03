import api from './api';
import { Ambulance } from '../types';

export const ambulanceService = {
  list: (status?: string) =>
    api.get<{ ambulances: Ambulance[] }>('/ambulances', { params: status ? { status } : {} }),

  get: (id: string) =>
    api.get<{ ambulance: Ambulance }>(`/ambulances/${id}`),

  create: (data: Partial<Ambulance>) =>
    api.post<{ ambulance: Ambulance }>('/ambulances', data),

  update: (id: string, data: Partial<Ambulance>) =>
    api.patch<{ ambulance: Ambulance }>(`/ambulances/${id}`, data),

  delete: (id: string) =>
    api.delete(`/ambulances/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<{ ambulance: Ambulance }>(`/ambulances/${id}/status`, { status }),

  getHistory: (id: string) =>
    api.get(`/ambulances/${id}/history`),
};
