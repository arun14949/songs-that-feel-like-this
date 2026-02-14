'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import LoadingState from '@/components/LoadingState';
import type { SpotifyTrack } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (base64Image: string) => {
    setLoading(true);
    setError(null);

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

      const { mood } = await analyzeResponse.json();

      // Step 2: Get song recommendations
      setLoadingMessage('Finding the perfect songs...');
      const recommendResponse = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
      });

      if (!recommendResponse.ok) {
        throw new Error('Failed to get recommendations');
      }

      const { songs } = await recommendResponse.json();

      // Step 3: Enrich with Spotify data
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
        throw new Error('No songs found on Spotify');
      }

      // Step 4: Save recommendation
      const saveResponse = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, songs: tracks }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save recommendation');
      }

      const { id } = await saveResponse.json();

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
          <h1 className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-gray-800 leading-tight shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05)]">
            Songs That
            <br />
            <span className="italic text-brown-600">Feel Like This</span>
          </h1>
          <p className="font-[family-name:var(--font-sans)] text-xs font-semibold text-gray-600 tracking-[2.4px] uppercase">
            Every photo has a soundtrack
          </p>
        </header>

        {/* Main Content */}
        {loading ? (
          <LoadingState message={loadingMessage} />
        ) : (
          <>
            <ImageUploader onUpload={handleImageUpload} disabled={loading} />

            {/* Tagline */}
            <div className="mt-8 text-center max-w-sm opacity-80">
              <p className="font-[family-name:var(--font-serif)] italic text-lg text-gray-700 leading-relaxed">
                "Let the AI discover the perfect melody for your visual moments."
              </p>
            </div>
          </>
        )}

        {/* Error Display */}
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
                    onClick={() => setError(null)}
                    className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-16 text-center z-10">
        <p className="font-[family-name:var(--font-sans)] text-[10px] text-gray-400 tracking-[0.25px]">
          POWERED BY OPENAI & SPOTIFY
        </p>
      </footer>
    </main>
  );
}
