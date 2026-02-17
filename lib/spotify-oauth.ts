/**
 * Spotify OAuth Module - Server-Side Authentication
 *
 * Handles OAuth authentication flow for the app owner (one-time setup)
 * and automatic token refresh for accessing Spotify audio features API.
 *
 * Users never see this - it's purely server-side authentication.
 */

import { createClient } from 'redis';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback';

// Redis client for storing refresh token
const hasRedisURL = !!process.env.REDIS_URL;
let redisClient: ReturnType<typeof createClient> | null = null;

if (hasRedisURL) {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL!,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
          if (retries > 3) return false;
          return Math.min(retries * 200, 2000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('[Spotify OAuth Redis] Error:', err.message);
    });
  } catch (error) {
    console.error('[Spotify OAuth] Failed to initialize Redis:', error);
    redisClient = null;
  }
}

// In-memory fallback (for local dev)
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get the OAuth authorization URL for initial setup
 * App owner visits this URL once to grant permissions
 */
export function getAuthorizationUrl(): string {
  const scopes = [
    'user-read-private',
    'user-read-email',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: scopes,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens
 * Called once during initial setup after user authorizes
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing Spotify credentials');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Store refresh token
  await storeRefreshToken(data.refresh_token);

  console.log('[Spotify OAuth] ✅ Tokens obtained and refresh token stored');

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

/**
 * Store refresh token securely (Redis or env var)
 */
async function storeRefreshToken(refreshToken: string): Promise<void> {
  if (redisClient) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      await redisClient.set('spotify:refresh_token', refreshToken);
      await redisClient.disconnect();

      console.log('[Spotify OAuth] Refresh token stored in Redis');
    } catch (error) {
      console.error('[Spotify OAuth] Failed to store in Redis:', error);
      console.log('[Spotify OAuth] ⚠️  Add this to .env.local:');
      console.log(`SPOTIFY_REFRESH_TOKEN="${refreshToken}"`);
    }
  } else {
    console.log('[Spotify OAuth] ⚠️  No Redis available. Add this to .env.local:');
    console.log(`SPOTIFY_REFRESH_TOKEN="${refreshToken}"`);
  }
}

/**
 * Get refresh token from storage
 */
async function getRefreshToken(): Promise<string | null> {
  // Try environment variable first (manual setup)
  if (process.env.SPOTIFY_REFRESH_TOKEN) {
    return process.env.SPOTIFY_REFRESH_TOKEN;
  }

  // Try Redis
  if (redisClient) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }

      const token = await redisClient.get('spotify:refresh_token');
      await redisClient.disconnect();

      return token;
    } catch (error) {
      console.error('[Spotify OAuth] Failed to read from Redis:', error);
    }
  }

  return null;
}

/**
 * Refresh the access token using the stored refresh token
 */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    throw new Error(
      'No refresh token found. Please run the OAuth setup: visit /api/spotify/setup'
    );
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing Spotify credentials');
  }

  console.log('[Spotify OAuth] Refreshing access token...');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Cache the new access token
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 min early

  console.log('[Spotify OAuth] ✅ Access token refreshed');

  return data.access_token;
}

/**
 * Get a valid access token (uses cache or refreshes if needed)
 * This is the main function used by spotify-features.ts
 */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  // Refresh and return new token
  return await refreshAccessToken();
}

/**
 * Check if OAuth is set up (has refresh token)
 */
export async function isOAuthSetup(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  return !!refreshToken;
}
