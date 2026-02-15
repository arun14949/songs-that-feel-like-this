'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useSounds() {
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize ambient sound
    if (typeof window !== 'undefined') {
      try {
        ambientAudioRef.current = new Audio('/sounds/ambient-calm.mp3');
        ambientAudioRef.current.loop = true;
        ambientAudioRef.current.volume = 0.3;
        ambientAudioRef.current.preload = 'auto';

        // Add error handler for ambient
        ambientAudioRef.current.addEventListener('error', (e) => {
          console.error('Error loading ambient sound:', e);
        });

        // Add loaded handler
        ambientAudioRef.current.addEventListener('canplaythrough', () => {
          console.log('Ambient sound loaded successfully');
        });

        clickAudioRef.current = new Audio('/sounds/wooden-click.mp3');
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
      } catch (err) {
        console.error('Error initializing sounds:', err);
      }
    }

    return () => {
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current = null;
      }
      if (clickAudioRef.current) {
        clickAudioRef.current = null;
      }
    };
  }, []);

  const playAmbient = useCallback(() => {
    if (ambientAudioRef.current) {
      console.log('Attempting to play ambient sound...');
      ambientAudioRef.current.play()
        .then(() => {
          console.log('Ambient sound playing successfully');
        })
        .catch((err) => {
          console.error('Ambient sound autoplay blocked or failed:', err);
        });
    } else {
      console.warn('Ambient audio ref is null');
    }
  }, []);

  const stopAmbient = useCallback(() => {
    if (ambientAudioRef.current) {
      console.log('Stopping ambient sound...');
      ambientAudioRef.current.pause();
      ambientAudioRef.current.currentTime = 0;
    }
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

  return { playAmbient, stopAmbient, playClick };
}
