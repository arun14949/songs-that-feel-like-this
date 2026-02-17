import { NextRequest, NextResponse } from 'next/server';
import { searchTrack, getTrackById } from '@/lib/spotify';
import type { SongSuggestion, SpotifyTrack, CuratedSong } from '@/lib/types';
import fs from 'fs';
import path from 'path';

// Load curated database for spotify_id lookup (cached at module level)
let curatedSongs: CuratedSong[] | null = null;

function loadCuratedSongs(): CuratedSong[] {
  if (curatedSongs) return curatedSongs;
  const dbPath = path.join(process.cwd(), 'data', 'songs', 'curated-indian-music.json');
  const raw = fs.readFileSync(dbPath, 'utf-8');
  const db = JSON.parse(raw);
  curatedSongs = db.songs;
  return curatedSongs!;
}

/**
 * Find a curated song by matching title and artist
 * Returns the curated song with spotify_id if found
 */
function findCuratedSong(title: string, artist: string): CuratedSong | undefined {
  const songs = loadCuratedSongs();
  const titleLower = title.toLowerCase().trim();
  const artistLower = artist.toLowerCase().trim();

  return songs.find(s => {
    const sTitleLower = s.title.toLowerCase().trim();
    const sArtistLower = s.artist.toLowerCase().trim();

    // Exact title match and artist contains or is contained
    return sTitleLower === titleLower && (
      sArtistLower.includes(artistLower) ||
      artistLower.includes(sArtistLower)
    );
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.songs || !Array.isArray(body.songs)) {
      return NextResponse.json(
        { error: 'Songs array is required' },
        { status: 400 }
      );
    }

    // Support progressive loading with phase parameter
    const phase = body.phase || 'all'; // 'initial', 'remaining', or 'all'
    let songs: SongSuggestion[];

    if (phase === 'initial') {
      // Load only first 3 songs for initial display
      songs = body.songs.slice(0, 3);
      console.log(`Progressive loading (initial): Searching Spotify for first ${songs.length} songs`);
    } else if (phase === 'remaining') {
      // Load remaining songs (already sliced by caller)
      songs = body.songs;
      console.log(`Progressive loading (remaining): Searching Spotify for ${songs.length} more songs`);
    } else {
      // Load all songs (default behavior)
      songs = body.songs;
      console.log(`Searching Spotify for ${songs.length} songs:`);
    }
    songs.forEach((song, i) => {
      console.log(`${i + 1}. "${song.title}" by ${song.artist}`);
    });

    // Add maximum timeout for entire search process
    // Vercel Hobby plan has 10-second hard limit, so we need to finish in 7s to leave buffer
    const MAX_SEARCH_TIME = 7000; // 7 seconds max for all songs (leaves 3s buffer for Vercel timeout)
    const searchStartTime = Date.now();

    // Search for each song on Spotify SEQUENTIALLY to avoid rate limiting
    // First try to match against curated database for exact spotify_id
    const results: (SpotifyTrack | null)[] = [];
    for (let i = 0; i < songs.length; i++) {
      // Check if we've exceeded max search time
      if (Date.now() - searchStartTime > MAX_SEARCH_TIME) {
        console.warn(`Spotify search timeout after ${i} songs`);
        break;
      }

      const song = songs[i];

      // Try to find exact match in curated database first
      const curatedMatch = findCuratedSong(song.title, song.artist);
      if (curatedMatch) {
        console.log(`✅ Curated match: "${song.title}" by ${song.artist} → spotify_id: ${curatedMatch.spotify_id}`);
        const track = await getTrackById(curatedMatch.spotify_id);
        results.push(track);
      } else {
        // Fallback to text search for non-curated songs
        console.log(`⚠️  No curated match for "${song.title}" by ${song.artist}, using Spotify search`);
        const track = await searchTrack(song.title, song.artist);
        results.push(track);
      }
    }

    // Filter out null results (songs not found on Spotify)
    const foundTracks = results.filter(
      (track): track is SpotifyTrack => track !== null
    );

    // Deduplicate tracks by Spotify ID (keep first occurrence)
    const seenIds = new Set<string>();
    const tracks = foundTracks.filter(track => {
      if (seenIds.has(track.id)) {
        console.log(`⚠️  Skipping duplicate track: "${track.name}" by ${track.artist} (ID: ${track.id})`);
        return false;
      }
      seenIds.add(track.id);
      return true;
    });

    const notFoundCount = results.length - foundTracks.length;
    const duplicateCount = foundTracks.length - tracks.length;
    if (notFoundCount > 0) {
      console.log(`⚠️  Could not find ${notFoundCount} out of ${songs.length} songs on Spotify`);
    }
    if (duplicateCount > 0) {
      console.log(`⚠️  Removed ${duplicateCount} duplicate song(s)`);
    }
    console.log(`✅ Found ${tracks.length} unique songs on Spotify`);

    return NextResponse.json({ tracks });
  } catch (error: any) {
    console.error('Error fetching Spotify data:', error);

    // Check if it's a rate limit error thrown by searchTrack()
    if (error.isRateLimit && error.retryAfter) {
      const retryAfterMinutes = Math.ceil(error.retryAfter / 60);
      console.error(`Spotify rate limit hit. Retry after: ${error.retryAfter} seconds (${retryAfterMinutes} minutes)`);

      return NextResponse.json(
        {
          error: `Spotify rate limit reached. Please try again in ${retryAfterMinutes} minute${retryAfterMinutes > 1 ? 's' : ''}.`,
          retryAfter: error.retryAfter,
          retryAfterMinutes
        },
        { status: 429 }
      );
    }

    // Also check for direct axios 429 errors (fallback)
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || '60';
      const retryAfterMinutes = Math.ceil(parseInt(retryAfter) / 60);

      return NextResponse.json(
        {
          error: `Spotify rate limit reached. Please try again in ${retryAfterMinutes} minute${retryAfterMinutes > 1 ? 's' : ''}.`,
          retryAfter: parseInt(retryAfter),
          retryAfterMinutes
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch Spotify data. Please try again.' },
      { status: 500 }
    );
  }
}
