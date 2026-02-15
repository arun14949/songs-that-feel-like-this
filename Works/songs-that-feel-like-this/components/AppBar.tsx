'use client';

import { useRouter } from 'next/navigation';

interface AppBarProps {
  title: string;
  showBack?: boolean;
}

export default function AppBar({ title, showBack = true }: AppBarProps) {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[rgba(255,255,255,0.1)] backdrop-blur-[4px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 h-[72px]">
          {/* Back Button */}
          {showBack && (
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center w-8 h-8 hover:opacity-80 transition-opacity"
            >
              <img src="/back-icon.svg" alt="Back" className="w-8 h-8" />
            </button>
          )}

          {/* Title */}
          <h1 className="font-[family-name:var(--font-serif)] font-bold text-lg text-[#212121] tracking-wide flex-1 truncate">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
