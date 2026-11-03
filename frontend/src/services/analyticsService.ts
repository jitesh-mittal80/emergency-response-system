import api from './api';

export const analyticsService = {
  overview: () => api.get('/analytics/overview'),
  responseTimes: () => api.get('/analytics/response-times'),
  algorithmPerformance: () => api.get('/analytics/algorithm-performance'),
};
