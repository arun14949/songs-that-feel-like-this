export interface MoodAnalysis {
  mood: string;
  description: string;
}

export interface SongSuggestion {
  title: string;
  artist: string;
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
  songs: SpotifyTrack[];
  createdAt: string;
}
