'use client';

import { useState } from 'react';

interface ShareButtonProps {
  imageUrl?: string;
}

export default function ShareButton({ imageUrl }: ShareButtonProps = {}) {
  const [copied, setCopied] = useState(false);

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

  const handleShare = async () => {
    const url = window.location.href;
    const shareText = 'Check out these song recommendations based on my image!';
    const fullMessage = `${shareText}\n\n${url}`;

    // Try Web Share API with image if available (mobile)
    if (navigator.share) {
      try {
        // If image URL is provided, create polaroid version and share it with text
        if (imageUrl && imageUrl.startsWith('data:image/')) {
          try {
            // Create polaroid-styled image
            const polaroidBlob = await createPolaroidImage(imageUrl);
            const file = new File([polaroidBlob], 'memory-polaroid.jpg', { type: 'image/jpeg' });

            // Check if files can be shared
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              // Share with both text and file
              await navigator.share({
                title: 'Songs That Feel Like This',
                text: fullMessage,
                files: [file],
              });
              return;
            }
          } catch (err) {
            console.log('Could not create polaroid image to share:', err);
            // Fall through to text-only share
          }
        }

        // Text-only share (fallback or no image)
        await navigator.share({
          title: 'Songs That Feel Like This',
          text: fullMessage,
        });
        return;
      } catch (err) {
        // Fall through to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(fullMessage);
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
