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
      timeout: 2000, // 2 second timeout per song search (reduced to fit Vercel 10s limit)
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
        // Use first result as fallback, but warn if it's not a good match
        bestMatch = tracks[0];
        console.warn(`⚠️  No exact match for "${title}" by ${artist}. Using fallback: "${bestMatch.name}" by ${bestMatch.artists[0].name}`);
      } else {
        console.log(`✅ Found match: "${title}" by ${artist} → "${bestMatch.name}" by ${bestMatch.artists[0].name}`);
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
      const retryAfter = error.response.headers['retry-after'] || '60';
      console.error(`Spotify rate limit hit. Retry after: ${retryAfter} seconds`);

      // DON'T wait - throw error with retry-after info so it propagates to frontend
      const rateLimitError: any = new Error(`Spotify rate limit reached. Please try again in ${Math.ceil(parseInt(retryAfter) / 60)} minutes.`);
      rateLimitError.isRateLimit = true;
      rateLimitError.retryAfter = parseInt(retryAfter);
      throw rateLimitError;
    }

    console.error('Error searching Spotify:', error);
    return null;
  }
}
