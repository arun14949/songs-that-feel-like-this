'use client';

import { useRouter } from 'next/navigation';

interface AppBarProps {
  title: string;
  showBack?: boolean;
}

export default function AppBar({ title, showBack = true }: AppBarProps) {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream-50/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Back Button */}
          {showBack && (
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-brown-600 hover:text-brown-700 font-[family-name:var(--font-sans)] font-medium transition-colors"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
          )}

          {/* Title */}
          <h1 className="font-[family-name:var(--font-serif)] text-2xl text-gray-800 absolute left-1/2 transform -translate-x-1/2">
            {title}
          </h1>

          {/* Right spacer (for balance) */}
          <div className="w-16"></div>
        </div>
      </div>
    </header>
  );
}
