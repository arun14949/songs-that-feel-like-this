'use client';

import { useState, useEffect } from 'react';

// Predefined options for dropdowns (with emojis for quick identification)
const LANGUAGES = ['Malayalam', 'Tamil', 'Hindi', 'English', 'Telugu', 'Kannada', 'Bengali'];
const GENRE_OPTIONS: Record<string, string> = {
  'indie': '🎸 indie',
  'soul': '🎷 soul',
  'romantic': '💕 romantic',
  'ambient': '🌫️ ambient',
  'folk': '🪕 folk',
  'classical': '🎻 classical',
  'pop': '🎤 pop',
  'rock': '🤘 rock',
  'electronic': '🎛️ electronic',
  'devotional': '🕯️ devotional',
};
const VIBE_OPTIONS: Record<string, string> = {
  'urban': '🏙️ urban',
  'contemplative': '🤔 contemplative',
  'modern': '✨ modern',
  'dreamy': '💭 dreamy',
  'nostalgic': '📷 nostalgic',
  'energetic': '⚡ energetic',
  'melancholic': '🌧️ melancholic',
  'peaceful': '🕊️ peaceful',
  'intimate': '🕯️ intimate',
  'mystical': '🔮 mystical',
};
const VISUAL_MOOD_OPTIONS: Record<string, string> = {
  'city-night': '🌃 city-night',
  'warm-tones': '🌅 warm-tones',
  'moody': '🌑 moody',
  'peaceful': '☁️ peaceful',
  'blue-tones': '💙 blue-tones',
  'indie-aesthetic': '📸 indie-aesthetic',
  'vast': '🏔️ vast',
  'water': '🌊 water',
  'sunset': '🌇 sunset',
  'nature': '🌿 nature',
};
const EMOTIONAL_OPTIONS: Record<string, string> = {
  'longing': '💫 longing',
  'introspective': '🪞 introspective',
  'tender': '🤲 tender',
  'peaceful': '😌 peaceful',
  'joyful': '😄 joyful',
  'spiritual': '🙏 spiritual',
  'melancholic': '😢 melancholic',
  'hopeful': '🌱 hopeful',
  'romantic': '❤️ romantic',
  'nostalgic': '⏳ nostalgic',
};

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

  // View songs states
  const [existingSongs, setExistingSongs] = useState<any[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<any[]>([]);
  const [filterLanguages, setFilterLanguages] = useState<string[]>([]);
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Edit mode states
  const [editingSong, setEditingSong] = useState<any>(null);
  const [editLanguage, setEditLanguage] = useState('');
  const [editGenreTags, setEditGenreTags] = useState<string[]>([]);
  const [editVibeTags, setEditVibeTags] = useState<string[]>([]);
  const [editVisualMoods, setEditVisualMoods] = useState<string[]>([]);
  const [editEmotionalKeywords, setEditEmotionalKeywords] = useState<string[]>([]);

  useEffect(() => {
    if (activeTab === 'view') {
      loadExistingSongs();
    }
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [existingSongs, filterLanguages, filterGenres, searchFilter]);

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

    // Search filter (search in title, artist, album)
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      filtered = filtered.filter(s =>
        s.title?.toLowerCase().includes(searchLower) ||
        s.artist?.toLowerCase().includes(searchLower) ||
        s.album?.toLowerCase().includes(searchLower)
      );
    }

    // Language filter (multi-select)
    if (filterLanguages.length > 0) {
      filtered = filtered.filter(s => filterLanguages.includes(s.language));
    }

    // Genre filter (multi-select)
    if (filterGenres.length > 0) {
      filtered = filtered.filter(s =>
        filterGenres.some(g => s.genre_tags?.includes(g))
      );
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

    // Determine is_indie from genre_tags
    const isIndie = genreTags.includes('indie');

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
        alert('Song added to curated database!');
        // Reset form
        setSelectedTrack(null);
        setSearchResults([]);
        setSearchQuery('');
        setLanguage('');
        setGenreTags([]);
        setVibeTags([]);
        setVisualMoods([]);
        setEmotionalKeywords([]);
      } else {
        alert('Failed to add song: ' + data.error);
      }
    } catch (error) {
      console.error('Add failed:', error);
      alert('Failed to add song');
    }
  };

  const startEdit = (song: any) => {
    setEditingSong(song);
    setEditLanguage(song.language);
    setEditGenreTags(song.genre_tags || []);
    setEditVibeTags(song.vibe_tags || []);
    setEditVisualMoods(song.visual_moods || []);
    setEditEmotionalKeywords(song.emotional_keywords || []);
  };

  const cancelEdit = () => {
    setEditingSong(null);
  };

  const saveEdit = async () => {
    if (!editingSong) return;

    const updatedSong = {
      ...editingSong,
      language: editLanguage,
      genre_tags: editGenreTags,
      vibe_tags: editVibeTags,
      visual_moods: editVisualMoods,
      emotional_keywords: editEmotionalKeywords,
      is_indie: editGenreTags.includes('indie'),
    };

    try {
      const res = await fetch('/api/admin/update-song', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSong),
      });

      const data = await res.json();
      if (data.success) {
        alert('Song updated successfully!');
        setEditingSong(null);
        loadExistingSongs();
      } else {
        alert('Failed to update song: ' + data.error);
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update song');
    }
  };

  const deleteSong = async (songId: string) => {
    if (!confirm('Are you sure you want to delete this song? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/delete-song', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Song deleted successfully!');
        loadExistingSongs();
      } else {
        alert('Failed to delete song: ' + data.error);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete song');
    }
  };

  // Render a checkbox grid for tag options (with emojis)
  const renderTagGrid = (
    options: Record<string, string>,
    selected: string[],
    setter: (tags: string[]) => void,
    cols: string = 'grid-cols-2 md:grid-cols-3'
  ) => (
    <div className={`grid ${cols} gap-2`}>
      {Object.entries(options).map(([key, label]) => (
        <label
          key={key}
          className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
            selected.includes(key) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(key)}
            onChange={() => toggleTag(key, selected, setter)}
            className="rounded"
          />
          <span className="text-sm">{label}</span>
        </label>
      ))}
    </div>
  );

  // Render a compact checkbox grid for edit mode
  const renderEditTagGrid = (
    options: Record<string, string>,
    selected: string[],
    setter: (tags: string[]) => void
  ) => (
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(options).map(([key, label]) => (
        <label key={key} className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(key)}
            onChange={() => toggleTag(key, selected, setter)}
            className="rounded"
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );

  // Multi-select filter component for View Songs
  const renderMultiSelectFilter = (
    label: string,
    options: string[] | Record<string, string>,
    selected: string[],
    setter: (val: string[]) => void
  ) => {
    const entries = Array.isArray(options)
      ? options.map(o => [o, o] as [string, string])
      : Object.entries(options);

    return (
      <div>
        <label className="block text-sm font-medium mb-1">{label}</label>
        <div className="flex flex-wrap gap-2">
          {entries.map(([key, display]) => (
            <button
              key={key}
              onClick={() => {
                if (selected.includes(key)) {
                  setter(selected.filter(s => s !== key));
                } else {
                  setter([...selected, key]);
                }
              }}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                selected.includes(key)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              {display}
            </button>
          ))}
        </div>
      </div>
    );
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

                  {/* Genre Tags - Multi-select with checkboxes + emojis */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Genre Tags</label>
                    {renderTagGrid(GENRE_OPTIONS, genreTags, setGenreTags)}
                  </div>

                  {/* Vibe Tags */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Vibe Tags</label>
                    {renderTagGrid(VIBE_OPTIONS, vibeTags, setVibeTags)}
                  </div>

                  {/* Visual Moods */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Visual Moods</label>
                    {renderTagGrid(VISUAL_MOOD_OPTIONS, visualMoods, setVisualMoods)}
                  </div>

                  {/* Emotional Keywords */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Emotional Keywords</label>
                    {renderTagGrid(EMOTIONAL_OPTIONS, emotionalKeywords, setEmotionalKeywords)}
                  </div>

                  <button
                    onClick={addToCuratedDatabase}
                    disabled={!language.trim()}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Add to Curated Database
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

            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              {/* Search Bar */}
              <div>
                <label className="block text-sm font-medium mb-1">Search Songs</label>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search by title, artist, or album..."
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              {/* Multi-select Language Filter */}
              {renderMultiSelectFilter('Filter by Language', LANGUAGES, filterLanguages, setFilterLanguages)}

              {/* Multi-select Genre Filter */}
              {renderMultiSelectFilter('Filter by Genre', GENRE_OPTIONS, filterGenres, setFilterGenres)}

              {/* Clear Filters Button */}
              {(searchFilter || filterLanguages.length > 0 || filterGenres.length > 0) && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setSearchFilter('');
                      setFilterLanguages([]);
                      setFilterGenres([]);
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
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
                    {editingSong?.id === song.id ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-semibold text-lg">{song.title}</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>

                        {/* Edit Language */}
                        <div>
                          <label className="block text-sm font-medium mb-1">Language</label>
                          <select
                            value={editLanguage}
                            onChange={(e) => setEditLanguage(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                          >
                            {LANGUAGES.map(lang => (
                              <option key={lang} value={lang}>{lang}</option>
                            ))}
                          </select>
                        </div>

                        {/* Edit Genre Tags */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Genre Tags</label>
                          {renderEditTagGrid(GENRE_OPTIONS, editGenreTags, setEditGenreTags)}
                        </div>

                        {/* Edit Vibe Tags */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Vibe Tags</label>
                          {renderEditTagGrid(VIBE_OPTIONS, editVibeTags, setEditVibeTags)}
                        </div>

                        {/* Edit Visual Moods */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Visual Moods</label>
                          {renderEditTagGrid(VISUAL_MOOD_OPTIONS, editVisualMoods, setEditVisualMoods)}
                        </div>

                        {/* Edit Emotional Keywords */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Emotional Keywords</label>
                          {renderEditTagGrid(EMOTIONAL_OPTIONS, editEmotionalKeywords, setEditEmotionalKeywords)}
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{song.title}</h3>
                            <p className="text-sm text-gray-600">{song.artist} • {song.year}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                              {song.language}
                            </span>
                            <button
                              onClick={() => startEdit(song)}
                              className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded hover:bg-yellow-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteSong(song.id)}
                              className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
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
                      </>
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
