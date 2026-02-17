'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);

  // Form fields for curated song metadata
  const [language, setLanguage] = useState('');
  const [genreTags, setGenreTags] = useState('');
  const [vibeTags, setVibeTags] = useState('');
  const [visualMoods, setVisualMoods] = useState('');
  const [emotionalKeywords, setEmotionalKeywords] = useState('');
  const [isIndie, setIsIndie] = useState(false);

  const searchSpotify = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/admin/search-spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await res.json();
      setSearchResults(data.tracks || []);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const selectTrack = (track: any) => {
    setSelectedTrack(track);
    // Auto-fill some fields
    setLanguage(''); // User needs to specify
    setGenreTags('');
    setVibeTags('');
    setVisualMoods('');
    setEmotionalKeywords('');
  };

  const addToCuratedDatabase = async () => {
    if (!selectedTrack) return;

    const curatedSong = {
      spotify_id: selectedTrack.id,
      title: selectedTrack.name,
      artist: selectedTrack.artists[0].name,
      year: selectedTrack.year,
      album: selectedTrack.album,
      language,
      genre_tags: genreTags.split(',').map(t => t.trim()).filter(Boolean),
      vibe_tags: vibeTags.split(',').map(t => t.trim()).filter(Boolean),
      visual_moods: visualMoods.split(',').map(t => t.trim()).filter(Boolean),
      emotional_keywords: emotionalKeywords.split(',').map(t => t.trim()).filter(Boolean),
      is_indie: isIndie,
    };

    try {
      const res = await fetch('/api/admin/add-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(curatedSong),
      });

      const data = await res.json();
      if (data.success) {
        alert('✅ Song added to curated database!');
        // Reset form
        setSelectedTrack(null);
        setLanguage('');
        setGenreTags('');
        setVibeTags('');
        setVisualMoods('');
        setEmotionalKeywords('');
        setIsIndie(false);
      } else {
        alert('❌ Failed to add song: ' + data.error);
      }
    } catch (error) {
      console.error('Add failed:', error);
      alert('Failed to add song');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin: Add Songs to Curated Database</h1>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Search Spotify</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchSpotify()}
              placeholder="Search for a song or artist..."
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={searchSpotify}
              disabled={isSearching}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((track) => (
                <div
                  key={track.id}
                  onClick={() => selectTrack(track)}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedTrack?.id === track.id ? 'bg-blue-50 border-blue-500' : ''
                  }`}
                >
                  <div className="font-medium">{track.name}</div>
                  <div className="text-sm text-gray-600">
                    {track.artists[0].name} • {track.album} ({track.year})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metadata Form */}
        {selectedTrack && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add Metadata</h2>
            <div className="text-sm text-gray-600 mb-4">
              Selected: <strong>{selectedTrack.name}</strong> by {selectedTrack.artists[0].name}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Language *</label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="Malayalam, Tamil, Hindi, English..."
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Genre Tags (comma-separated)</label>
                <input
                  type="text"
                  value={genreTags}
                  onChange={(e) => setGenreTags(e.target.value)}
                  placeholder="indie, soul, romantic, ambient..."
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vibe Tags (comma-separated)</label>
                <input
                  type="text"
                  value={vibeTags}
                  onChange={(e) => setVibeTags(e.target.value)}
                  placeholder="urban, contemplative, modern, dreamy..."
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Visual Moods (comma-separated)</label>
                <input
                  type="text"
                  value={visualMoods}
                  onChange={(e) => setVisualMoods(e.target.value)}
                  placeholder="city-night, warm-tones, moody, peaceful..."
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Emotional Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={emotionalKeywords}
                  onChange={(e) => setEmotionalKeywords(e.target.value)}
                  placeholder="longing, introspective, tender, peaceful..."
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={isIndie}
                  onChange={(e) => setIsIndie(e.target.checked)}
                  id="is-indie"
                  className="mr-2"
                />
                <label htmlFor="is-indie" className="text-sm font-medium">Is Indie</label>
              </div>

              <button
                onClick={addToCuratedDatabase}
                disabled={!language.trim()}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                ✅ Add to Curated Database
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
