import { BackendUser } from './auth';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: BackendUser;
    accessToken: string;
    accessTokenExpires: number;
    error?: 'RefreshAccessTokenError';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    backendUser?: BackendUser;
    accessToken?: string;
    accessTokenExpires?: number;
    error?: 'RefreshAccessTokenError';
  }
}
