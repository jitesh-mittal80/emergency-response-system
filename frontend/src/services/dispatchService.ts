import api from './api';
import { Dispatch } from '../types';

export const dispatchService = {
  list: (status?: string) =>
    api.get<{ dispatches: Dispatch[] }>('/dispatches', { params: status ? { status } : {} }),

  get: (id: string) =>
    api.get<{ dispatch: Dispatch }>(`/dispatches/${id}`),

  complete: (id: string) =>
    api.post<{ dispatch: Dispatch }>(`/dispatches/${id}/complete`),

  getRoute: (id: string) =>
    api.get(`/dispatches/${id}/route`),
};
