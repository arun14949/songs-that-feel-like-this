'use client';

import { motion } from 'framer-motion';
import type { SpotifyTrack } from '@/lib/types';

interface SongRecommendationsProps {
  songs: SpotifyTrack[];
}

export default function SongRecommendations({ songs }: SongRecommendationsProps) {
  if (songs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-[family-name:var(--font-sans)] text-gray-600">No songs found. Please try again.</p>
      </div>
    );
  }

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

            {/* Embedded Spotify Player */}
            <div className="bg-[#212121] rounded-2xl overflow-hidden">
              <iframe
                src={`https://open.spotify.com/embed/track/${song.id}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="w-full"
              />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
