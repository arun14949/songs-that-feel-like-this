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

    // Search for each song on Spotify
    const searchPromises = songs.map(song =>
      searchTrack(song.title, song.artist)
    );

    const results = await Promise.all(searchPromises);

    // Filter out null results (songs not found on Spotify)
    const tracks = results.filter(
      (track): track is SpotifyTrack => track !== null
    );

    return NextResponse.json({ tracks });
  } catch (error: any) {
    console.error('Error fetching Spotify data:', error);

    return NextResponse.json(
      { error: 'Failed to fetch Spotify data. Please try again.' },
      { status: 500 }
    );
  }
}
