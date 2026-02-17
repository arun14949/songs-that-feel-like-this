/**
 * Scoring Engine Module
 *
 * Multi-criteria scoring algorithm for ranking candidate tracks.
 * Scores based on:
 * - Energy match (0.25 weight)
 * - Valence match (0.25 weight)
 * - Popularity tier (0.20 weight) - with bonuses/penalties
 * - Language match (0.15 weight)
 * - Era match (0.10 weight)
 * - Vibe tag match (0.05 weight)
 *
 * Total score range: 0-1 (higher is better)
 */

import type {
  ImageAnalysis,
  CandidateTrack,
  AudioFeatures,
  ScoredTrack,
  ScoringWeights,
  ScoreBreakdown
} from './types';

/**
 * Default scoring weights
 * These can be overridden via environment variables or function parameters
 */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  energy: parseFloat(process.env.SCORING_WEIGHT_ENERGY || '0.25'),
  valence: parseFloat(process.env.SCORING_WEIGHT_VALENCE || '0.25'),
  popularity: parseFloat(process.env.SCORING_WEIGHT_POPULARITY || '0.20'),
  language: parseFloat(process.env.SCORING_WEIGHT_LANGUAGE || '0.15'),
  era: parseFloat(process.env.SCORING_WEIGHT_ERA || '0.10'),
  vibe: parseFloat(process.env.SCORING_WEIGHT_VIBE || '0.05'),
};

/**
 * Calculate energy match score
 * Returns 1.0 for perfect match, decreases linearly with distance
 * Score = 1 - |track.energy - target_energy|
 */
function scoreEnergy(
  trackEnergy: number,
  targetEnergy: number
): number {
  const distance = Math.abs(trackEnergy - targetEnergy);
  return Math.max(0, 1 - distance);
}

/**
 * Calculate valence (happiness) match score
 * Returns 1.0 for perfect match, decreases linearly with distance
 * Score = 1 - |track.valence - target_valence|
 */
function scoreValence(
  trackValence: number,
  targetValence: number
): number {
  const distance = Math.abs(trackValence - targetValence);
  return Math.max(0, 1 - distance);
}

/**
 * Calculate popularity score with bonuses/penalties
 *
 * Scoring rules:
 * - Deep cuts (< 40): Base score + 0.3 bonus
 * - Moderate (40-80): Base score (no bonus/penalty)
 * - Mainstream (> 80): Base score - 0.2 penalty
 *
 * Base score: Linear from 0-100 popularity (normalized to 0-1)
 */
function scorePopularity(popularity: number): number {
  const baseScore = popularity / 100; // Normalize to 0-1

  if (popularity < 40) {
    // Deep cut bonus
    return Math.min(1.0, baseScore + 0.3);
  } else if (popularity > 80) {
    // Mainstream penalty
    return Math.max(0, baseScore - 0.2);
  } else {
    // Moderate popularity (no adjustment)
    return baseScore;
  }
}

/**
 * Calculate language match score
 * Returns 1.0 if track language matches any in language_bias
 * Returns 0.5 otherwise (partial credit for non-matching languages)
 */
function scoreLanguage(
  trackLanguage: string | undefined,
  languageBias: string[]
): number {
  if (!trackLanguage || languageBias.length === 0) {
    return 0.5; // Neutral if no language info
  }

  const trackLangLower = trackLanguage.toLowerCase();
  const isMatch = languageBias.some(lang =>
    lang.toLowerCase() === trackLangLower
  );

  return isMatch ? 1.0 : 0.5;
}

/**
 * Calculate era (decade) match score
 * Returns 1.0 if track year is within target decade
 * Returns 0.7 if track year is within ±10 years of target
 * Returns 0.4 otherwise
 */
function scoreEra(
  trackYear: number | undefined,
  eraPreference: string
): number {
  if (!trackYear) {
    return 0.5; // Neutral if no year info
  }

  // Extract decade from era preference (e.g., "2010s" -> 2010)
  const targetDecade = parseInt(eraPreference.replace(/s$/, ''));
  if (isNaN(targetDecade)) {
    return 0.5;
  }

  const yearDiff = Math.abs(trackYear - targetDecade);

  if (yearDiff <= 5) {
    return 1.0; // Within target decade
  } else if (yearDiff <= 10) {
    return 0.7; // Adjacent decade
  } else {
    return 0.4; // Distant era
  }
}

/**
 * Calculate vibe tag match score
 * Returns intersection ratio: (matching tags) / (target tags)
 * Uses fuzzy matching (substring contains)
 */
function scoreVibeTags(
  trackVibeTags: string[] = [],
  trackGenreTags: string[] = [],
  targetVibeTags: string[]
): number {
  if (targetVibeTags.length === 0) {
    return 0.5; // Neutral if no target vibe tags
  }

  const allTrackTags = [...trackVibeTags, ...trackGenreTags];
  const trackTagsLower = allTrackTags.map(t => t.toLowerCase());
  const targetTagsLower = targetVibeTags.map(t => t.toLowerCase());

  const matches = targetTagsLower.filter(targetTag =>
    trackTagsLower.some(trackTag =>
      trackTag.includes(targetTag) || targetTag.includes(trackTag)
    )
  );

  return matches.length / targetVibeTags.length;
}

/**
 * Score a single track based on image analysis and audio features
 *
 * @param track - Candidate track to score
 * @param audioFeatures - Spotify audio features for the track
 * @param analysis - Image analysis with target values
 * @param weights - Scoring weights (optional, uses defaults)
 * @returns Scored track with breakdown
 */
export function scoreTrack(
  track: CandidateTrack,
  audioFeatures: AudioFeatures,
  analysis: ImageAnalysis,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): ScoredTrack {
  // Calculate individual scores
  const energyScore = scoreEnergy(audioFeatures.energy, analysis.target_energy);
  const valenceScore = scoreValence(audioFeatures.valence, analysis.target_valence);
  const popularityScore = scorePopularity(track.popularity || 50);
  const languageScore = scoreLanguage(track.language, analysis.language_bias);
  const eraScore = scoreEra(track.year, analysis.era_preference);
  const vibeScore = scoreVibeTags(
    track.vibe_tags,
    track.genre_tags,
    analysis.vibe_tags
  );

  // Calculate weighted total score
  const totalScore = (
    energyScore * weights.energy +
    valenceScore * weights.valence +
    popularityScore * weights.popularity +
    languageScore * weights.language +
    eraScore * weights.era +
    vibeScore * weights.vibe
  );

  // Determine confidence level based on total score
  let confidence: 'perfect' | 'good' | 'partial' | 'fallback';
  if (totalScore >= 0.8) {
    confidence = 'perfect';
  } else if (totalScore >= 0.6) {
    confidence = 'good';
  } else if (totalScore >= 0.4) {
    confidence = 'partial';
  } else {
    confidence = 'fallback';
  }

  return {
    track,
    audioFeatures,
    scores: {
      energy: energyScore,
      valence: valenceScore,
      popularity: popularityScore,
      language: languageScore,
      era: eraScore,
      vibe: vibeScore,
      total: totalScore,
    },
    rank: 0, // Will be set after sorting
    confidence,
  };
}

/**
 * Rank candidates by scoring them and sorting by total score
 *
 * @param candidates - Array of candidate tracks
 * @param audioFeaturesMap - Map of spotify_id -> AudioFeatures
 * @param analysis - Image analysis with target values
 * @param weights - Optional custom weights
 * @returns Sorted array of scored tracks (highest score first)
 */
export function rankCandidates(
  candidates: CandidateTrack[],
  audioFeaturesMap: Map<string, AudioFeatures>,
  analysis: ImageAnalysis,
  weights?: ScoringWeights
): ScoredTrack[] {
  console.log(`[Scoring Engine] Scoring ${candidates.length} candidates...`);

  // Score all candidates that have audio features
  const scored: ScoredTrack[] = [];

  for (const candidate of candidates) {
    const features = audioFeaturesMap.get(candidate.spotify_id);

    if (!features) {
      console.warn(`[Scoring Engine] Missing audio features for ${candidate.spotify_id}, skipping`);
      continue;
    }

    const scoredTrack = scoreTrack(candidate, features, analysis, weights);
    scored.push(scoredTrack);
  }

  // Sort by total score (descending)
  scored.sort((a, b) => b.scores.total - a.scores.total);

  // Assign ranks (1-based)
  scored.forEach((track, index) => {
    track.rank = index + 1;
  });

  // Log scoring statistics
  const avgScore = scored.reduce((sum, t) => sum + t.scores.total, 0) / scored.length;
  const confidenceCounts = scored.reduce((acc, t) => {
    acc[t.confidence] = (acc[t.confidence] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`[Scoring Engine] ✅ Scored ${scored.length} tracks`);
  console.log(`[Scoring Engine] Average score: ${avgScore.toFixed(3)}`);
  console.log(`[Scoring Engine] Confidence distribution:`, confidenceCounts);

  if (scored.length > 0) {
    console.log(`[Scoring Engine] Top track: "${scored[0].track.title}" by ${scored[0].track.artist} (score: ${scored[0].scores.total.toFixed(3)})`);
  }

  return scored;
}

/**
 * Get score explanation for debugging/transparency
 * Returns human-readable breakdown of why a track scored the way it did
 */
export function explainScore(scoredTrack: ScoredTrack, analysis: ImageAnalysis): string {
  const { track, scores, audioFeatures } = scoredTrack;

  const lines = [
    `Track: "${track.title}" by ${track.artist}`,
    `Overall Score: ${scores.total.toFixed(3)} (Rank #${scoredTrack.rank})`,
    `Confidence: ${scoredTrack.confidence}`,
    '',
    'Score Breakdown:',
    `  Energy: ${scores.energy.toFixed(3)} (track: ${audioFeatures.energy.toFixed(2)}, target: ${analysis.target_energy.toFixed(2)})`,
    `  Valence: ${scores.valence.toFixed(3)} (track: ${audioFeatures.valence.toFixed(2)}, target: ${analysis.target_valence.toFixed(2)})`,
    `  Popularity: ${scores.popularity.toFixed(3)} (${track.popularity || 'unknown'})`,
    `  Language: ${scores.language.toFixed(3)} (track: ${track.language || 'unknown'}, target: ${analysis.language_bias.join(', ')})`,
    `  Era: ${scores.era.toFixed(3)} (track: ${track.year || 'unknown'}, target: ${analysis.era_preference})`,
    `  Vibe Tags: ${scores.vibe.toFixed(3)}`,
  ];

  return lines.join('\n');
}
