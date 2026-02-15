'use client';

export default function SkeletonLoader() {
  return (
    <div className="space-y-4">
      {/* Skeleton for song cards */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="bg-[#212121] rounded-2xl h-[152px] overflow-hidden relative"
        >
          {/* Shimmer gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2a2a2a] to-transparent animate-shimmer"
               style={{
                 backgroundSize: '200% 100%',
                 animation: 'shimmer 2s infinite'
               }}
          />

          {/* Content structure matching Spotify embed */}
          <div className="p-2 flex gap-2 h-full">
            {/* Album art skeleton */}
            <div className="w-[90px] h-[90px] bg-[#1a1a1a] rounded-lg shrink-0" />

            {/* Text content skeleton */}
            <div className="flex-1 flex flex-col gap-3 py-2">
              {/* Title */}
              <div className="h-4 bg-[#1a1a1a] rounded w-3/4" />
              {/* Artist */}
              <div className="h-3 bg-[#1a1a1a] rounded w-1/2" />
              {/* Spotify icon + Save button */}
              <div className="mt-auto flex gap-2 items-center">
                <div className="w-6 h-6 bg-[#1a1a1a] rounded-full" />
                <div className="h-3 bg-[#1a1a1a] rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
