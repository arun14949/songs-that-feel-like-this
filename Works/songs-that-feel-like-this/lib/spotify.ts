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

// Helper to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function searchTrack(title: string, artist: string): Promise<SpotifyTrack | null> {
  const accessToken = await getAccessToken();

  try {
    // Start with most flexible search (works best for most cases)
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      params: {
        q: `${title} ${artist}`,
        type: 'track',
        limit: 10, // Get more results for better matching
      },
    });

    if (response.data.tracks.items.length > 0) {

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

    // If no results found
    console.log(`No Spotify match found for: ${title} by ${artist}`);
    return null;
  } catch (error: any) {
    // Check if it's a rate limit error
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.error(`Spotify rate limit hit. Retry after: ${retryAfter} seconds`);
      // Wait and retry once
      await delay(parseInt(retryAfter || '2') * 1000);
      try {
        // Retry with just the first strategy
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          params: {
            q: `${title} ${artist}`,
            type: 'track',
            limit: 1,
          },
        });
        if (response.data.tracks.items.length > 0) {
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
        }
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    }
    console.error('Error searching Spotify:', error);
    return null;
  }
}
