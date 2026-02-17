/**
 * Admin API: Search Spotify for songs
 *
 * POST /api/admin/search-spotify
 * Body: { query: string }
 */

import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime for Buffer support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Simple in-memory token cache
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
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
    throw new Error('Failed to get Spotify token');
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;

  if (!cachedToken) {
    throw new Error('Failed to obtain Spotify access token');
  }

  return cachedToken;
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const token = await getSpotifyToken();

    // Search Spotify
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Spotify search failed');
    }

    const data = await response.json();

    // Format results
    const tracks = data.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((a: any) => ({ name: a.name })),
      album: track.album.name,
      year: track.album.release_date ? parseInt(track.album.release_date.split('-')[0]) : null,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
    }));

    return NextResponse.json({ tracks });

  } catch (error: any) {
    console.error('[Admin Search] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
