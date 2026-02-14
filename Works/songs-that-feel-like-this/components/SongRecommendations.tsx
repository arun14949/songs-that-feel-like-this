'use client';

import SpotifyPlayer from './SpotifyPlayer';
import type { SpotifyTrack } from '@/lib/types';

interface SongRecommendationsProps {
  songs: SpotifyTrack[];
}

export default function SongRecommendations({ songs }: SongRecommendationsProps) {
  if (songs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No songs found. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {songs.map((song, index) => (
        <div
          key={song.id}
          className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
        >
          {/* Album Art */}
          <div className="relative aspect-square bg-gray-200">
            {song.albumArt ? (
              <img
                src={song.albumArt}
                alt={`${song.name} album art`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="p-4">
            <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-1">
              {song.name}
            </h3>
            <p className="text-gray-600 text-sm mb-4 line-clamp-1">
              {song.artist}
            </p>

            {/* Spotify Player */}
            <SpotifyPlayer trackId={song.id} spotifyUrl={song.spotifyUrl} />
          </div>
        </div>
      ))}
    </div>
  );
}
