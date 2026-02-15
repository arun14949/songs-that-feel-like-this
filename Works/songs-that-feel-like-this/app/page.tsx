'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import LoadingState from '@/components/LoadingState';
import PolaroidFrame from '@/components/PolaroidFrame';
import type { SpotifyTrack } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = async (base64Image: string) => {
    setLoading(true);
    setError(null);
    setUploadedImage(base64Image);  // Store the uploaded image

    try {
      // Step 1: Analyze image (more descriptive messages)
      setLoadingMessage('Understanding your image...');
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({ error: 'Failed to analyze image' }));
        throw new Error(errorData.error || 'Failed to analyze image. Please try again.');
      }

      const { mood, songs } = await analyzeResponse.json();

      if (!mood || !songs || !Array.isArray(songs)) {
        throw new Error('Invalid response from server. Please try again.');
      }

      console.log(`AI recommended ${songs.length} songs`);

      // Step 2: Enrich with Spotify data (show progress)
      setLoadingMessage('Finding songs on Spotify...');
      const spotifyResponse = await fetch('/api/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs }),
      });

      if (!spotifyResponse.ok) {
        // Handle Vercel 584 timeout error (returns HTML, not JSON)
        if (spotifyResponse.status === 584) {
          throw new Error('Request took too long. Please try again with a different image.');
        }

        // Try to parse JSON error, fallback if not JSON (prevents "Unexpected token" errors)
        const errorData = await spotifyResponse.json().catch(() => ({
          error: 'Failed to find songs on Spotify'
        }));

        // If rate limited, show retry-after time
        if (spotifyResponse.status === 429 && errorData.retryAfter) {
          throw new Error(`Spotify rate limit reached. Please wait ${errorData.retryAfter} seconds and try again.`);
        }

        throw new Error(errorData.error || 'Failed to fetch Spotify data');
      }

      const { tracks }: { tracks: SpotifyTrack[] } = await spotifyResponse.json();

      console.log(`Found ${tracks.length} songs on Spotify out of ${songs.length} recommended`);

      // Require at least 3 songs to show results (lowered threshold for 5-6 song recommendations)
      if (tracks.length < 3) {
        throw new Error('Could not find these songs on Spotify. Please try a different image or try again.');
      }

      // Step 3: Save recommendation
      const saveResponse = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, songs: tracks, imageUrl: base64Image }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save recommendation');
      }

      const { id } = await saveResponse.json();

      // Step 4: Redirect to results
      router.push(`/recommendations/${id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-between py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto flex flex-col items-center z-10">
        {/* Header */}
        <header className="text-center mb-8 space-y-3">
          <h1 className="font-[family-name:var(--font-serif)] font-bold text-[40px] md:text-5xl text-[#212121] leading-tight">
            Songs That
            <br />
            <span className="italic text-[#8b4513]">Feel Like This</span>
          </h1>
          <p className="font-[family-name:var(--font-sans)] text-sm font-normal text-[#757575] tracking-[0.025px]">
            Every photo has a soundtrack
          </p>
        </header>

        {/* Main Content */}
        {uploadedImage ? (
          <div className="w-full flex flex-col items-center">
            {/* Show polaroid with uploaded image - loading message shown in caption */}
            <PolaroidFrame
              imageUrl={uploadedImage}
              className="w-[280px]"
              loading={loading}
              loadingMessage={loadingMessage}
              imageAspect="280/370"
            />
          </div>
        ) : (
          <ImageUploader onUpload={handleImageUpload} disabled={loading} />
        )}

        {/* Error Display - shown below polaroid or in main area */}
        {error && (
          <div className="mt-8 w-full max-w-md">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Something went wrong
                  </h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      setUploadedImage(null); // Reset to allow new upload
                    }}
                    className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
                  >
                    Try again with a new image
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-16 text-center z-10">
        <p className="font-[family-name:var(--font-sans)] text-[12px] text-[#b2b2b2] tracking-wide">
          © Inspired Monster · Version 1.0.1
        </p>
      </footer>
    </main>
  );
}
