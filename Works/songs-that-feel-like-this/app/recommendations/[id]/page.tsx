'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SongRecommendations from '@/components/SongRecommendations';
import ShareButton from '@/components/ShareButton';
import LoadingState from '@/components/LoadingState';
import PolaroidFrame from '@/components/PolaroidFrame';
import AppBar from '@/components/AppBar';
import type { Recommendation } from '@/lib/types';

export default function RecommendationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string>('');

  useEffect(() => {
    params.then((resolvedParams) => {
      setId(resolvedParams.id);
      fetchRecommendation(resolvedParams.id);
    });
  }, [params]);

  const fetchRecommendation = async (recommendationId: string) => {
    try {
      const response = await fetch(`/api/recommendations/${recommendationId}`);

      if (response.status === 404) {
        setError('Recommendation not found');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load recommendation');
      }

      const data = await response.json();
      setRecommendation(data.recommendation);
    } catch (err: any) {
      setError(err.message || 'Failed to load recommendation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="relative min-h-screen py-12 px-4">
        <LoadingState message="Loading your recommendations..." />
      </main>
    );
  }

  if (error || !recommendation) {
    return (
      <main className="relative min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-cream-50 border border-gray-200 rounded-xl shadow-lg p-8">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="font-[family-name:var(--font-serif)] text-2xl text-gray-900 mb-2">
              {error || 'Recommendation Not Found'}
            </h2>
            <p className="font-[family-name:var(--font-sans)] text-gray-600 mb-6">
              This recommendation may have been deleted or the link might be invalid.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brown-600 hover:bg-brown-700 text-white font-[family-name:var(--font-sans)] font-medium rounded-lg transition-colors"
            >
              Create New Recommendation
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* App Bar */}
      <AppBar title="Your Song Recommendations" />

      {/* Main Content with top padding */}
      <main className="relative min-h-screen pt-20 pb-12 px-6">
        <div className="max-w-sm mx-auto z-10">
          {/* Polaroid Frame with Uploaded Image */}
          {recommendation.imageUrl && (
            <div className="mb-8 flex flex-col items-center">
              <PolaroidFrame imageUrl={recommendation.imageUrl} className="w-[280px]" />
            </div>
          )}

          {/* Share Button */}
          <div className="mb-10 flex justify-center">
            <ShareButton />
          </div>

          {/* Section Heading with Decorative Lines */}
          <div className="mb-6 flex items-center gap-2 px-1">
            <div className="h-px bg-[#8b4513] flex-1" />
            <h2 className="font-[family-name:var(--font-serif)] text-lg text-[#212121] tracking-wide text-center leading-tight whitespace-pre-wrap">
              Your Song{'\n'}Recommendations
            </h2>
            <div className="h-px bg-[#8b4513] flex-1" />
          </div>

          {/* Song Recommendations */}
          <SongRecommendations songs={recommendation.songs} />
        </div>
      </main>
    </>
  );
}
