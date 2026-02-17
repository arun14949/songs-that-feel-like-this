'use client';

import { useState, useRef } from 'react';
import { useSounds } from '@/hooks/useSounds';

interface ImageUploaderProps {
  onUpload: (base64: string) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onUpload, disabled }: ImageUploaderProps) {
  const { playClick } = useSounds();
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'];

  const validateFile = (file: File): string | null => {
    // Check file extension for HEIC (iOS browsers often don't set correct MIME type)
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.jpg') ||
                             fileName.endsWith('.jpeg') ||
                             fileName.endsWith('.png') ||
                             fileName.endsWith('.webp') ||
                             fileName.endsWith('.heic') ||
                             fileName.endsWith('.heif');

    if (!ALLOWED_TYPES.includes(file.type) && !hasValidExtension) {
      return 'Please upload a JPG, PNG, WebP, or HEIC image';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Image must be less than 10MB';
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

  const resizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Target max dimensions for AI analysis (smaller = faster upload & processing)
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;

          let width = img.width;
          let height = img.height;

          // Calculate scaling to fit within max dimensions while preserving aspect ratio
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with 0.8 quality (good balance of quality vs size)
          // This typically reduces file size by 70-90% while maintaining visual quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
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
      let processedFile = file;

      // Detect HEIC/HEIF files - check file extension first (more reliable than MIME type on iOS)
      const fileName = file.name.toLowerCase();
      const isHEIC = fileName.endsWith('.heic') ||
                     fileName.endsWith('.heif') ||
                     file.type === 'image/heic' ||
                     file.type === 'image/heif';

      // Convert HEIC/HEIF to JPEG if needed
      if (isHEIC) {
        console.log('Detecting HEIC file, attempting conversion...');
        console.log('File name:', file.name, 'File type:', file.type);

        try {
          // Dynamically import heic2any only when needed (avoids SSR issues)
          const heic2any = (await import('heic2any')).default;
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9,
          });
          // heic2any can return Blob or Blob[], handle both cases
          const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          processedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
          console.log('HEIC converted successfully to JPEG');
        } catch (heicError: any) {
          console.error('HEIC conversion error details:', heicError);

          // Provide specific guidance based on error code
          let errorMessage = 'Could not convert HEIC image. ';
          if (heicError?.code === 2 || heicError?.message?.includes('FORMAT_NOT_SUPPORTED')) {
            errorMessage += 'This HEIC format variant is not supported. Please:';
            errorMessage += '\n1. Use your camera app to take a new photo in JPG format';
            errorMessage += '\n2. Or convert the HEIC to JPG using your photo app before uploading';
          } else {
            errorMessage += 'Please try taking a photo in JPG format from camera settings.';
          }

          setError(errorMessage);
          return;
        }
      }

      // Get original for preview
      const originalBase64 = await convertToBase64(processedFile);
      setPreview(originalBase64);

      // Resize and compress for upload/AI analysis
      const compressedBase64 = await resizeAndCompressImage(processedFile);

      // Log compression stats for debugging
      const originalSize = (originalBase64.length * 0.75) / (1024 * 1024); // Approximate MB
      const compressedSize = (compressedBase64.length * 0.75) / (1024 * 1024); // Approximate MB
      console.log(`Image compressed: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);

      onUpload(compressedBase64);
    } catch (err) {
      console.error('Image processing error:', err);
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
    playClick();
    fileInputRef.current?.click();
  };

  return (
    <div className="w-[280px] mx-auto">
      {/* Polaroid frame container with rotation */}
      <div className="relative w-full">
        <div className="flex items-center justify-center">
          <div
            className={`w-full transition-all ${
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
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
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
                      <div className="mb-2">
                        <p className="font-[family-name:var(--font-serif)] text-lg text-[#fbfbfb]">
                          Upload a memory
                        </p>
                      </div>

                      {/* File requirements */}
                      <p className="font-[family-name:var(--font-sans)] text-[14px] text-[#5c5c5c] tracking-wide mt-1 whitespace-nowrap">
                        JPG, PNG, HEIC • Max 10MB
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

              {/* Bottom caption area - empty in uploader, only shows in PolaroidFrame during loading */}
              <div className="mt-6 transform -rotate-1 min-h-[24px]">
                {/* Empty - caption only shows during actual loading in PolaroidFrame */}
              </div>

              {/* Tape accent at top */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-24 h-8 bg-[rgba(255,255,255,0.4)] backdrop-blur-[1px] border border-[rgba(255,255,255,0.2)] border-solid" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 whitespace-pre-line">{error}</p>
        </div>
      )}
    </div>
  );
}
