'use client';

interface PolaroidFrameProps {
  imageUrl: string;
  caption?: string;
  className?: string;
}

export default function PolaroidFrame({ imageUrl, caption = '#mood', className = '' }: PolaroidFrameProps) {
  return (
    <div className={`inline-block ${className}`}>
      <div className="bg-cream-50 border border-gray-100 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_20px_25px_-5px_rgba(0,0,0,0.15),0px_10px_10px_-5px_rgba(0,0,0,0.04)] p-4 pb-12 transform rotate-2">
        <div className="bg-[#1a1a1a] border border-gray-200 aspect-[4/5] w-full overflow-hidden relative">
          <img
            src={imageUrl}
            alt="Uploaded memory"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="mt-2 transform -rotate-1">
          <p className="font-[family-name:var(--font-handwriting)] text-xl text-gray-700 text-center">
            {caption}
          </p>
        </div>
      </div>
    </div>
  );
}
