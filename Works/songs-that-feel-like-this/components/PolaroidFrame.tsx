'use client';

import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';

interface PolaroidFrameProps {
  imageUrl: string;
  caption?: string;
  className?: string;
  loading?: boolean;
  loadingMessage?: string;
}

export default function PolaroidFrame({
  imageUrl,
  caption = '#mood',
  className = '',
  loading = false,
  loadingMessage = ''
}: PolaroidFrameProps) {
  const [animationData, setAnimationData] = useState(null);

  // Load Lottie JSON
  useEffect(() => {
    if (loading) {
      fetch('/animations/Scan.lottie')
        .then(res => res.json())
        .then(data => setAnimationData(data))
        .catch(err => console.error('Failed to load Lottie animation:', err));
    }
  }, [loading]);

  return (
    <div className={`inline-block ${className}`}>
      <div className="bg-cream-50 border border-gray-100 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_20px_25px_-5px_rgba(0,0,0,0.15),0px_10px_10px_-5px_rgba(0,0,0,0.04)] p-4 pb-12 transform rotate-2">
        {/* Image Container - Lottie overlay stays within this boundary */}
        <div className="bg-[#1a1a1a] border border-gray-200 aspect-[4/5] w-full overflow-hidden relative">
          {/* Base Image */}
          <img
            src={imageUrl}
            alt="Uploaded memory"
            className="w-full h-full object-cover"
          />

          {/* Lottie Overlay - ONLY inside image area */}
          {loading && animationData && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
              <div className="w-32 h-32">
                <Lottie
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Caption - Below image area */}
        <div className="mt-2 transform -rotate-1 min-h-[28px]">
          {loading && loadingMessage ? (
            <p className="font-[family-name:var(--font-sans)] text-sm text-gray-700 text-center animate-pulse">
              {loadingMessage}
            </p>
          ) : (
            <p className="font-[family-name:var(--font-handwriting)] text-xl text-gray-700 text-center">
              {caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
