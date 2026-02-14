'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SongRecommendations from '@/components/SongRecommendations';
import ShareButton from '@/components/ShareButton';
import LoadingState from '@/components/LoadingState';
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
    <main className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block mb-6 text-brown-600 hover:text-brown-700 font-[family-name:var(--font-sans)] font-medium transition-colors"
          >
            ← Create New
          </Link>
          <h1 className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-gray-800 mb-6">
            Your Soundtrack
          </h1>

          {/* Share Button */}
          <div className="mb-8">
            <ShareButton />
          </div>
        </div>

        {/* Song Recommendations */}
        <SongRecommendations songs={recommendation.songs} />

        {/* Footer */}
        <div className="mt-16 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cream-50 border border-gray-200 hover:bg-cream-200 text-gray-700 font-[family-name:var(--font-sans)] font-medium rounded-lg transition-colors shadow-sm"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Another
          </Link>
        </div>
      </div>
    </main>
  );
}
