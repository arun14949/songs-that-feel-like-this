'use client';

import { useState, useEffect } from 'react';

// Predefined options for dropdowns
const LANGUAGES = ['Malayalam', 'Tamil', 'Hindi', 'English', 'Telugu', 'Kannada', 'Bengali'];
const GENRE_OPTIONS = ['indie', 'soul', 'romantic', 'ambient', 'folk', 'classical', 'pop', 'rock', 'electronic', 'devotional'];
const VIBE_OPTIONS = ['urban', 'contemplative', 'modern', 'dreamy', 'nostalgic', 'energetic', 'melancholic', 'peaceful', 'intimate', 'mystical'];
const VISUAL_MOOD_OPTIONS = ['city-night', 'warm-tones', 'moody', 'peaceful', 'blue-tones', 'indie-aesthetic', 'vast', 'water', 'sunset', 'nature'];
const EMOTIONAL_OPTIONS = ['longing', 'introspective', 'tender', 'peaceful', 'joyful', 'spiritual', 'melancholic', 'hopeful', 'romantic', 'nostalgic'];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'add' | 'view'>('add');

  // Add song states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);

  // Form fields - now using arrays for multi-select
  const [language, setLanguage] = useState('');
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [visualMoods, setVisualMoods] = useState<string[]>([]);
  const [emotionalKeywords, setEmotionalKeywords] = useState<string[]>([]);
  const [isIndie, setIsIndie] = useState(false);

  // View songs states
  const [existingSongs, setExistingSongs] = useState<any[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<any[]>([]);
  const [filterLanguage, setFilterLanguage] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'view') {
      loadExistingSongs();
    }
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [existingSongs, filterLanguage, filterGenre]);

  const loadExistingSongs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/list-songs');
      const data = await res.json();
      setExistingSongs(data.songs || []);
    } catch (error) {
      console.error('Failed to load songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = existingSongs;

    if (filterLanguage) {
      filtered = filtered.filter(s => s.language === filterLanguage);
    }

    if (filterGenre) {
      filtered = filtered.filter(s => s.genre_tags?.includes(filterGenre));
    }

    setFilteredSongs(filtered);
  };

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
    // Reset fields
    setLanguage('');
    setGenreTags([]);
    setVibeTags([]);
    setVisualMoods([]);
    setEmotionalKeywords([]);
    setIsIndie(false);
  };

  const toggleTag = (tag: string, currentTags: string[], setter: (tags: string[]) => void) => {
    if (currentTags.includes(tag)) {
      setter(currentTags.filter(t => t !== tag));
    } else {
      setter([...currentTags, tag]);
    }
  };

  const addToCuratedDatabase = async () => {
    if (!selectedTrack || !language) return;

    const curatedSong = {
      spotify_id: selectedTrack.id,
      title: selectedTrack.name,
      artist: selectedTrack.artists[0].name,
      year: selectedTrack.year,
      album: selectedTrack.album,
      language,
      genre_tags: genreTags,
      vibe_tags: vibeTags,
      visual_moods: visualMoods,
      emotional_keywords: emotionalKeywords,
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
        setSearchResults([]);
        setSearchQuery('');
        setLanguage('');
        setGenreTags([]);
        setVibeTags([]);
        setVisualMoods([]);
        setEmotionalKeywords([]);
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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin: Curated Database Manager</h1>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('add')}
            className={`px-6 py-2 rounded-lg font-medium ${
              activeTab === 'add'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Add Songs
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`px-6 py-2 rounded-lg font-medium ${
              activeTab === 'view'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            View Songs ({existingSongs.length})
          </button>
        </div>

        {/* Add Songs Tab */}
        {activeTab === 'add' && (
          <>
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
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                  <div className="text-sm font-medium text-blue-900">
                    Selected: {selectedTrack.name}
                  </div>
                  <div className="text-sm text-blue-700">
                    by {selectedTrack.artists[0].name}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Language Dropdown */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Language *</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select a language</option>
                      {LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  {/* Genre Tags - Multi-select with checkboxes */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Genre Tags</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {GENRE_OPTIONS.map(genre => (
                        <label key={genre} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={genreTags.includes(genre)}
                            onChange={() => toggleTag(genre, genreTags, setGenreTags)}
                            className="rounded"
                          />
                          <span className="text-sm">{genre}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Vibe Tags */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Vibe Tags</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {VIBE_OPTIONS.map(vibe => (
                        <label key={vibe} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vibeTags.includes(vibe)}
                            onChange={() => toggleTag(vibe, vibeTags, setVibeTags)}
                            className="rounded"
                          />
                          <span className="text-sm">{vibe}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Visual Moods */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Visual Moods</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {VISUAL_MOOD_OPTIONS.map(mood => (
                        <label key={mood} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visualMoods.includes(mood)}
                            onChange={() => toggleTag(mood, visualMoods, setVisualMoods)}
                            className="rounded"
                          />
                          <span className="text-sm">{mood}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Emotional Keywords */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Emotional Keywords</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {EMOTIONAL_OPTIONS.map(emotion => (
                        <label key={emotion} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emotionalKeywords.includes(emotion)}
                            onChange={() => toggleTag(emotion, emotionalKeywords, setEmotionalKeywords)}
                            className="rounded"
                          />
                          <span className="text-sm">{emotion}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center p-3 bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={isIndie}
                      onChange={(e) => setIsIndie(e.target.checked)}
                      id="is-indie"
                      className="mr-3"
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
          </>
        )}

        {/* View Songs Tab */}
        {activeTab === 'view' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Existing Songs</h2>
              <button
                onClick={loadExistingSongs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Language</label>
                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">All Languages</option>
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Genre</label>
                <select
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">All Genres</option>
                  {GENRE_OPTIONS.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Songs List */}
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                <div className="text-sm text-gray-600 mb-2">
                  Showing {filteredSongs.length} of {existingSongs.length} songs
                </div>
                {filteredSongs.map((song, index) => (
                  <div key={song.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{song.title}</h3>
                        <p className="text-sm text-gray-600">{song.artist} • {song.year}</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {song.language}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-3">
                      {song.genre_tags?.length > 0 && (
                        <div>
                          <span className="font-medium">Genres: </span>
                          <span className="text-gray-600">{song.genre_tags.join(', ')}</span>
                        </div>
                      )}
                      {song.vibe_tags?.length > 0 && (
                        <div>
                          <span className="font-medium">Vibes: </span>
                          <span className="text-gray-600">{song.vibe_tags.join(', ')}</span>
                        </div>
                      )}
                      {song.visual_moods?.length > 0 && (
                        <div>
                          <span className="font-medium">Moods: </span>
                          <span className="text-gray-600">{song.visual_moods.join(', ')}</span>
                        </div>
                      )}
                      {song.emotional_keywords?.length > 0 && (
                        <div>
                          <span className="font-medium">Emotions: </span>
                          <span className="text-gray-600">{song.emotional_keywords.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {song.is_indie && (
                      <div className="mt-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          Indie
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {filteredSongs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No songs found with the current filters
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
