/**
 * Recommendation API - V2.0 Scoring Architecture
 *
 * Takes ImageAnalysis from /api/analyze-v2 and generates scored song recommendations
 * using the full scoring pipeline:
 * 1. Generate 40-60 candidates (curated DB + Spotify search + optional GPT)
 * 2. Fetch audio features from Spotify (with Redis caching)
 * 3. Score all candidates using multi-criteria algorithm
 * 4. Apply diversity constraints
 * 5. Return top 4-5 tracks with explanations
 *
 * POST /api/recommend-v2
 * Body: { analysis: ImageAnalysis }
 * Response: { tracks: ScoredTrack[], stats: object }
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ImageAnalysis } from '@/lib/types';
import { generateCandidates } from '@/lib/candidate-generator';
import { getAudioFeatures, getTrackPopularity } from '@/lib/spotify-features';
import { rankCandidates } from '@/lib/scoring-engine';
import { applyConstraints } from '@/lib/constraint-engine';

// Configure route
export const maxDuration = 60; // Longer timeout for full pipeline
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const overallStartTime = Date.now();

  try {
    const body = await request.json();

    if (!body.analysis) {
      return NextResponse.json(
        { error: 'ImageAnalysis is required' },
        { status: 400 }
      );
    }

    const analysis: ImageAnalysis = body.analysis;

    console.log('[Recommend V2 API] Starting recommendation pipeline...');
    console.log('[Recommend V2 API] Analysis:', {
      mood: analysis.mood.substring(0, 50) + '...',
      energy: analysis.target_energy,
      valence: analysis.target_valence,
      languages: analysis.language_bias.join(', '),
      vibe_tags: analysis.vibe_tags.join(', '),
    });

    // ========================================================================
    // PHASE 1: Generate Candidates (40-60 tracks)
    // ========================================================================
    console.log('\n[Recommend V2 API] Phase 1: Generating candidates...');
    const candidateStartTime = Date.now();

    const candidates = await generateCandidates(analysis, {
      useCurated: true,
      useSpotifySearch: false, // ONLY use curated database
      useGPT: false, // Disabled for now (can enable later)
    });

    const candidateDuration = Date.now() - candidateStartTime;
    console.log(`[Recommend V2 API] ✅ Generated ${candidates.length} candidates in ${candidateDuration}ms`);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No candidates found. Please try a different image or vibe.' },
        { status: 404 }
      );
    }

    // ========================================================================
    // PHASE 2: Fetch Audio Features (with caching)
    // ========================================================================
    console.log('\n[Recommend V2 API] Phase 2: Fetching audio features...');
    const featuresStartTime = Date.now();

    const trackIds = candidates.map(c => c.spotify_id);
    const audioFeaturesMap = await getAudioFeatures(trackIds);

    const featuresDuration = Date.now() - featuresStartTime;
    console.log(`[Recommend V2 API] ✅ Retrieved ${audioFeaturesMap.size}/${trackIds.length} audio features in ${featuresDuration}ms`);

    // ========================================================================
    // PHASE 2.5: Fetch Popularity (needed for scoring)
    // ========================================================================
    console.log('\n[Recommend V2 API] Phase 2.5: Fetching popularity data...');
    const popularityStartTime = Date.now();

    // Fetch popularity in batches of 50 (Spotify limit)
    const allPopularity = new Map<string, number>();

    for (let i = 0; i < trackIds.length; i += 50) {
      const batch = trackIds.slice(i, i + 50);
      const batchPopularity = await getTrackPopularity(batch);
      batchPopularity.forEach((pop, id) => allPopularity.set(id, pop));
    }

    // Update candidates with popularity
    candidates.forEach(candidate => {
      const popularity = allPopularity.get(candidate.spotify_id);
      if (popularity !== undefined) {
        candidate.popularity = popularity;
      }
    });

    const popularityDuration = Date.now() - popularityStartTime;
    console.log(`[Recommend V2 API] ✅ Retrieved popularity for ${allPopularity.size}/${trackIds.length} tracks in ${popularityDuration}ms`);

    // ========================================================================
    // PHASE 3: Score and Rank Candidates
    // ========================================================================
    console.log('\n[Recommend V2 API] Phase 3: Scoring candidates...');
    const scoringStartTime = Date.now();

    const rankedTracks = rankCandidates(candidates, audioFeaturesMap, analysis);

    const scoringDuration = Date.now() - scoringStartTime;
    console.log(`[Recommend V2 API] ✅ Scored and ranked ${rankedTracks.length} tracks in ${scoringDuration}ms`);

    if (rankedTracks.length === 0) {
      return NextResponse.json(
        { error: 'No tracks could be scored. Missing audio features.' },
        { status: 500 }
      );
    }

    // ========================================================================
    // PHASE 4: Apply Diversity Constraints
    // ========================================================================
    console.log('\n[Recommend V2 API] Phase 4: Applying constraints...');
    const constraintStartTime = Date.now();

    const finalTracks = applyConstraints(rankedTracks);

    const constraintDuration = Date.now() - constraintStartTime;
    console.log(`[Recommend V2 API] ✅ Selected ${finalTracks.length} final tracks in ${constraintDuration}ms`);

    // ========================================================================
    // PHASE 5: Format Response
    // ========================================================================
    const overallDuration = Date.now() - overallStartTime;

    console.log(`\n[Recommend V2 API] ✅ PIPELINE COMPLETE in ${overallDuration}ms`);
    console.log('[Recommend V2 API] Final tracks:', finalTracks.map(t => `${t.track.title} by ${t.track.artist} (score: ${t.scores.total.toFixed(3)})`));

    // Return scored tracks with metadata
    return NextResponse.json({
      tracks: finalTracks,
      stats: {
        total_candidates: candidates.length,
        scored_tracks: rankedTracks.length,
        final_tracks: finalTracks.length,
        sources: {
          curated: candidates.filter(c => c.source === 'curated').length,
          spotify_search: candidates.filter(c => c.source === 'spotify_search').length,
          gpt: candidates.filter(c => c.source === 'gpt').length,
        },
        performance: {
          total_ms: overallDuration,
          candidate_generation_ms: candidateDuration,
          audio_features_ms: featuresDuration,
          popularity_ms: popularityDuration,
          scoring_ms: scoringDuration,
          constraints_ms: constraintDuration,
        },
        cache: {
          audio_features_hit_rate: audioFeaturesMap.size / trackIds.length,
        }
      }
    });

  } catch (error: any) {
    console.error('[Recommend V2 API] Error:', error);
    console.error('[Recommend V2 API] Stack:', error.stack);

    // Handle specific errors
    if (error?.message?.includes('Missing Spotify API credentials')) {
      return NextResponse.json(
        { error: 'Spotify API not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.' },
        { status: 500 }
      );
    }

    if (error?.message?.includes('Spotify auth failed')) {
      return NextResponse.json(
        { error: 'Failed to authenticate with Spotify API. Please check credentials.' },
        { status: 500 }
      );
    }

    if (error?.message?.includes('Spotify API error')) {
      return NextResponse.json(
        { error: 'Spotify API error. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
