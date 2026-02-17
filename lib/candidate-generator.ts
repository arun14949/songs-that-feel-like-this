/**
 * Candidate Generator Module
 *
 * Generates 40-60 candidate tracks from multiple sources:
 * 1. Curated Database - Pre-vetted Indian songs with rich metadata
 * 2. Spotify Search - Broad search based on vibe tags and language
 * 3. GPT Suggestions - Optional AI-generated specific recommendations
 *
 * Candidates are deduplicated by spotify_id before scoring.
 */

import fs from 'fs';
import path from 'path';
import type { ImageAnalysis, CandidateTrack, CuratedDatabase, CuratedSong } from './types';

// Spotify API credentials (shared with spotify-features.ts)
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Spotify access token cache (in-memory, short-lived)
let spotifyAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get Spotify access token using Client Credentials flow
 */
async function getSpotifyAccessToken(): Promise<string> {
  if (spotifyAccessToken && Date.now() < tokenExpiresAt) {
    return spotifyAccessToken;
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing Spotify API credentials');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
      ).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json();
  spotifyAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;

  if (!spotifyAccessToken) {
    throw new Error('Failed to obtain Spotify access token');
  }

  return spotifyAccessToken;
}

/**
 * Load curated database from disk (cached at module level)
 */
let curatedDatabase: CuratedDatabase | null = null;

function loadCuratedDatabase(): CuratedDatabase {
  if (curatedDatabase) {
    return curatedDatabase;
  }

  const dbPath = path.join(process.cwd(), 'data', 'songs', 'curated-indian-music.json');

  if (!fs.existsSync(dbPath)) {
    console.warn('[Candidate Generator] Curated database not found, skipping curated source');
    return { metadata: { total_songs: 0, version: '0.0.0', last_updated: '', description: '', languages: [], popularity_tiers: { deep_cut: '', moderate: '', mainstream: '' } }, songs: [] };
  }

  const raw = fs.readFileSync(dbPath, 'utf-8');
  curatedDatabase = JSON.parse(raw);

  console.log(`[Candidate Generator] Loaded ${curatedDatabase.songs.length} curated songs`);
  return curatedDatabase;
}

/**
 * Calculate tag match score between song tags and target vibe tags
 * Returns score between 0-1 based on intersection
 */
function calculateTagMatchScore(
  songTags: string[],
  targetTags: string[]
): number {
  if (targetTags.length === 0) return 0.5; // Neutral if no target tags

  const songTagsLower = songTags.map(t => t.toLowerCase());
  const targetTagsLower = targetTags.map(t => t.toLowerCase());

  const intersection = songTagsLower.filter(tag =>
    targetTagsLower.some(target => tag.includes(target) || target.includes(tag))
  );

  return intersection.length / targetTags.length;
}

/**
 * Get candidates from curated database
 * Filters by language, era, and vibe tags
 * Returns top 20 matches sorted by tag relevance
 */
export async function getCuratedCandidates(
  analysis: ImageAnalysis
): Promise<CandidateTrack[]> {
  console.log('[Candidate Generator] Searching curated database...');

  const db = loadCuratedDatabase();
  if (db.songs.length === 0) {
    return [];
  }

  const { language_bias, era_preference, vibe_tags } = analysis;

  // Extract decade from era preference (e.g., "2010s" -> 2010)
  const targetDecade = era_preference ? parseInt(era_preference.replace(/s$/, '')) : null;

  // Filter and score songs
  const scored = db.songs.map(song => {
    // Language match
    const languageMatch = language_bias.length === 0 ||
      language_bias.some(lang => lang.toLowerCase() === song.language.toLowerCase());

    // Era match (within ±5 years of target decade)
    const eraMatch = !targetDecade ||
      Math.abs(song.year - targetDecade) <= 5 ||
      Math.floor(song.year / 10) * 10 === targetDecade;

    // Vibe tag match (combine genre_tags, vibe_tags, visual_moods)
    const allSongTags = [
      ...song.genre_tags,
      ...song.vibe_tags,
      ...song.visual_moods,
      ...song.emotional_keywords
    ];
    const vibeScore = calculateTagMatchScore(allSongTags, vibe_tags);

    // Total score (weighted)
    const score = (
      (languageMatch ? 1.0 : 0.3) * 0.4 +
      (eraMatch ? 1.0 : 0.5) * 0.2 +
      vibeScore * 0.4
    );

    return { song, score };
  });

  // Sort by score and take top 20
  const topSongs = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ song }) => song);

  // Convert to CandidateTrack format
  const candidates: CandidateTrack[] = topSongs.map(song => ({
    spotify_id: song.spotify_id,
    title: song.title,
    artist: song.artist,
    year: song.year,
    language: song.language,
    genre_tags: song.genre_tags,
    vibe_tags: song.vibe_tags,
    source: 'curated' as const
  }));

  console.log(`[Candidate Generator] ✅ Found ${candidates.length} curated candidates`);
  return candidates;
}

/**
 * Get candidates from Spotify Search API
 * Constructs query from language bias and vibe tags
 * Returns up to 30 tracks
 */
export async function getSpotifySearchCandidates(
  analysis: ImageAnalysis
): Promise<CandidateTrack[]> {
  console.log('[Candidate Generator] Searching Spotify...');

  const { language_bias, vibe_tags } = analysis;

  // Construct search query
  // Format: "Malayalam indie nostalgic" or "Tamil folk romantic"
  const languagePart = language_bias.slice(0, 2).join(' '); // Max 2 languages
  const vibePart = vibe_tags.slice(0, 3).join(' '); // Max 3 vibe tags
  const query = `${languagePart} ${vibePart}`.trim();

  if (!query) {
    console.warn('[Candidate Generator] No query terms, skipping Spotify search');
    return [];
  }

  try {
    const token = await getSpotifyAccessToken();

    // Search for tracks
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=30&market=IN`;

    console.log(`[Candidate Generator] Spotify query: "${query}"`);

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Candidate Generator] Spotify search error: ${response.status} - ${error}`);
      return [];
    }

    const data = await response.json();
    const tracks = data.tracks?.items || [];

    // Convert to CandidateTrack format
    const candidates: CandidateTrack[] = tracks.map((track: any) => ({
      spotify_id: track.id,
      title: track.name,
      artist: track.artists?.[0]?.name || 'Unknown',
      year: track.album?.release_date ? parseInt(track.album.release_date.split('-')[0]) : undefined,
      popularity: track.popularity,
      source: 'spotify_search' as const
    }));

    console.log(`[Candidate Generator] ✅ Found ${candidates.length} Spotify search candidates`);
    return candidates;
  } catch (error: any) {
    console.error(`[Candidate Generator] Spotify search failed: ${error.message}`);
    return [];
  }
}

/**
 * Get candidates from GPT suggestions (optional)
 * Uses existing song recommendation logic from /api/analyze
 * Returns 5-8 specific song suggestions
 *
 * Note: This is optional and can be disabled to rely purely on
 * curated database + Spotify search for faster performance
 */
export async function getGPTCandidates(
  analysis: ImageAnalysis
): Promise<CandidateTrack[]> {
  console.log('[Candidate Generator] Getting GPT suggestions...');

  // TODO: Implement GPT song suggestion API call
  // For now, return empty array (will be implemented in later phase)
  console.log('[Candidate Generator] GPT suggestions not implemented yet, skipping');
  return [];
}

/**
 * Generate candidates from all sources
 * Combines curated database, Spotify search, and optional GPT suggestions
 * Deduplicates by spotify_id (keeps first occurrence)
 *
 * @param analysis - Image analysis with vibe tags, language bias, etc.
 * @param options - Control which sources to use
 * @returns Array of 40-60 unique candidate tracks
 */
export async function generateCandidates(
  analysis: ImageAnalysis,
  options: {
    useCurated?: boolean;
    useSpotifySearch?: boolean;
    useGPT?: boolean;
  } = {}
): Promise<CandidateTrack[]> {
  const {
    useCurated = true,
    useSpotifySearch = true,
    useGPT = false, // Disabled by default for now
  } = options;

  console.log('[Candidate Generator] Starting candidate generation...');
  console.log(`[Candidate Generator] Sources: curated=${useCurated}, spotify=${useSpotifySearch}, gpt=${useGPT}`);

  const allCandidates: CandidateTrack[] = [];

  // Fetch from all sources in parallel
  const sources = await Promise.allSettled([
    useCurated ? getCuratedCandidates(analysis) : Promise.resolve([]),
    useSpotifySearch ? getSpotifySearchCandidates(analysis) : Promise.resolve([]),
    useGPT ? getGPTCandidates(analysis) : Promise.resolve([]),
  ]);

  // Combine results (filter out failed promises)
  sources.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allCandidates.push(...result.value);
    } else {
      const sourceName = ['curated', 'spotify', 'gpt'][index];
      console.error(`[Candidate Generator] ${sourceName} source failed:`, result.reason);
    }
  });

  // Deduplicate by spotify_id (keep first occurrence)
  const seen = new Set<string>();
  const unique = allCandidates.filter(candidate => {
    if (seen.has(candidate.spotify_id)) {
      return false;
    }
    seen.add(candidate.spotify_id);
    return true;
  });

  console.log(`[Candidate Generator] ✅ Total candidates: ${unique.length} (${allCandidates.length} before deduplication)`);

  // Log source distribution
  const sourceCounts = unique.reduce((acc, c) => {
    acc[c.source] = (acc[c.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('[Candidate Generator] Source distribution:', sourceCounts);

  return unique;
}
