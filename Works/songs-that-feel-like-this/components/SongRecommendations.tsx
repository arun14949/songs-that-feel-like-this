'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import SpotifyPlayer from './SpotifyPlayer';
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
        ease: 'easeOut'
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
          className="bg-cream-50 border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
        >
          {/* Song Info and Player */}
          <div className="p-4">
            {/* Song Title and Artist */}
            <div className="mb-4">
              <h3 className="font-[family-name:var(--font-serif)] text-xl text-gray-900 mb-1">
                {index + 1}. {song.name}
              </h3>
              <p className="font-[family-name:var(--font-sans)] text-gray-600 text-sm">
                {song.artist}
              </p>
            </div>

            {/* Spotify Player */}
            <SpotifyPlayer
              trackId={song.id}
              spotifyUrl={song.spotifyUrl}
              autoplay={index === 0} // Autoplay first song
              isPlaying={currentPlayingIndex === index}
              onPlay={() => handlePlay(index)}
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
