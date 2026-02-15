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
              <div className="mb-10 w-full animate-pulse">
                <div className="bg-gray-200 rounded-lg w-full" style={{ aspectRatio: '280/201' }} />
                <div className="mt-4 h-8 bg-gray-200 rounded w-24 mx-auto" />
              </div>

              {/* Section Heading */}
              <div className="mb-6 px-1">
                <h2 className="font-[family-name:var(--font-serif)] font-bold text-lg text-[#8b4513] tracking-wide text-center">
                  Your Song Recommendations
                </h2>
              </div>

              {/* Skeleton Loader */}
              <SkeletonLoader />
            </>
          ) : error || !recommendation ? (
            // Error state - matching Figma design
            <div className="max-w-sm mx-auto mt-2">
              <div className="bg-white rounded-3xl p-4 pb-6 flex flex-col items-center gap-0.5">
                {/* Broken link illustration */}
                <div className="w-[200px] h-[200px] relative">
                  <img
                    src="/broken-link.png"
                    alt="Broken link"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-6 w-full">
                  {/* Text content */}
                  <div className="flex flex-col gap-2 text-center tracking-wide">
                    <h2 className="font-[family-name:var(--font-serif)] font-bold text-2xl text-[#212121] leading-tight whitespace-pre-wrap">
                      {'Oops!!\nRecommendation not found.'}
                    </h2>
                    <p className="font-[family-name:var(--font-sans)] text-base text-[#757575] leading-[1.4]">
                      This recommendation may have been deleted or the link might be invalid.
                    </p>
                  </div>

                  {/* Button */}
                  <Link
                    href="/"
                    className="bg-[#8b4513] h-14 flex items-center justify-center rounded-full w-full hover:bg-[#6d3610] transition-colors"
                  >
                    <span className="font-[family-name:var(--font-sans)] font-bold text-sm text-white tracking-wide">
                      Create New Recommendation
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            // Success state - show recommendations
            <>
              {/* Polaroid Frame with Uploaded Image */}
              {recommendation.imageUrl && (
                <div className="mb-10">
                  <PolaroidFrame
                    imageUrl={recommendation.imageUrl}
                    caption={<ShareButton imageUrl={recommendation.imageUrl} />}
                    className="w-full"
                    imageAspect="280/201"
                    noRotation={true}
                  />
                </div>
              )}

              {/* Section Heading */}
              <div className="mb-6 px-1">
                <h2 className="font-[family-name:var(--font-serif)] font-bold text-lg text-[#8b4513] tracking-wide text-center">
                  Your Song Recommendations
                </h2>
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
