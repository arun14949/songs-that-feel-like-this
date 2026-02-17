/**
 * Constraint Engine Module
 *
 * Enforces diversity constraints on ranked track selection.
 * Ensures recommendations follow quality rules:
 * - Max 1 mainstream track (popularity > 80)
 * - Min 2 deep cuts (popularity < 40)
 * - No duplicate artists
 * - At least 2 different decades represented
 * - No blacklisted songs
 * - Language diversity (if multi-language bias)
 *
 * Selection Algorithm:
 * 1. Start with top-scored tracks
 * 2. Add tracks one by one if they don't violate constraints
 * 3. Stop when we have 4-5 tracks
 * 4. If constraints can't be met, relax least important constraint
 */

import type { ScoredTrack, ConstraintConfig } from './types';

/**
 * Default constraint configuration
 * Can be overridden via environment variables or function parameters
 */
export const DEFAULT_CONSTRAINTS: ConstraintConfig = {
  maxMainstream: parseInt(process.env.CONSTRAINT_MAX_MAINSTREAM || '1'),
  minDeepCuts: parseInt(process.env.CONSTRAINT_MIN_DEEP_CUTS || '2'),
  minDecades: parseInt(process.env.CONSTRAINT_MIN_DECADES || '2'),
  allowDuplicateArtists: process.env.CONSTRAINT_ALLOW_DUPLICATE_ARTISTS === 'true',
  blacklist: [], // Loaded separately from recommendation-v2.md
};

/**
 * Default blacklist of overused songs (from recommendation-v2.md)
 * These Spotify IDs should never be recommended
 */
const DEFAULT_BLACKLIST_TITLES = [
  // English
  'Here Comes the Sun',
  'Riders on the Storm',
  'Happy',
  'Someone Like You',
  'Blinding Lights',
  'Bohemian Rhapsody',
  'Creep',
  'Photograph',
  'Shape of You',
  'Despacito',
  // Malayalam
  'Malare',
  'Appangal Embadum',
  'Jimmiki Kammal',
  // Tamil
  'Why This Kolaveri Di',
  'Rowdy Baby',
  'Ennodu Nee Irundhaal',
  // Hindi
  'Jai Ho',
  'Tujhe Dekha To',
  'Chaiyya Chaiyya',
];

/**
 * Check if track is blacklisted
 * Checks both explicit spotify_id blacklist and title-based blacklist
 */
function isBlacklisted(
  track: ScoredTrack,
  blacklist: string[]
): boolean {
  // Check spotify_id
  if (blacklist.includes(track.track.spotify_id)) {
    return true;
  }

  // Check title (case-insensitive, partial match)
  const titleLower = track.track.title.toLowerCase();
  return DEFAULT_BLACKLIST_TITLES.some(blacklisted =>
    titleLower.includes(blacklisted.toLowerCase())
  );
}

/**
 * Get popularity tier for a track
 */
function getPopularityTier(popularity: number): 'deep_cut' | 'moderate' | 'mainstream' {
  if (popularity < 40) return 'deep_cut';
  if (popularity > 80) return 'mainstream';
  return 'moderate';
}

/**
 * Extract decade from year
 */
function getDecade(year: number | undefined): number | null {
  if (!year) return null;
  return Math.floor(year / 10) * 10;
}

/**
 * Check if adding a track violates any constraints
 */
function violatesConstraints(
  selected: ScoredTrack[],
  candidate: ScoredTrack,
  config: ConstraintConfig
): { valid: boolean; reason?: string } {
  // Check blacklist
  if (isBlacklisted(candidate, config.blacklist)) {
    return { valid: false, reason: 'blacklisted' };
  }

  // Check duplicate artist
  if (!config.allowDuplicateArtists) {
    const artistExists = selected.some(t =>
      t.track.artist.toLowerCase() === candidate.track.artist.toLowerCase()
    );
    if (artistExists) {
      return { valid: false, reason: 'duplicate_artist' };
    }
  }

  // Check mainstream limit
  const candidatePopularity = candidate.track.popularity || 50;
  const candidateTier = getPopularityTier(candidatePopularity);

  if (candidateTier === 'mainstream') {
    const mainstreamCount = selected.filter(t =>
      getPopularityTier(t.track.popularity || 50) === 'mainstream'
    ).length;

    if (mainstreamCount >= config.maxMainstream) {
      return { valid: false, reason: 'mainstream_limit_reached' };
    }
  }

  return { valid: true };
}

/**
 * Check if final selection meets minimum constraints
 */
function meetsMinimumConstraints(
  selected: ScoredTrack[],
  config: ConstraintConfig
): { valid: boolean; reason?: string } {
  // Check minimum deep cuts
  const deepCutCount = selected.filter(t =>
    getPopularityTier(t.track.popularity || 50) === 'deep_cut'
  ).length;

  if (deepCutCount < config.minDeepCuts) {
    return { valid: false, reason: `only_${deepCutCount}_deep_cuts` };
  }

  // Check minimum decades
  const decades = new Set(
    selected
      .map(t => getDecade(t.track.year))
      .filter(d => d !== null)
  );

  if (decades.size < config.minDecades) {
    return { valid: false, reason: `only_${decades.size}_decades` };
  }

  return { valid: true };
}

/**
 * Apply constraints to ranked tracks and select final 4-5 songs
 *
 * Algorithm:
 * 1. Iterate through ranked tracks (highest score first)
 * 2. Add track if it doesn't violate constraints
 * 3. Stop when we have 4-5 tracks
 * 4. Verify minimum constraints are met
 * 5. If not, relax constraints and retry
 *
 * @param rankedTracks - Tracks sorted by score (descending)
 * @param config - Constraint configuration
 * @returns Array of 4-5 selected tracks (maintaining score order)
 */
export function applyConstraints(
  rankedTracks: ScoredTrack[],
  config: ConstraintConfig = DEFAULT_CONSTRAINTS
): ScoredTrack[] {
  console.log(`[Constraint Engine] Applying constraints to ${rankedTracks.length} ranked tracks...`);
  console.log('[Constraint Engine] Config:', {
    maxMainstream: config.maxMainstream,
    minDeepCuts: config.minDeepCuts,
    minDecades: config.minDecades,
    allowDuplicateArtists: config.allowDuplicateArtists,
    blacklistSize: config.blacklist.length + DEFAULT_BLACKLIST_TITLES.length,
  });

  const selected: ScoredTrack[] = [];
  const targetCount = 5; // Aim for 5 songs
  const minCount = 4; // Accept 4 if constraints are tight

  // First pass: strict constraints
  for (const track of rankedTracks) {
    if (selected.length >= targetCount) break;

    const check = violatesConstraints(selected, track, config);

    if (check.valid) {
      selected.push(track);
      console.log(`[Constraint Engine] ✅ Added #${selected.length}: "${track.track.title}" (score: ${track.scores.total.toFixed(3)})`);
    } else {
      console.log(`[Constraint Engine] ❌ Skipped "${track.track.title}": ${check.reason}`);
    }
  }

  // Check if we have enough tracks
  if (selected.length < minCount) {
    console.warn(`[Constraint Engine] ⚠️  Only ${selected.length} tracks selected, need at least ${minCount}`);

    // Relax constraints: allow duplicate artists
    if (!config.allowDuplicateArtists) {
      console.log('[Constraint Engine] Relaxing constraint: allowing duplicate artists');
      const relaxedConfig = { ...config, allowDuplicateArtists: true };
      return applyConstraints(rankedTracks, relaxedConfig);
    }

    // If still not enough, relax deep cut requirement
    if (config.minDeepCuts > 1) {
      console.log('[Constraint Engine] Relaxing constraint: reducing min deep cuts to 1');
      const relaxedConfig = { ...config, minDeepCuts: 1 };
      return applyConstraints(rankedTracks, relaxedConfig);
    }

    // Last resort: just take top N tracks
    console.warn('[Constraint Engine] Using fallback: taking top ranked tracks without constraints');
    return rankedTracks.slice(0, targetCount);
  }

  // Verify minimum constraints
  const minCheck = meetsMinimumConstraints(selected, config);

  if (!minCheck.valid) {
    console.warn(`[Constraint Engine] ⚠️  Minimum constraints not met: ${minCheck.reason}`);

    // Try to add more tracks to meet minimums
    for (const track of rankedTracks) {
      if (selected.length >= targetCount + 2) break; // Max 7 tracks
      if (selected.some(s => s.track.spotify_id === track.track.spotify_id)) continue;

      // Relax duplicate artist constraint for this pass
      const relaxedCheck = violatesConstraints(
        selected,
        track,
        { ...config, allowDuplicateArtists: true }
      );

      if (relaxedCheck.valid) {
        selected.push(track);
        console.log(`[Constraint Engine] Added extra track to meet minimums: "${track.track.title}"`);

        const newMinCheck = meetsMinimumConstraints(selected, config);
        if (newMinCheck.valid) {
          break; // Minimums met
        }
      }
    }
  }

  // Final validation
  const finalCheck = meetsMinimumConstraints(selected, config);

  console.log(`[Constraint Engine] ✅ Final selection: ${selected.length} tracks`);
  console.log(`[Constraint Engine] Minimum constraints: ${finalCheck.valid ? 'MET' : 'NOT MET (' + finalCheck.reason + ')'}`);

  // Log final statistics
  const deepCuts = selected.filter(t => getPopularityTier(t.track.popularity || 50) === 'deep_cut').length;
  const mainstream = selected.filter(t => getPopularityTier(t.track.popularity || 50) === 'mainstream').length;
  const decades = new Set(selected.map(t => getDecade(t.track.year)).filter(d => d !== null));

  console.log('[Constraint Engine] Final stats:', {
    total: selected.length,
    deep_cuts: deepCuts,
    mainstream: mainstream,
    decades: decades.size,
    decade_list: Array.from(decades).sort(),
  });

  return selected.slice(0, targetCount); // Return max 5 tracks
}

/**
 * Validate that selected tracks meet all constraints
 * Used for testing and verification
 */
export function validateSelection(
  selected: ScoredTrack[],
  config: ConstraintConfig = DEFAULT_CONSTRAINTS
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check blacklist
  selected.forEach(track => {
    if (isBlacklisted(track, config.blacklist)) {
      violations.push(`Blacklisted track: ${track.track.title}`);
    }
  });

  // Check duplicate artists
  if (!config.allowDuplicateArtists) {
    const artists = selected.map(t => t.track.artist.toLowerCase());
    const duplicates = artists.filter((a, i) => artists.indexOf(a) !== i);
    if (duplicates.length > 0) {
      violations.push(`Duplicate artists: ${duplicates.join(', ')}`);
    }
  }

  // Check mainstream limit
  const mainstream = selected.filter(t =>
    getPopularityTier(t.track.popularity || 50) === 'mainstream'
  );
  if (mainstream.length > config.maxMainstream) {
    violations.push(`Too many mainstream tracks: ${mainstream.length} (max: ${config.maxMainstream})`);
  }

  // Check deep cut minimum
  const deepCuts = selected.filter(t =>
    getPopularityTier(t.track.popularity || 50) === 'deep_cut'
  );
  if (deepCuts.length < config.minDeepCuts) {
    violations.push(`Not enough deep cuts: ${deepCuts.length} (min: ${config.minDeepCuts})`);
  }

  // Check decade diversity
  const decades = new Set(
    selected.map(t => getDecade(t.track.year)).filter(d => d !== null)
  );
  if (decades.size < config.minDecades) {
    violations.push(`Not enough decade diversity: ${decades.size} (min: ${config.minDecades})`);
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
