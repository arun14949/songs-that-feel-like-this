'use client';

import { useState } from 'react';

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Songs That Feel Like This',
          text: 'Check out these song recommendations based on my image!',
          url: url,
        });
        return;
      } catch (err) {
        // Fall through to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center justify-center gap-2 w-full py-2 hover:opacity-80 transition-opacity"
    >
      {copied ? (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="font-[family-name:var(--font-serif)] text-base text-[#212121] tracking-wide">Copied!</span>
        </>
      ) : (
        <>
          <img src="/share-icon.svg" alt="" className="w-5 h-5" />
          <span className="font-[family-name:var(--font-serif)] text-base text-[#212121] tracking-wide">Share</span>
        </>
      )}
    </button>
  );
}
