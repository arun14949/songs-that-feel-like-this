'use client';

export default function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Skeleton for song cards */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-gray-200 rounded-2xl h-[152px] overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
        </div>
      ))}
    </div>
  );
}
