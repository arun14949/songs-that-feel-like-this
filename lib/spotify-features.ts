/**
 * Spotify Audio Features Module
 *
 * Fetches and caches Spotify audio features for tracks.
 * Uses Redis for persistent caching across requests (7-day TTL).
 * Supports batch requests (up to 100 tracks per call).
 *
 * Audio Features Retrieved:
 * - energy (0-1): Intensity/activity level
 * - valence (0-1): Musical positiveness/happiness
 * - danceability (0-1): How suitable for dancing
 * - acousticness (0-1): Acoustic vs. electronic
 * - instrumentalness (0-1): Lack of vocals
 * - tempo (BPM): Beats per minute
 * - loudness (dB): Overall loudness
 * - mode (0/1): Minor or Major key
 */

import { createClient } from 'redis';
import type { AudioFeatures } from './types';
import { getAccessToken } from './spotify-oauth';

// Redis client for caching (shared with storage.ts pattern)
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
      console.error('[Spotify Features Redis] Error:', err.message);
    });

    console.log('[Spotify Features] Redis client initialized');
  } catch (error) {
    console.error('[Spotify Features] Failed to initialize Redis:', error);
    redisClient = null;
  }
}

// In-memory cache fallback (for local dev without Redis)
const memoryCache = new Map<string, AudioFeatures>();

/**
 * Get Spotify access token using OAuth
 * Delegates to spotify-oauth.ts which handles token refresh
 */
async function getSpotifyAccessToken(): Promise<string> {
  return await getAccessToken();
}

/**
 * Fetch audio features from Spotify API (batch request, up to 100 tracks)
 * https://developer.spotify.com/documentation/web-api/reference/get-several-audio-features
 */
async function fetchAudioFeaturesFromSpotify(
  trackIds: string[]
): Promise<Map<string, AudioFeatures>> {
  if (trackIds.length === 0) {
    return new Map();
  }

  if (trackIds.length > 100) {
    console.warn(`[Spotify Features] Requested ${trackIds.length} tracks, limiting to 100`);
    trackIds = trackIds.slice(0, 100);
  }

  const token = await getSpotifyAccessToken();
  const idsParam = trackIds.join(',');

  console.log(`[Spotify Features] Fetching audio features for ${trackIds.length} tracks...`);

  const response = await fetch(
    `https://api.spotify.com/v1/audio-features?ids=${idsParam}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const results = new Map<string, AudioFeatures>();

  // API returns array of audio features (can include null for invalid IDs)
  if (data.audio_features && Array.isArray(data.audio_features)) {
    data.audio_features.forEach((features: any, index: number) => {
      if (features) {
        const trackId = trackIds[index];
        results.set(trackId, {
          energy: features.energy ?? 0.5,
          valence: features.valence ?? 0.5,
          danceability: features.danceability ?? 0.5,
          acousticness: features.acousticness ?? 0.5,
          instrumentalness: features.instrumentalness ?? 0.5,
          tempo: features.tempo ?? 120,
          loudness: features.loudness ?? -5,
          mode: features.mode ?? 1,
          speechiness: features.speechiness,
          liveness: features.liveness,
        });
      } else {
        console.warn(`[Spotify Features] No features for track ID: ${trackIds[index]}`);
      }
    });
  }

  console.log(`[Spotify Features] ✅ Retrieved ${results.size}/${trackIds.length} features from Spotify`);
  return results;
}

/**
 * Cache audio features in Redis
 * Key format: "audio_features:{spotify_id}"
 * TTL: 7 days (audio features are immutable)
 */
async function cacheAudioFeatures(
  features: Map<string, AudioFeatures>
): Promise<void> {
  const expiration = 60 * 60 * 24 * 7; // 7 days

  // Cache in memory (always)
  features.forEach((audioFeatures, trackId) => {
    memoryCache.set(trackId, audioFeatures);
  });

  // Cache in Redis (if available)
  if (!redisClient) {
    console.log('[Spotify Features] No Redis, using memory cache only');
    return;
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    const pipeline = redisClient.multi();

    features.forEach((audioFeatures, trackId) => {
      const key = `audio_features:${trackId}`;
      pipeline.setEx(key, expiration, JSON.stringify(audioFeatures));
    });

    await pipeline.exec();
    await redisClient.disconnect();

    console.log(`[Spotify Features] ✅ Cached ${features.size} features in Redis`);
  } catch (error: any) {
    console.error(`[Spotify Features] Redis cache error: ${error.message}`);
    // Continue without Redis - memory cache is still available
  }
}

/**
 * Get cached audio features from Redis
 * Returns Map of found features (missing tracks not included)
 */
async function getCachedFeatures(
  trackIds: string[]
): Promise<Map<string, AudioFeatures>> {
  const cached = new Map<string, AudioFeatures>();

  // Check memory cache first
  trackIds.forEach(trackId => {
    const memCached = memoryCache.get(trackId);
    if (memCached) {
      cached.set(trackId, memCached);
    }
  });

  if (cached.size === trackIds.length) {
    console.log(`[Spotify Features] ✅ All ${trackIds.length} features found in memory cache`);
    return cached;
  }

  // Check Redis for remaining tracks
  if (!redisClient) {
    return cached;
  }

  const uncached = trackIds.filter(id => !cached.has(id));
  if (uncached.length === 0) {
    return cached;
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    const keys = uncached.map(id => `audio_features:${id}`);
    const values = await redisClient.mGet(keys);

    values.forEach((value, index) => {
      if (value) {
        try {
          const features = JSON.parse(value);
          const trackId = uncached[index];
          cached.set(trackId, features);
          // Also update memory cache
          memoryCache.set(trackId, features);
        } catch (parseError) {
          console.error(`[Spotify Features] Failed to parse cached features for ${uncached[index]}`);
        }
      }
    });

    await redisClient.disconnect();

    const redisHits = values.filter(v => v !== null).length;
    console.log(`[Spotify Features] Redis cache: ${redisHits}/${uncached.length} hits`);
  } catch (error: any) {
    console.error(`[Spotify Features] Redis read error: ${error.message}`);
  }

  return cached;
}

/**
 * Get audio features for multiple tracks (with caching)
 *
 * @param trackIds - Array of Spotify track IDs
 * @returns Map of track ID -> AudioFeatures
 *
 * Features:
 * - Checks cache first (Redis + memory)
 * - Fetches missing features from Spotify API in batch
 * - Caches new features with 7-day TTL
 * - Handles up to 100 tracks per call (Spotify API limit)
 *
 * Example:
 * ```typescript
 * const features = await getAudioFeatures(['track1', 'track2', 'track3']);
 * const track1Energy = features.get('track1')?.energy;
 * ```
 */
export async function getAudioFeatures(
  trackIds: string[]
): Promise<Map<string, AudioFeatures>> {
  if (trackIds.length === 0) {
    return new Map();
  }

  console.log(`[Spotify Features] Fetching audio features for ${trackIds.length} tracks...`);

  // Check cache
  const cached = await getCachedFeatures(trackIds);
  const uncached = trackIds.filter(id => !cached.has(id));

  if (uncached.length === 0) {
    console.log('[Spotify Features] ✅ All features found in cache');
    return cached;
  }

  console.log(`[Spotify Features] Cache miss: ${uncached.length}/${trackIds.length} tracks need fetching`);

  // Fetch missing features from Spotify
  const fetched = await fetchAudioFeaturesFromSpotify(uncached);

  // Cache the newly fetched features
  if (fetched.size > 0) {
    await cacheAudioFeatures(fetched);
  }

  // Merge cached + fetched
  const results = new Map([...cached, ...fetched]);

  console.log(`[Spotify Features] ✅ Total features: ${results.size}/${trackIds.length}`);
  return results;
}

/**
 * Get audio features for a single track
 * Convenience wrapper around getAudioFeatures()
 */
export async function getAudioFeature(trackId: string): Promise<AudioFeatures | null> {
  const results = await getAudioFeatures([trackId]);
  return results.get(trackId) || null;
}

/**
 * Get track popularity from Spotify API
 * Note: Popularity is NOT in audio-features endpoint, requires /tracks endpoint
 *
 * @param trackIds - Array of Spotify track IDs (max 50 per request)
 * @returns Map of track ID -> popularity (0-100)
 */
export async function getTrackPopularity(
  trackIds: string[]
): Promise<Map<string, number>> {
  if (trackIds.length === 0) {
    return new Map();
  }

  if (trackIds.length > 50) {
    console.warn(`[Spotify Features] Requested ${trackIds.length} tracks for popularity, limiting to 50`);
    trackIds = trackIds.slice(0, 50);
  }

  const token = await getSpotifyAccessToken();
  const idsParam = trackIds.join(',');

  console.log(`[Spotify Features] Fetching popularity for ${trackIds.length} tracks...`);

  const response = await fetch(
    `https://api.spotify.com/v1/tracks?ids=${idsParam}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const results = new Map<string, number>();

  if (data.tracks && Array.isArray(data.tracks)) {
    data.tracks.forEach((track: any) => {
      if (track && track.id) {
        results.set(track.id, track.popularity ?? 50);
      }
    });
  }

  console.log(`[Spotify Features] ✅ Retrieved popularity for ${results.size}/${trackIds.length} tracks`);
  return results;
}

/**
 * Clear cache for specific tracks (admin utility)
 */
export async function clearCache(trackIds?: string[]): Promise<void> {
  if (trackIds) {
    // Clear specific tracks
    trackIds.forEach(id => memoryCache.delete(id));
    console.log(`[Spotify Features] Cleared memory cache for ${trackIds.length} tracks`);

    if (redisClient) {
      try {
        if (!redisClient.isOpen) {
          await redisClient.connect();
        }

        const keys = trackIds.map(id => `audio_features:${id}`);
        await redisClient.del(keys);
        await redisClient.disconnect();

        console.log(`[Spotify Features] Cleared Redis cache for ${trackIds.length} tracks`);
      } catch (error: any) {
        console.error(`[Spotify Features] Redis clear error: ${error.message}`);
      }
    }
  } else {
    // Clear all
    memoryCache.clear();
    console.log('[Spotify Features] Cleared all memory cache');
  }
}
