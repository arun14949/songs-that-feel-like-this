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
    const MAX_SEARCH_TIME = 15000; // 15 seconds max for all songs
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

      // Minimal delay between songs to respect rate limits (except after last song)
      if (i < songs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms to 50ms
      }
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

    // Check if it's a rate limit error from any of the search requests
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || '60';
      console.error(`Spotify rate limit hit. Retry after: ${retryAfter} seconds`);

      return NextResponse.json(
        {
          error: `Spotify rate limit reached. Please wait ${retryAfter} seconds and try again.`,
          retryAfter: parseInt(retryAfter)
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
