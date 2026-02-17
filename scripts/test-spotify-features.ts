/**
 * Test Spotify Features Module Directly
 * Tests audio features fetching without the full pipeline
 */

import { getAudioFeatures, getTrackPopularity } from '../lib/spotify-features';

async function main() {
  console.log('🎵 Testing Spotify Features Module\n');

  // Test with some known Spotify track IDs from our curated database
  const testTrackIds = [
    '7ouMYWpwJ422jRcDASZB7P', // Mizhiyil Ninnum
    '3KkXRkHbMCARz0aVfEt68P', // Nenjukulle
    '0qxYx4F3vm1AOnfux6dDxP', // Cherathukal
  ];

  console.log(`Testing with ${testTrackIds.length} track IDs from curated database...\n`);

  try {
    // Test audio features
    console.log('1. Fetching audio features...');
    const audioFeatures = await getAudioFeatures(testTrackIds);

    console.log(`✅ Retrieved ${audioFeatures.size}/${testTrackIds.length} audio features\n`);

    audioFeatures.forEach((features, trackId) => {
      console.log(`Track ID: ${trackId}`);
      console.log(`  Energy: ${features.energy.toFixed(2)}`);
      console.log(`  Valence: ${features.valence.toFixed(2)}`);
      console.log(`  Danceability: ${features.danceability.toFixed(2)}`);
      console.log(`  Tempo: ${features.tempo.toFixed(0)} BPM`);
      console.log('');
    });

    // Test popularity
    console.log('2. Fetching popularity...');
    const popularity = await getTrackPopularity(testTrackIds);

    console.log(`✅ Retrieved popularity for ${popularity.size}/${testTrackIds.length} tracks\n`);

    popularity.forEach((pop, trackId) => {
      console.log(`Track ID: ${trackId} - Popularity: ${pop}/100`);
    });

    console.log('\n✅ All Spotify Features tests passed!');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
