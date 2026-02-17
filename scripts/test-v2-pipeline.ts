/**
 * Test Script: V2.0 Scoring Pipeline
 *
 * Tests the full recommendation pipeline:
 * 1. Image Analysis (analyze-v2)
 * 2. Recommendation Generation (recommend-v2)
 *
 * Usage: npx tsx scripts/test-v2-pipeline.ts
 */

import fs from 'fs';
import path from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Sample test image (1x1 red pixel as base64 - replace with real image for actual test)
const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

async function testAnalyzeV2() {
  console.log('📸 Testing /api/analyze-v2...\n');

  const response = await fetch(`${API_BASE}/api/analyze-v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: TEST_IMAGE,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Analyze V2 failed: ${response.status} - ${error}`);
  }

  const data = await response.json();

  console.log('✅ Analysis successful!');
  console.log('\nImageAnalysis:');
  console.log('  Mood:', data.analysis.mood);
  console.log('  Energy:', data.analysis.target_energy);
  console.log('  Valence:', data.analysis.target_valence);
  console.log('  Texture:', data.analysis.texture);
  console.log('  Color Temperature:', data.analysis.color_temperature);
  console.log('  Era Preference:', data.analysis.era_preference);
  console.log('  Language Bias:', data.analysis.language_bias.join(', '));
  console.log('  Vibe Tags:', data.analysis.vibe_tags.join(', '));
  console.log('\nDebug:', data.debug);

  return data.analysis;
}

async function testRecommendV2(analysis: any) {
  console.log('\n\n🎵 Testing /api/recommend-v2...\n');

  const response = await fetch(`${API_BASE}/api/recommend-v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      analysis,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Recommend V2 failed: ${response.status} - ${error}`);
  }

  const data = await response.json();

  console.log('✅ Recommendations successful!');
  console.log(`\n📊 Statistics:`);
  console.log(`  Total Candidates: ${data.stats.total_candidates}`);
  console.log(`  Scored Tracks: ${data.stats.scored_tracks}`);
  console.log(`  Final Tracks: ${data.stats.final_tracks}`);
  console.log('\nSources:');
  console.log(`  Curated: ${data.stats.sources.curated}`);
  console.log(`  Spotify Search: ${data.stats.sources.spotify_search}`);
  console.log(`  GPT: ${data.stats.sources.gpt}`);
  console.log('\nPerformance:');
  console.log(`  Total: ${data.stats.performance.total_ms}ms`);
  console.log(`  Candidate Gen: ${data.stats.performance.candidate_generation_ms}ms`);
  console.log(`  Audio Features: ${data.stats.performance.audio_features_ms}ms`);
  console.log(`  Popularity: ${data.stats.performance.popularity_ms}ms`);
  console.log(`  Scoring: ${data.stats.performance.scoring_ms}ms`);
  console.log(`  Constraints: ${data.stats.performance.constraints_ms}ms`);
  console.log('\nCache:');
  console.log(`  Audio Features Hit Rate: ${(data.stats.cache.audio_features_hit_rate * 100).toFixed(1)}%`);

  console.log('\n\n🎯 Final Recommended Tracks:\n');
  data.tracks.forEach((track: any, index: number) => {
    console.log(`${index + 1}. "${track.track.title}" by ${track.track.artist}`);
    console.log(`   Score: ${track.scores.total.toFixed(3)} | Rank: #${track.rank} | Confidence: ${track.confidence}`);
    console.log(`   Source: ${track.track.source} | Popularity: ${track.track.popularity || 'N/A'}`);
    console.log(`   Year: ${track.track.year || 'N/A'} | Language: ${track.track.language || 'N/A'}`);
    console.log(`   Audio Features: Energy=${track.audioFeatures.energy.toFixed(2)}, Valence=${track.audioFeatures.valence.toFixed(2)}`);
    console.log(`   Score Breakdown:`);
    console.log(`     Energy: ${track.scores.energy.toFixed(3)} | Valence: ${track.scores.valence.toFixed(3)}`);
    console.log(`     Popularity: ${track.scores.popularity.toFixed(3)} | Language: ${track.scores.language.toFixed(3)}`);
    console.log(`     Era: ${track.scores.era.toFixed(3)} | Vibe: ${track.scores.vibe.toFixed(3)}`);
    console.log('');
  });

  return data;
}

async function main() {
  console.log('🚀 V2.0 Scoring Pipeline Test\n');
  console.log('═'.repeat(60));

  try {
    // Test Phase 1: Image Analysis
    const analysis = await testAnalyzeV2();

    // Test Phase 2: Recommendations
    const recommendations = await testRecommendV2(analysis);

    console.log('═'.repeat(60));
    console.log('\n✅ All tests passed successfully!\n');

    // Save results for inspection
    const resultsPath = path.join(process.cwd(), 'test-v2-results.json');
    fs.writeFileSync(
      resultsPath,
      JSON.stringify({ analysis, recommendations }, null, 2),
      'utf-8'
    );
    console.log(`📄 Full results saved to: ${resultsPath}\n`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

main();
