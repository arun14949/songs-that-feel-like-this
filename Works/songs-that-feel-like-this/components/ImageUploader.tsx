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
    <div className="w-[280px] mx-auto">
      {/* Polaroid frame container with rotation */}
      <div className="relative w-full">
        <div className="flex items-center justify-center">
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
            <div className="bg-[#fbfbfb] border border-gray-100 shadow-[0px_10px_16px_0px_rgba(91,84,70,0.2)] p-4 pb-6 relative">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleChange}
                disabled={disabled}
              />

              {/* Image area with paper texture - 280x370px */}
              <div className="bg-[#212121] w-full overflow-hidden relative" style={{ aspectRatio: '280/370' }}>
                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {/* Paper Texture Overlay */}
                    <div className="absolute inset-0 pointer-events-none mix-blend-difference opacity-30">
                      <img
                        src="/textures/paper-texture.png"
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 p-8">
                      {/* Camera icon */}
                      <img src="/camera-icon.svg" alt="" className="w-12 h-12 mb-4 opacity-90" />

                      {/* Upload text */}
                      <div className="transform -rotate-2 mb-2">
                        <p className="font-[family-name:var(--font-serif)] text-lg text-[#fbfbfb]">
                          Upload a memory
                        </p>
                      </div>

                      {/* File requirements */}
                      <p className="font-[family-name:var(--font-sans)] text-[14px] text-[#757575] tracking-wide mt-1">
                        JPG, PNG • Max 5MB
                      </p>
                    </div>
                    {/* Paper Texture Overlay */}
                    <div className="absolute inset-0 pointer-events-none mix-blend-difference opacity-30">
                      <img
                        src="/textures/paper-texture.png"
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Bottom caption area */}
              <div className="mt-6 transform -rotate-1">
                <p className="font-[family-name:var(--font-serif)] text-base text-[#212121] text-center tracking-wide">
                  Loading States here...
                </p>
              </div>

              {/* Tape accent at top */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-24 h-8 bg-[rgba(255,255,255,0.4)] backdrop-blur-[1px] border border-[rgba(255,255,255,0.2)] border-solid" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}
