import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import * as userModel from '../models/user.model.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  TokenPayload,
  TokenError,
} from '../utils/jwt.js';
import { UnauthorizedError, BadRequestError } from '../middleware/error.js';

// Google OAuth client
const googleClient = new OAuth2Client(config.google.clientId);

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
  };
  tokens: AuthTokens;
}

// Verify Google ID token and extract user info
export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedError('Invalid Google token');
    }

    return {
      googleId: payload.sub,
      email: payload.email!,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    console.error('Google token verification failed:', error);
    throw new UnauthorizedError('Failed to verify Google token');
  }
}

// Authenticate with Google OAuth
export async function authenticateWithGoogle(
  idToken: string,
  deviceInfo?: Record<string, unknown>
): Promise<AuthResult> {
  // Verify the Google token
  const googleUser = await verifyGoogleToken(idToken);

  // Find or create user
  const user = await userModel.findOrCreateByGoogle({
    google_id: googleUser.googleId,
    email: googleUser.email,
    display_name: googleUser.name,
    avatar_url: googleUser.picture,
  });

  // Generate tokens
  const tokens = await createTokenPair(user, deviceInfo);

  // Log the authentication
  await userModel.logAudit('auth.login', {
    userId: user.id,
    success: true,
    details: { method: 'google' },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role,
    },
    tokens,
  };
}

// Create access and refresh token pair
async function createTokenPair(
  user: userModel.User,
  deviceInfo?: Record<string, unknown>
): Promise<AuthTokens> {
  // Create access token payload
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);

  // Create refresh token
  const { token: refreshToken, hash, expiresAt } = generateRefreshToken(user.id);

  // Store refresh token hash
  await userModel.storeRefreshToken(user.id, hash, expiresAt, deviceInfo);

  // Calculate expiry in seconds (15 minutes)
  const expiresIn = 15 * 60;

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

// Refresh access token
export async function refreshAccessToken(
  refreshToken: string,
  deviceInfo?: Record<string, unknown>
): Promise<AuthTokens> {
  try {
    // Verify the refresh token
    const { sub: userId } = verifyRefreshToken(refreshToken);

    // Check if token exists and is not revoked
    const tokenHash = hashToken(refreshToken);
    const storedToken = await userModel.findRefreshToken(tokenHash);

    if (!storedToken) {
      // Token was revoked or doesn't exist - possible token reuse attack
      // Revoke all user tokens as a precaution
      await userModel.revokeAllUserTokens(userId);

      await userModel.logAudit('auth.token_reuse_detected', {
        userId,
        success: false,
        details: { action: 'all_tokens_revoked' },
      });

      throw new UnauthorizedError('Invalid refresh token');
    }

    // Revoke the old refresh token (rotation)
    await userModel.revokeRefreshToken(tokenHash);

    // Get user
    const user = await userModel.findById(userId);
    if (!user || !user.is_active) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Create new token pair
    const tokens = await createTokenPair(user, deviceInfo);

    await userModel.logAudit('auth.token_refresh', {
      userId: user.id,
      success: true,
    });

    return tokens;
  } catch (error) {
    if (error instanceof TokenError) {
      throw new UnauthorizedError(error.message);
    }
    throw error;
  }
}

// Logout - revoke refresh token
export async function logout(refreshToken: string, userId: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await userModel.revokeRefreshToken(tokenHash);

  await userModel.logAudit('auth.logout', {
    userId,
    success: true,
  });
}

// Logout from all devices
export async function logoutAll(userId: string): Promise<void> {
  await userModel.revokeAllUserTokens(userId);

  await userModel.logAudit('auth.logout_all', {
    userId,
    success: true,
  });
}

// Get current user
export async function getCurrentUser(userId: string): Promise<userModel.User | null> {
  return userModel.findById(userId);
}
