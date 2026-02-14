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
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            Songs That Feel Like This
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload an image and discover songs that match its vibe. Let AI find the perfect soundtrack for your visual mood.
          </p>
        </div>

        {/* Main Content */}
        {loading ? (
          <LoadingState message={loadingMessage} />
        ) : (
          <div className="space-y-8">
            <ImageUploader onUpload={handleImageUpload} disabled={loading} />

            {/* Examples */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Try uploading a sunset, cityscape, or any image that evokes a mood
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-8 max-w-2xl mx-auto">
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

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">
            Powered by OpenAI GPT-4 Vision and Spotify
          </p>
        </div>
      </div>
    </main>
  );
}
