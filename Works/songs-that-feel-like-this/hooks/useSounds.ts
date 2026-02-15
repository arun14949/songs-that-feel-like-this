'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useSounds() {
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize ambient sound
    if (typeof window !== 'undefined') {
      ambientAudioRef.current = new Audio('/sounds/ambient-calm.mp3');
      ambientAudioRef.current.loop = true;
      ambientAudioRef.current.volume = 0.3;

      clickAudioRef.current = new Audio('/sounds/wooden-click.mp3');
      clickAudioRef.current.volume = 0.5;
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
      ambientAudioRef.current.play().catch((err) => {
        console.log('Ambient sound autoplay blocked:', err);
      });
    }
  }, []);

  const stopAmbient = useCallback(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.pause();
      ambientAudioRef.current.currentTime = 0;
    }
  }, []);

  const playClick = useCallback(() => {
    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play().catch((err) => {
        console.log('Click sound blocked:', err);
      });
    }
  }, []);

  return { playAmbient, stopAmbient, playClick };
}
