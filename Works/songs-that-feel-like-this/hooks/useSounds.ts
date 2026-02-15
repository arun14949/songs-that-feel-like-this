'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useSounds() {
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const backClickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize click sounds
    if (typeof window !== 'undefined') {
      try {
        clickAudioRef.current = new Audio('/sounds/camera-click.wav');
        clickAudioRef.current.volume = 0.5;
        clickAudioRef.current.preload = 'auto';

        // Add error handler for click
        clickAudioRef.current.addEventListener('error', (e) => {
          console.error('Error loading click sound:', e);
        });

        // Add loaded handler
        clickAudioRef.current.addEventListener('canplaythrough', () => {
          console.log('Click sound loaded successfully');
        });

        // Initialize back click sound
        backClickAudioRef.current = new Audio('/sounds/back-click.wav');
        backClickAudioRef.current.volume = 0.5;
        backClickAudioRef.current.preload = 'auto';

        // Add error handler for back click
        backClickAudioRef.current.addEventListener('error', (e) => {
          console.error('Error loading back click sound:', e);
        });

        // Add loaded handler
        backClickAudioRef.current.addEventListener('canplaythrough', () => {
          console.log('Back click sound loaded successfully');
        });
      } catch (err) {
        console.error('Error initializing sounds:', err);
      }
    }

    return () => {
      if (clickAudioRef.current) {
        clickAudioRef.current = null;
      }
      if (backClickAudioRef.current) {
        backClickAudioRef.current = null;
      }
    };
  }, []);

  const playClick = useCallback(() => {
    if (clickAudioRef.current) {
      console.log('Playing click sound...');
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play()
        .then(() => {
          console.log('Click sound played successfully');
        })
        .catch((err) => {
          console.error('Click sound blocked or failed:', err);
        });
    } else {
      console.warn('Click audio ref is null');
    }
  }, []);

  const playBackClick = useCallback(() => {
    if (backClickAudioRef.current) {
      console.log('Playing back click sound...');
      backClickAudioRef.current.currentTime = 0;
      backClickAudioRef.current.play()
        .then(() => {
          console.log('Back click sound played successfully');
        })
        .catch((err) => {
          console.error('Back click sound blocked or failed:', err);
        });
    } else {
      console.warn('Back click audio ref is null');
    }
  }, []);

  return { playClick, playBackClick };
}
