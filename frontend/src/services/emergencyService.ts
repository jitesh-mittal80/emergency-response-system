import api from './api';
import { EmergencyRequest, Patient } from '../types';

export const emergencyService = {
  listPatients: () =>
    api.get<{ patients: Patient[] }>('/emergencies/patients'),

  list: (status?: string) =>
    api.get<{ emergencies: EmergencyRequest[] }>('/emergencies', { params: status ? { status } : {} }),

  simulate: (patientId: string) =>
    api.post<{ emergency: EmergencyRequest }>('/emergencies/simulate', { patientId }),

  get: (id: string) =>
    api.get<{ emergency: EmergencyRequest }>(`/emergencies/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<{ emergency: EmergencyRequest }>(`/emergencies/${id}/status`, { status }),
};
