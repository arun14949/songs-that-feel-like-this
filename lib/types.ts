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

// ============================================================================
// V2.0 SCORING ARCHITECTURE TYPES
// ============================================================================

/**
 * Image analysis output from GPT
 * Replaces direct song suggestions with structured emotional/visual traits
 */
export interface ImageAnalysis {
  mood: string;                    // Hyper-specific emotion description
  target_energy: number;           // 0-1 scale (intensity/activity)
  target_valence: number;          // 0-1 scale (happiness/positivity)
  texture: string;                 // Visual grain/aesthetic (e.g., "warm-grainy-analog")
  color_temperature: string;       // Warm/cool (e.g., "golden-amber", "cool-blue")
  era_preference: string;          // Preferred decade (e.g., "2010s", "1990s")
  language_bias: string[];         // Preferred languages (e.g., ["Malayalam", "Tamil"])
  vibe_tags: string[];             // Mood keywords (e.g., ["indie", "nostalgic", "monsoon"])
}

/**
 * Spotify audio features for a track
 * Retrieved from Spotify /audio-features endpoint
 */
export interface AudioFeatures {
  energy: number;                  // 0-1 (intensity/activity)
  valence: number;                 // 0-1 (musical positiveness/happiness)
  danceability: number;            // 0-1 (how suitable for dancing)
  acousticness: number;            // 0-1 (acoustic vs. electric)
  instrumentalness: number;        // 0-1 (lack of vocals)
  tempo: number;                   // BPM
  loudness: number;                // dB
  mode: number;                    // 0=Minor, 1=Major
  speechiness?: number;            // 0-1 (presence of spoken words)
  liveness?: number;               // 0-1 (presence of audience)
}

/**
 * Candidate track from any source (curated DB, GPT, or Spotify search)
 */
export interface CandidateTrack {
  spotify_id: string;              // Spotify track ID
  title: string;                   // Song title
  artist: string;                  // Artist name
  year?: number;                   // Release year
  language?: string;               // Language of the song
  genre_tags?: string[];           // Genre classifications
  vibe_tags?: string[];            // Mood/vibe keywords
  popularity?: number;             // Spotify popularity (0-100)
  source: 'curated' | 'gpt' | 'spotify_search';  // Origin of candidate
}

/**
 * Configurable weights for the scoring algorithm
 */
export interface ScoringWeights {
  energy: number;                  // Weight for energy match (default: 0.25)
  valence: number;                 // Weight for valence match (default: 0.25)
  popularity: number;              // Weight for popularity score (default: 0.20)
  language: number;                // Weight for language match (default: 0.15)
  era: number;                     // Weight for era match (default: 0.10)
  vibe: number;                    // Weight for vibe tag match (default: 0.05)
}

/**
 * Individual score breakdown for a track
 */
export interface ScoreBreakdown {
  energy: number;                  // 0-1 based on |track.energy - target_energy|
  valence: number;                 // 0-1 based on |track.valence - target_valence|
  popularity: number;              // 0-1 with bonuses/penalties
  language: number;                // 1.0 if match, 0.5 otherwise
  era: number;                     // 1.0 if match, 0.7 otherwise
  vibe: number;                    // Intersection score of vibe tags
  total: number;                   // Weighted sum of all scores
}

/**
 * Track with scoring results and audio features
 */
export interface ScoredTrack {
  track: CandidateTrack;           // Original candidate
  audioFeatures: AudioFeatures;    // Spotify audio analysis
  scores: ScoreBreakdown;          // Individual + total scores
  rank: number;                    // Position after sorting (1-based)
  confidence: 'perfect' | 'good' | 'partial' | 'fallback';  // Match quality
  explanation?: string;            // GPT-generated connection to image
}

/**
 * Constraint configuration for diversity enforcement
 */
export interface ConstraintConfig {
  maxMainstream: number;           // Max tracks with popularity > 80 (default: 1)
  minDeepCuts: number;             // Min tracks with popularity < 40 (default: 2)
  minDecades: number;              // Min different decades (default: 2)
  allowDuplicateArtists: boolean;  // Allow same artist twice (default: false)
  blacklist: string[];             // Spotify IDs to never recommend
}

/**
 * Curated song database entry
 */
export interface CuratedSong {
  id: string;                      // Internal ID (e.g., "mal-001")
  spotify_id: string;              // Spotify track ID
  title: string;
  artist: string;
  composer?: string;
  language: string;
  year: number;
  album?: string;
  category: string;                // e.g., "Malayalam Film Song"
  genre_tags: string[];
  vibe_tags: string[];
  visual_moods: string[];          // Visual contexts (e.g., "city-night", "rain")
  popularity_tier: 'deep_cut' | 'moderate' | 'mainstream';
  is_indie: boolean;
  emotional_keywords: string[];
}

/**
 * Curated database file structure
 */
export interface CuratedDatabase {
  metadata: {
    total_songs: number;
    version: string;
    last_updated: string;
    description: string;
    languages: string[];
    popularity_tiers: {
      deep_cut: string;
      moderate: string;
      mainstream: string;
    };
  };
  songs: CuratedSong[];
}
