export interface MoodAnalysis {
  mood: string;
  description: string;
}

export interface SongSuggestion {
  title: string;
  artist: string;
  language?: string;
  category?: string;
  reason?: string;
  // v2.0 additions for richer metadata
  album?: string;
  year?: number;
  composer?: string;
  spotify_search_query?: string;
  visual_connection?: string;  // More specific than "reason"
  genre_tag?: string;
  popularity_tier?: 'mainstream' | 'well_known' | 'deep_cut' | 'obscure';
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  embedUrl: string;          // For in-app preview player
  spotifyUrl: string;         // For "Open in Spotify" button
  previewUrl?: string;        // 30-second MP3 preview (optional)
}

export interface Recommendation {
  id: string;
  mood: string;
  songs: SpotifyTrack[];           // Initial 3 songs with Spotify data (or all songs if fully loaded)
  allSongSuggestions?: SongSuggestion[]; // Original 4-5 AI suggestions for progressive loading
  imageUrl?: string;  // Base64 encoded uploaded image
  createdAt: string;
}
