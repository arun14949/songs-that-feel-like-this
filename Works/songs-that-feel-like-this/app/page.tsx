'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import LoadingState from '@/components/LoadingState';
import PolaroidFrame from '@/components/PolaroidFrame';
import { useSounds } from '@/hooks/useSounds';
import type { SpotifyTrack } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const { playAmbient, stopAmbient, toggleMute, isMuted } = useSounds();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Cleanup ambient sound on unmount
  useEffect(() => {
    return () => {
      stopAmbient();
    };
  }, [stopAmbient]);

  const handleImageUpload = async (base64Image: string) => {
    setLoading(true);
    setError(null);
    setUploadedImage(base64Image);  // Store the uploaded image

    try {
      // Step 1: Analyze image
      setLoadingMessage('Analyzing your image...');
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze image');
      }

      const { mood, songs } = await analyzeResponse.json();

      // Step 2: Enrich with Spotify data
      setLoadingMessage('Getting Spotify data...');
      const spotifyResponse = await fetch('/api/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs }),
      });

      if (!spotifyResponse.ok) {
        throw new Error('Failed to fetch Spotify data');
      }

      const { tracks }: { tracks: SpotifyTrack[] } = await spotifyResponse.json();

      if (tracks.length === 0) {
        throw new Error('Could not find these songs on Spotify. Please try a different image or try again.');
      }

      console.log(`Found ${tracks.length} songs on Spotify out of ${songs.length} recommended`);

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

      // Step 4: Stop ambient music before redirecting
      stopAmbient();

      // Step 5: Redirect to results
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
          <p className="font-[family-name:var(--font-sans)] text-xs font-normal text-[#757575] tracking-[2.4px]">
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
      <footer className="mt-auto pt-16 text-center z-10 space-y-4">
        {/* Mute Toggle Button */}
        <button
          onClick={toggleMute}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#757575] hover:text-[#212121] transition-colors"
          aria-label={isMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
        >
          {isMuted ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              <span className="font-[family-name:var(--font-sans)] text-xs">Sound Off</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span className="font-[family-name:var(--font-sans)] text-xs">Sound On</span>
            </>
          )}
        </button>
        <p className="font-[family-name:var(--font-sans)] text-[12px] text-[#b2b2b2] tracking-wide">
          © Inspired Monster
        </p>
      </footer>
    </main>
  );
}
