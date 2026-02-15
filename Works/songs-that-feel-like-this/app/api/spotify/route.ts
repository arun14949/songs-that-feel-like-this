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

    // Search for each song on Spotify SEQUENTIALLY to avoid rate limiting
    // Instead of Promise.all (parallel), we do one at a time
    const results: (SpotifyTrack | null)[] = [];
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const track = await searchTrack(song.title, song.artist);
      results.push(track);
      // Small delay between songs to respect rate limits (except after last song)
      if (i < songs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
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

    return NextResponse.json(
      { error: 'Failed to fetch Spotify data. Please try again.' },
      { status: 500 }
    );
  }
}
