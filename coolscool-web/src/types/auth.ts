// Auth type definitions for Cool S-Cool

export type UserRole = 'child' | 'parent' | 'admin';

export interface BackendUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  parentalConsentGiven?: boolean;
  createdAt?: string;
}

export interface BackendAuthResponse {
  success: boolean;
  data: {
    user: BackendUser;
    accessToken: string;
    expiresIn: number;
  };
}

export interface BackendRefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
    expiresIn: number;
  };
}
