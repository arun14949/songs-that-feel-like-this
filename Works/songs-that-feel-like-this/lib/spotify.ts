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

  // Try multiple search strategies in order of specificity
  const searchStrategies = [
    // Strategy 1: Exact match with quotes
    `track:"${title}" artist:"${artist}"`,
    // Strategy 2: Without quotes (more flexible)
    `${title} ${artist}`,
    // Strategy 3: Just the track name
    title,
  ];

  try {
    for (const query of searchStrategies) {
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        params: {
          q: query,
          type: 'track',
          limit: 5, // Get top 5 to find best match
        },
      });

      if (response.data.tracks.items.length === 0) {
        continue; // Try next strategy
      }

      // Find the best matching track
      const tracks = response.data.tracks.items;

      // Prefer exact artist match if available
      let bestMatch = tracks.find((track: any) =>
        track.artists.some((a: any) =>
          a.name.toLowerCase().includes(artist.toLowerCase()) ||
          artist.toLowerCase().includes(a.name.toLowerCase())
        )
      );

      // If no artist match, use first result
      if (!bestMatch) {
        bestMatch = tracks[0];
      }

      return {
        id: bestMatch.id,
        name: bestMatch.name,
        artist: bestMatch.artists[0].name,
        albumArt: bestMatch.album.images[0]?.url || '',
        embedUrl: `https://open.spotify.com/embed/track/${bestMatch.id}`,
        spotifyUrl: bestMatch.external_urls.spotify,
        previewUrl: bestMatch.preview_url,
      };
    }

    // If all strategies failed
    console.log(`No Spotify match found for: ${title} by ${artist}`);
    return null;
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return null;
  }
}
