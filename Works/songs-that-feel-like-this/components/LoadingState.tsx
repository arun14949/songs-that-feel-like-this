'use client';

interface LoadingStateProps {
  message: string;
}

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 border-4 border-accent-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-accent-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-lg font-medium text-gray-700 animate-pulse">
        {message}
      </p>
    </div>
  );
}
