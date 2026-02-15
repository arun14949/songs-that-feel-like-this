'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SongRecommendations from '@/components/SongRecommendations';
import ShareButton from '@/components/ShareButton';
import PolaroidFrame from '@/components/PolaroidFrame';
import AppBar from '@/components/AppBar';
import SkeletonLoader from '@/components/SkeletonLoader';
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
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load recommendation');
      setLoading(false);
    }
  };

  return (
    <>
      {/* App Bar */}
      <AppBar title="Create New Recommendation" />

      {/* Main Content with top padding */}
      <main className="relative min-h-screen pt-20 pb-12 px-6">
        <div className="max-w-sm mx-auto z-10">
          {loading ? (
            // Loading state with skeleton
            <>
              {/* Polaroid Skeleton */}
              <div className="mb-10 flex flex-col items-center">
                <div className="w-[280px] animate-pulse">
                  <div className="bg-gray-200 rounded-lg" style={{ aspectRatio: '280/201', height: '201px' }} />
                  <div className="mt-4 h-8 bg-gray-200 rounded w-24 mx-auto" />
                </div>
              </div>

              {/* Section Heading */}
              <div className="mb-6 flex items-center gap-2 px-1">
                <div className="flex-1 h-px bg-[#8b4513]" />
                <h2 className="font-[family-name:var(--font-serif)] font-bold text-lg text-[#212121] tracking-wide text-center leading-tight whitespace-pre-wrap px-3">
                  Your Song{'\n'}Recommendations
                </h2>
                <div className="flex-1 h-px bg-[#8b4513]" />
              </div>

              {/* Skeleton Loader */}
              <SkeletonLoader />
            </>
          ) : error || !recommendation ? (
            // Error state
            <div className="max-w-2xl mx-auto text-center mt-12">
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
          ) : (
            // Success state - show recommendations
            <>
              {/* Polaroid Frame with Uploaded Image */}
              {recommendation.imageUrl && (
                <div className="mb-10 flex flex-col items-center">
                  <PolaroidFrame
                    imageUrl={recommendation.imageUrl}
                    caption={<ShareButton imageUrl={recommendation.imageUrl} />}
                    className="w-[280px]"
                    imageAspect="280/201"
                  />
                </div>
              )}

              {/* Section Heading with Decorative Lines */}
              <div className="mb-6 flex items-center gap-2 px-1">
                <div className="flex-1 h-px bg-[#8b4513]" />
                <h2 className="font-[family-name:var(--font-serif)] font-bold text-lg text-[#212121] tracking-wide text-center leading-tight whitespace-pre-wrap px-3">
                  Your Song{'\n'}Recommendations
                </h2>
                <div className="flex-1 h-px bg-[#8b4513]" />
              </div>

              {/* Song Recommendations */}
              <SongRecommendations songs={recommendation.songs} />
            </>
          )}
        </div>
      </main>
    </>
  );
}
