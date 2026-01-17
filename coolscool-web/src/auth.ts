import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';
import { authenticateWithGoogle } from '@/services/auth-api';

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign in - exchange Google token with backend
      if (account && account.id_token) {
        try {
          const backendAuth = await authenticateWithGoogle(account.id_token);

          token.backendUser = backendAuth.data.user;
          token.accessToken = backendAuth.data.accessToken;
          token.accessTokenExpires = Date.now() + backendAuth.data.expiresIn * 1000;

          return token;
        } catch (error) {
          console.error('Failed to authenticate with backend:', error);
          token.error = 'RefreshAccessTokenError';
          return token;
        }
      }

      // Return previous token if the access token has not expired
      const expiresAt = token.accessTokenExpires as number | undefined;
      if (expiresAt && Date.now() < expiresAt) {
        return token;
      }

      // Access token has expired, try to refresh it
      // Note: In production, you'd want to implement refresh token rotation
      // For now, we'll require re-authentication
      console.log('Access token expired, requiring re-authentication');
      token.error = 'RefreshAccessTokenError';
      return token;
    },
    async session({ session, token }) {
      if (token.backendUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).user = token.backendUser;
        session.accessToken = token.accessToken!;
        session.accessTokenExpires = token.accessTokenExpires!;
      }

      if (token.error) {
        session.error = token.error;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
