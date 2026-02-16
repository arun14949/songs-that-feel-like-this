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

    // Create abort controller with 60s timeout (longer than OpenAI's 45s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      // Log image size for debugging
      const imageSizeMB = (base64Image.length * 0.75) / (1024 * 1024);
      console.log(`Uploading image: ${imageSizeMB.toFixed(2)}MB`);

      // Step 1: Analyze image (more descriptive messages)
      setLoadingMessage('Understanding your image...');
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId); // Clear timeout if request succeeds

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({ error: 'Failed to analyze image' }));
        console.error('Analyze API error:', errorData, 'Status:', analyzeResponse.status);
        throw new Error(errorData.error || 'Failed to analyze image. Please try again.');
      }

      const { mood, songs } = await analyzeResponse.json();

      if (!mood || !songs || !Array.isArray(songs)) {
        throw new Error('Invalid response from server. Please try again.');
      }

      console.log(`AI recommended ${songs.length} songs`);

      // Step 2: Fetch ONLY first 3 songs for initial display (progressive loading)
      setLoadingMessage('Finding first songs on Spotify...');
      const spotifyResponse = await fetch('/api/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: songs.slice(0, 3), // Only first 3 songs
          phase: 'initial'
        }),
      });

      if (!spotifyResponse.ok) {
        // Handle timeout errors (504 Gateway Timeout, 584 Vercel timeout)
        if (spotifyResponse.status === 504 || spotifyResponse.status === 584) {
          throw new Error('Spotify search took too long. You may have hit the rate limit. Please wait a few minutes and try again.');
        }

        // Try to parse JSON error, fallback if not JSON (prevents "Unexpected token" errors)
        const errorData = await spotifyResponse.json().catch(() => ({
          error: 'Failed to find songs on Spotify'
        }));

        // Handle rate limit errors with specific retry-after time
        if (spotifyResponse.status === 429 && errorData.retryAfterMinutes) {
          throw new Error(`Spotify rate limit reached. Please try again in ${errorData.retryAfterMinutes} minute${errorData.retryAfterMinutes > 1 ? 's' : ''}.`);
        }

        // Fallback for other errors
        throw new Error(errorData.error || 'Could not find songs on Spotify. Please try again.');
      }

      const { tracks }: { tracks: SpotifyTrack[] } = await spotifyResponse.json();

      console.log(`Found ${tracks.length} initial songs on Spotify out of ${songs.length} total recommended`);

      // Require at least 2 songs to show results (lowered for progressive loading)
      if (tracks.length < 2) {
        throw new Error('Could not find these songs on Spotify. Please try a different image or try again.');
      }

      // Step 3: Save recommendation with initial tracks + all song suggestions for background loading
      const saveResponse = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood,
          songs: tracks, // Initial 3 songs with Spotify data
          allSongSuggestions: songs, // Store ALL 4-5 AI suggestions for progressive loading
          imageUrl: base64Image
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save recommendation');
      }

      const { id } = await saveResponse.json();

      // Step 4: Redirect to results
      router.push(`/recommendations/${id}`);
    } catch (err: any) {
      clearTimeout(timeoutId);

      // Handle abort/timeout specifically
      if (err.name === 'AbortError') {
        setError('Request took too long. Please try with a smaller image or check your internet connection.');
        setLoading(false);
        return;
      }

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
          <p className="font-[family-name:var(--font-sans)] text-sm font-normal text-[#5c5c5c] tracking-[0.025px]">
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
        {error && (() => {
          // Detect if it's a Spotify rate limit error
          const isSpotifyRateLimit = error?.toLowerCase().includes('spotify') &&
                                     (error?.toLowerCase().includes('rate limit') ||
                                      error?.toLowerCase().includes('needs a break'));

          return (
            <div
              ref={(el) => {
                if (el) {
                  // Scroll to error card when it appears (below fold on mobile)
                  setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }
              }}
              className="mt-8 w-full max-w-[328px]"
            >
              <div className="bg-[#fff3f3] border border-[#ffc7c9] rounded-[8px] pl-[8px] pr-[16px] py-[24px]">
                <div className="flex items-start gap-[8px]">
                  {/* 90x90 Error Icon */}
                  <img
                    src={isSpotifyRateLimit ? "/error-spotify.png" : "/error-generic.png"}
                    alt="Error icon"
                    className="w-[90px] h-[90px] shrink-0"
                  />

                  <div className="flex-1 flex flex-col">
                    {/* Title and Message Container */}
                    <div className="flex flex-col gap-[4px]">
                      {/* Title */}
                      <h3 className="font-[family-name:var(--font-serif)] font-bold text-[16px] text-[#ad0000] leading-[1.5] tracking-[0.25px]">
                        {isSpotifyRateLimit ? "Spotify Needs a Break!" : "Well This is Awkward!"}
                      </h3>

                      {/* Message */}
                      <p className="font-[family-name:var(--font-sans)] font-normal text-[14px] text-[#212121] leading-[1.4]">
                        {isSpotifyRateLimit
                          ? error.replace('Spotify rate limit reached. Please try again in', 'Too many requests right now. Please try again in')
                          : "Something broke. We're pretending it's fine."}
                      </p>
                    </div>

                    {/* CTA Button (only for generic errors) */}
                    {!isSpotifyRateLimit && (
                      <button
                        onClick={() => {
                          setError(null);
                          setUploadedImage(null);
                        }}
                        className="mt-[16px] font-[family-name:var(--font-sans)] font-bold text-[14px] text-[#212121] hover:text-[#ad0000] text-left leading-[1.5]"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-16 text-center z-10">
        <p className="font-[family-name:var(--font-sans)] text-[12px] text-[#b2b2b2] tracking-wide">
          © Inspired Monster · Version 1.3.2
        </p>
      </footer>
    </main>
  );
}
