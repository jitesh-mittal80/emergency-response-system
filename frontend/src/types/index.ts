// Re-export shared types + frontend-specific additions
export * from '../../../shared/types/index';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthState {
  token: string | null;
  admin: AdminUser | null;
  loading: boolean;
}

export interface ApiError {
  error: string;
  details?: Array<{ field: string; message: string }>;
}
