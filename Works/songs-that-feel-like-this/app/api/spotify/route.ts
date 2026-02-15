import { NextRequest, NextResponse } from 'next/server';
import { searchTrack } from '@/lib/spotify';
import type { SongSuggestion, SpotifyTrack } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.songs || !Array.isArray(body.songs)) {
      return NextResponse.json(
        { error: 'Songs array is required' },
        { status: 400 }
      );
    }

    const songs: SongSuggestion[] = body.songs;
    console.log(`Searching Spotify for ${songs.length} songs:`);
    songs.forEach((song, i) => {
      console.log(`${i + 1}. "${song.title}" by ${song.artist}`);
    });

    // Add maximum timeout for entire search process
    // Vercel Hobby plan has 10-second hard limit, so we need to finish in 7s to leave buffer
    const MAX_SEARCH_TIME = 7000; // 7 seconds max for all songs (leaves 3s buffer for Vercel timeout)
    const searchStartTime = Date.now();

    // Search for each song on Spotify SEQUENTIALLY to avoid rate limiting
    // Instead of Promise.all (parallel), we do one at a time
    const results: (SpotifyTrack | null)[] = [];
    for (let i = 0; i < songs.length; i++) {
      // Check if we've exceeded max search time
      if (Date.now() - searchStartTime > MAX_SEARCH_TIME) {
        console.warn(`Spotify search timeout after ${i} songs`);
        break;
      }

      const song = songs[i];
      const track = await searchTrack(song.title, song.artist);
      results.push(track);

      // No delay needed - Spotify's rate limit is 180 requests/minute (3/second)
      // Searching 6 songs sequentially without delays = ~1-2 seconds (well under limit)
    }

    // Filter out null results (songs not found on Spotify)
    const tracks = results.filter(
      (track): track is SpotifyTrack => track !== null
    );

    const notFoundCount = results.length - tracks.length;
    if (notFoundCount > 0) {
      console.log(`⚠️  Could not find ${notFoundCount} out of ${songs.length} songs on Spotify`);
    }
    console.log(`✅ Found ${tracks.length} songs on Spotify`);

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
