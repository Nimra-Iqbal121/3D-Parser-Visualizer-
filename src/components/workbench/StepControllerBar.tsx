import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  FastForward,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import { ParseStep } from '../../engine/types';

interface StepControllerBarProps {
  steps: ParseStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  speedMs: number;
  accepted: boolean;
  statusMessage: string;
  onStart: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onJumpToStep: (idx: number) => void;
  onSpeedChange: (ms: number) => void;
}

export const StepControllerBar: React.FC<StepControllerBarProps> = ({
  steps,
  currentStepIndex,
  isPlaying,
  speedMs,
  accepted,
  statusMessage,
  onStart,
  onTogglePlay,
  onPrev,
  onNext,
  onReset,
  onJumpToStep,
  onSpeedChange,
}) => {
  const hasSteps = steps.length > 0;
  const currentStep = hasSteps ? steps[Math.min(currentStepIndex, steps.length - 1)] : null;
  const totalSteps = Math.max(steps.length - 1, 0);

  return (
    <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-4 shadow-xs">
      {/* Row 1: Playback Controls + Speed + Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={!hasSteps}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <FastForward className="w-3.5 h-3.5" />
            Start
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!hasSteps}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FCEAF1] text-[#8F1F4C] border border-[#E8B4C9] hover:bg-[#F8DAE6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            onClick={onPrev}
            disabled={!hasSteps || currentStepIndex <= 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#F4E9DD] text-[#4C3640] hover:bg-[#EBD9C8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
            aria-label="Previous parsing step"
          >
            <SkipBack className="w-3.5 h-3.5" />
            Prev
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!hasSteps || currentStepIndex >= steps.length - 1}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#F4E9DD] text-[#4C3640] hover:bg-[#EBD9C8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
            aria-label="Next parsing step"
          >
            Next
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={!hasSteps}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#FFFDF9] border border-[#DECAB6] text-[#5A404B] hover:text-[#2B1B22] hover:border-[#C93B72] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            aria-label="Reset execution to step 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Speed Control & Step Readout */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs text-[#4C3640]">
            <span className="whitespace-nowrap">Speed:</span>
            <input
              type="range"
              min={250}
              max={1800}
              step={150}
              value={2050 - speedMs}
              onChange={(e) => onSpeedChange(2050 - Number(e.target.value))}
              aria-label="Playback speed"
              className="w-24 accent-[#C93B72] cursor-pointer"
            />
            <span className="font-mono text-[#785D68] w-12 text-right tabular-nums">
              {(1000 / speedMs).toFixed(1)}x
            </span>
          </label>

          <div className="text-xs font-mono text-[#5A404B] tabular-nums whitespace-nowrap">
            Step <span className="text-[#2B1B22] font-bold">{currentStep?.stepNumber ?? 0}</span> /{' '}
            {totalSteps}
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap">
            {currentStep?.status === 'accepted' ||
            (accepted && currentStepIndex === steps.length - 1 && hasSteps) ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#166A4A]" />
                <span className="text-[#166A4A]">Accepted</span>
              </>
            ) : !hasSteps || currentStep?.status === 'rejected' ? (
              <>
                <XCircle className="w-4 h-4 text-[#B51D3D]" />
                <span className="text-[#B51D3D]">{hasSteps ? 'Rejected' : 'Halted'}</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-[#C93B72]" />
                <span className="text-[#B42A60]">In Progress</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Scrubber */}
      {hasSteps && steps.length > 1 && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={steps.length - 1}
            value={currentStepIndex}
            onChange={(e) => onJumpToStep(Number(e.target.value))}
            aria-label="Execution step timeline scrubber"
            className="w-full accent-[#C93B72] cursor-pointer"
          />
        </div>
      )}

      {/* Three-Section Execution Telemetry: 1. Stack, 2. Remaining Input, 3. Current Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-3">
          <div className="text-[11px] font-medium text-[#785D68] mb-1">1. Parsing Stack</div>
          <div className="font-mono text-sm font-semibold text-[#B42A60] break-all">
            {currentStep ? currentStep.stack.join(' ') : '—'}
          </div>
        </div>

        <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-3">
          <div className="text-[11px] font-medium text-[#785D68] mb-1">2. Remaining Input</div>
          <div className="font-mono text-sm text-[#2B1B22] break-all">
            {currentStep ? (
              <>
                <span className="text-[#B42A60] font-bold underline decoration-[#C93B72]/70 underline-offset-4">
                  {currentStep.remainingInput[0] ?? '$'}
                </span>
                {currentStep.remainingInput.length > 1 && (
                  <span className="text-[#6E535E]">
                    {' '}
                    {currentStep.remainingInput.slice(1).join(' ')}
                  </span>
                )}
              </>
            ) : (
              '—'
            )}
          </div>
        </div>

        <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-3">
          <div className="text-[11px] font-medium text-[#785D68] mb-1">
            3. Current Action{' '}
            {currentStep?.precedenceRelation && currentStep.precedenceRelation !== 'none'
              ? `(Rel: ${currentStep.precedenceRelation})`
              : ''}
          </div>
          <div className="font-mono text-sm text-[#7E2F5C] font-semibold">
            {currentStep ? currentStep.actionLabel : statusMessage}
          </div>
        </div>
      </div>

      {/* Step Explanation Prose */}
      {currentStep && (
        <p className="text-xs text-[#4C3640] leading-relaxed border-t border-[#EFE3D7] pt-2.5">
          <span className="font-semibold text-[#2B1B22]">Step {currentStep.stepNumber} Detail: </span>
          {currentStep.explanation}
        </p>
      )}
    </div>
  );
};
