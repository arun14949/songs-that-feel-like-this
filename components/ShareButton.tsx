'use client';

import { useState, useCallback } from 'react';
import { useSounds } from '@/hooks/useSounds';

interface ShareButtonProps {
  imageUrl?: string;
}

export default function ShareButton({ imageUrl }: ShareButtonProps = {}) {
  const { playClick } = useSounds();
  const [copied, setCopied] = useState(false);

  console.log('ShareButton render - copied state:', copied);

  const createPolaroidImage = async (originalImageUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Polaroid dimensions (matching 280x201 aspect ratio with padding)
      const imageWidth = 280;
      const imageHeight = 201;
      const padding = 16;
      const bottomPadding = 24;
      const canvasWidth = imageWidth + (padding * 2);
      const canvasHeight = imageHeight + padding + bottomPadding;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Draw white polaroid background
      ctx.fillStyle = '#fbfbfb';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Load and draw the image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Draw the image in the center with black background
        ctx.fillStyle = '#212121';
        ctx.fillRect(padding, padding, imageWidth, imageHeight);

        // Draw the actual image
        ctx.drawImage(img, padding, padding, imageWidth, imageHeight);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not create blob from canvas'));
          }
        }, 'image/jpeg', 0.95);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = originalImageUrl;
    });
  };

  const handleShare = useCallback(async () => {
    console.log('handleShare called');
    playClick();

    const url = window.location.href;
    const shareText = 'Check out these song recommendations based on my image!';
    const fullMessage = `${shareText}\n\n${url}`;

    // Check if we're on mobile (touchscreen device with small screen)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                     (navigator.maxTouchPoints > 0 && window.innerWidth < 768);

    console.log('isMobile:', isMobile);
    console.log('navigator.share exists:', !!navigator.share);

    // Desktop OR Web Share not available: Copy to clipboard
    if (!isMobile || !navigator.share) {
      console.log('Using desktop clipboard approach');
      try {
        console.log('Attempting clipboard write...');
        await navigator.clipboard.writeText(fullMessage);
        console.log('Text copied to clipboard successfully');

        // Use functional update to ensure state changes
        setCopied((prev) => {
          console.log('Setting copied from', prev, 'to true');
          return true;
        });

        setTimeout(() => {
          console.log('Resetting copied state');
          setCopied(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        // Try legacy method
        console.log('Trying legacy copy method');
        const textArea = document.createElement('textarea');
        textArea.value = fullMessage;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          const success = document.execCommand('copy');
          console.log('Legacy copy success:', success);
          if (success) {
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 2000);
          }
        } catch (e) {
          console.error('Legacy copy failed:', e);
        }
        document.body.removeChild(textArea);
      }
      return;
    }

    // Mobile with Web Share API: Use native share
    console.log('Using mobile share API');
    try {
      await navigator.share({
        title: 'Songs That Feel Like This',
        text: fullMessage,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // User cancelled
      }
      console.log('Text-only share failed:', err);
    }
  }, [playClick]);

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
