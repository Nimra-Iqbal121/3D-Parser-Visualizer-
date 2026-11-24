import { useEffect, useState } from 'react';
import { ParseStep } from '../../engine/types';

export function useStepPlayback(steps: ParseStep[]) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(850);

  // Reset step index when a new parsing run completes
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!isPlaying || steps.length <= 1) return;
    if (currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, speedMs);
    return () => window.clearTimeout(timer);
  }, [isPlaying, currentStepIndex, speedMs, steps.length]);

  const handleStart = () => {
    if (steps.length === 0) return;
    setCurrentStepIndex(0);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (steps.length === 0) return;
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((v) => !v);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(steps.length - 1, 0)));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const handleJump = (idx: number) => {
    setIsPlaying(false);
    setCurrentStepIndex(Math.max(0, Math.min(idx, Math.max(steps.length - 1, 0))));
  };

  return {
    currentStepIndex,
    currentStep: steps.length > 0 ? steps[Math.min(currentStepIndex, steps.length - 1)] : null,
    isPlaying,
    speedMs,
    setSpeedMs,
    handleStart,
    handleTogglePlay,
    handlePrev,
    handleNext,
    handleReset,
    handleJump,
  };
}
