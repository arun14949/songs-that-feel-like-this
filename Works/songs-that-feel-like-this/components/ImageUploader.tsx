'use client';

import { useState, useRef } from 'react';

interface ImageUploaderProps {
  onUpload: (base64: string) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onUpload, disabled }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a JPG, PNG, or WebP image';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Image must be less than 5MB';
    }
    return null;
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      setPreview(base64);
      onUpload(base64);
    } catch (err) {
      setError('Failed to process image');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Polaroid frame container with rotation */}
      <div className="relative w-full aspect-[4/5]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`w-full transform rotate-2 transition-all ${
              dragActive ? 'scale-105' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            {/* Polaroid outer frame */}
            <div className="bg-cream-50 border border-gray-100 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_20px_25px_-5px_rgba(0,0,0,0.15),0px_10px_10px_-5px_rgba(0,0,0,0.04)] p-4 pb-12">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleChange}
                disabled={disabled}
              />

              {/* Image area */}
              <div className="bg-[#1a1a1a] border border-gray-200 aspect-[4/5] w-full overflow-hidden relative">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                    {/* Camera icon */}
                    <svg className="w-11 h-10 mb-3 opacity-90" viewBox="0 0 44 40" fill="currentColor">
                      <path d="M22 0C9.85 0 0 8.95 0 20s9.85 20 22 20 22-8.95 22-20S34.15 0 22 0zm0 30c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10z" opacity="0.5"/>
                      <circle cx="22" cy="20" r="6" />
                    </svg>

                    {/* Handwritten text */}
                    <div className="transform -rotate-2">
                      <p className="font-[family-name:var(--font-handwriting)] text-2xl opacity-90">
                        Upload a memory...
                      </p>
                    </div>

                    {/* File requirements */}
                    <p className="font-[family-name:var(--font-sans)] text-[10px] text-gray-400 tracking-[1px] uppercase mt-4 opacity-50">
                      JPG, PNG • Max 5MB
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom caption area */}
              <div className="mt-2 transform -rotate-1">
                <p className="font-[family-name:var(--font-handwriting)] text-xl text-gray-700 text-center">
                  #mood
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top accent bar (decorative) */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-[rgba(255,255,255,0.4)] backdrop-blur-sm border border-[rgba(255,255,255,0.2)] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)]" />
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
