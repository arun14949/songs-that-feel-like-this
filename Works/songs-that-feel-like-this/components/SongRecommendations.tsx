'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { SpotifyTrack } from '@/lib/types';

interface SongRecommendationsProps {
  songs: SpotifyTrack[];
}

export default function SongRecommendations({ songs }: SongRecommendationsProps) {
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(0); // Start with first song

  if (songs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-[family-name:var(--font-sans)] text-gray-600">No songs found. Please try again.</p>
      </div>
    );
  }

  const handlePlay = (index: number) => {
    setCurrentPlayingIndex(index);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Delay between each song animation
        delayChildren: 0.2    // Initial delay before starting
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as any // easeOut cubic-bezier
      }
    }
  };

  return (
    <motion.div
      className="space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {songs.map((song, index) => (
        <motion.div
          key={song.id}
          variants={itemVariants}
          className="bg-cream-50 rounded-2xl overflow-hidden"
        >
          {/* Song Info and Player */}
          <div className="p-4">
            {/* Song Title and Artist */}
            <div className="mb-4">
              <h3 className="font-[family-name:var(--font-serif)] text-base text-[#212121] leading-tight">
                {song.name}
              </h3>
              <p className="font-[family-name:var(--font-sans)] text-[#757575] text-sm leading-tight mt-1">
                {song.artist}
              </p>
            </div>

            {/* Horizontal Spotify Player */}
            <div className="bg-[#212121] rounded-2xl p-2 flex gap-2 items-start">
              {/* Album Art with Play Button */}
              <div className="relative shrink-0">
                <div className="w-[90px] h-[90px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden">
                  {song.albumArt && (
                    <img
                      src={song.albumArt}
                      alt={song.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {/* Play Button Overlay */}
                <button
                  onClick={() => handlePlay(index)}
                  className="absolute inset-0 flex items-center justify-center group"
                >
                  <div className="w-10 h-10 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-colors">
                    <img src="/play-icon.svg" alt="Play" className="w-6 h-6" />
                  </div>
                </button>
              </div>

              {/* Song Details and Actions */}
              <div className="flex-1 flex flex-col gap-3 py-2 min-w-0">
                {/* Song Title with Spotify Icon */}
                <div className="flex gap-2 items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-['Montserrat'] font-bold text-sm text-white leading-normal truncate drop-shadow-[0_0_2px_rgba(0,0,0,0.4)]">
                      {song.name}
                    </h4>
                    <p className="font-['Montserrat'] font-normal text-sm text-[#757575] leading-normal truncate drop-shadow-[0_0_2px_rgba(0,0,0,0.4)]">
                      {song.artist}
                    </p>
                  </div>
                  <img src="/spotify-icon.svg" alt="Spotify" className="w-[18px] h-[18px] shrink-0" />
                </div>

                {/* Save on Spotify Button */}
                <a
                  href={song.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 group"
                >
                  <img src="/heart-icon.svg" alt="" className="w-6 h-6" />
                  <span className="font-['Montserrat'] font-medium text-sm text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.4)] group-hover:underline">
                    Save on Spotify
                  </span>
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
