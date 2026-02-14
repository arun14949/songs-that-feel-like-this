import axios from 'axios';
import type { SpotifyTrack } from './types';

interface SpotifyToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: SpotifyToken | null = null;

async function getAccessToken(): Promise<string> {
  // Check credentials
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing Spotify API credentials');
  }

  // Return cached token if still valid
  if (cachedToken && cachedToken.expires_at > Date.now()) {
    return cachedToken.access_token;
  }

  // Get new token
  const auth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  cachedToken = {
    access_token: response.data.access_token,
    expires_at: Date.now() + (response.data.expires_in * 1000) - 60000, // 1 minute buffer
  };

  return cachedToken.access_token;
}

export async function searchTrack(title: string, artist: string): Promise<SpotifyTrack | null> {
  const accessToken = await getAccessToken();

  const query = `track:"${title}" artist:"${artist}"`;

  try {
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      params: {
        q: query,
        type: 'track',
        limit: 1,
      },
    });

    if (response.data.tracks.items.length === 0) {
      return null;
    }

    const track = response.data.tracks.items[0];

    return {
      id: track.id,
      name: track.name,
      artist: track.artists[0].name,
      albumArt: track.album.images[0]?.url || '',
      embedUrl: `https://open.spotify.com/embed/track/${track.id}`,
      spotifyUrl: track.external_urls.spotify,
      previewUrl: track.preview_url,
    };
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return null;
  }
}
