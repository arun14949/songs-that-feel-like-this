'use client';

import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';

interface PolaroidFrameProps {
  imageUrl: string;
  caption?: React.ReactNode;
  className?: string;
  loading?: boolean;
  loadingMessage?: string;
  imageAspect?: string; // e.g., "280/370" for home, "280/201" for recommendations
}

export default function PolaroidFrame({
  imageUrl,
  caption,
  className = '',
  loading = false,
  loadingMessage = '',
  imageAspect = '4/5'
}: PolaroidFrameProps) {
  const [animationData, setAnimationData] = useState(null);

  // Load Lottie JSON
  useEffect(() => {
    if (loading) {
      fetch('/animations/Scan.json')
        .then(res => res.json())
        .then(data => setAnimationData(data))
        .catch(err => console.error('Failed to load Lottie animation:', err));
    }
  }, [loading]);

  return (
    <div className={`inline-block ${className}`}>
      <div className="bg-[#fbfbfb] border border-gray-100 shadow-[0px_10px_16px_0px_rgba(91,84,70,0.2)] p-4 pb-6 transform rotate-2">
        {/* Image Container with Paper Texture - Lottie overlay stays within this boundary */}
        <div className={`relative w-full overflow-hidden bg-[#212121]`} style={{ aspectRatio: imageAspect }}>
          {/* Base Image */}
          <img
            src={imageUrl}
            alt="Uploaded memory"
            className="w-full h-full object-cover bg-[#212121]"
          />

          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 pointer-events-none mix-blend-difference opacity-30">
            <img
              src="/textures/paper-texture.png"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Lottie Overlay - ONLY inside image area */}
          {loading && animationData && (
            <div className="absolute inset-0 bg-black/40 z-10">
              <Lottie
                animationData={animationData}
                loop={true}
                autoplay={true}
                className="w-full h-full"
              />
            </div>
          )}
        </div>

        {/* Caption - Below image area */}
        <div className="mt-6 transform -rotate-1 min-h-[24px]">
          {loading && loadingMessage ? (
            <p className="font-[family-name:var(--font-serif)] text-base text-[#212121] text-center tracking-wide animate-pulse">
              {loadingMessage}
            </p>
          ) : caption ? (
            <div className="flex justify-center">
              {caption}
            </div>
          ) : null}
        </div>

        {/* Tape accent at top */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-24 h-8 bg-[rgba(255,255,255,0.4)] backdrop-blur-[1px] border border-[rgba(255,255,255,0.2)] border-solid" />
      </div>
    </div>
  );
}
