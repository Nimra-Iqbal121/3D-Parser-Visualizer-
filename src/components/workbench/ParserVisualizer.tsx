import React, { useEffect, useMemo, useState } from 'react';
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
  LayoutPanelLeft,
  GitBranch,
  Network,
  Box,
  ArrowDown,
  Check,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { LRState, ParseStep } from '../../engine/types';
import {
  computeInputTape,
  computeStackDiff,
  getOperationMeta,
} from '../../engine/visualizerHelpers';
import { ParseTree2D } from './ParseTree2D';
import { LRAutomaton2D } from './LRAutomaton2D';
import { ParserStage3D, Stage3DMode } from '../three/ParserStage3D';

export type VisualizerTab = 'guided' | 'tree' | 'dfa' | '3d';

interface ParserVisualizerProps {
  family: 'Top-Down' | 'Bottom-Up';
  parserLabel: string;
  steps: ParseStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  speedMs: number;
  accepted: boolean;
  statusMessage: string;
  lrStates?: LRState[];
  showLookaheads?: boolean;
  selectedStateId?: number;
  onSelectState?: (stateId: number) => void;
  default3DMode?: Stage3DMode;
  onStart: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onJumpToStep: (idx: number) => void;
  onSpeedChange: (ms: number) => void;
  /** Optional OPP context so the Guided view highlights Top Terminal vs Lookahead */
  oppTopTerminal?: string;
}

export const ParserVisualizer: React.FC<ParserVisualizerProps> = ({
  family,
  parserLabel,
  steps,
  currentStepIndex,
  isPlaying,
  speedMs,
  accepted,
  statusMessage,
  lrStates,
  showLookaheads = false,
  selectedStateId,
  onSelectState,
  default3DMode = 'stack',
  onStart,
  onTogglePlay,
  onPrev,
  onNext,
  onReset,
  onJumpToStep,
  onSpeedChange,
  oppTopTerminal,
}) => {
  const hasDFA = Boolean(lrStates && lrStates.length > 0);
  const [activeTab, setActiveTab] = useState<VisualizerTab>('guided');
  const [rightPaneMode, setRightPaneMode] = useState<'dfa' | 'tree'>(hasDFA ? 'dfa' : 'tree');

  useEffect(() => {
    setRightPaneMode(hasDFA ? 'dfa' : 'tree');
    if (!hasDFA && activeTab === 'dfa') {
      setActiveTab('guided');
    }
  }, [hasDFA, activeTab]);

  // Keyboard navigation (Left/Right arrow keys when not focused in a form field)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onNext, onPrev]);

  const hasSteps = steps.length > 0;
  const clampedIdx = hasSteps ? Math.min(currentStepIndex, steps.length - 1) : 0;
  const step = hasSteps ? steps[clampedIdx] : null;
  const prevStep = hasSteps && clampedIdx > 0 ? steps[clampedIdx - 1] : null;
  const totalSteps = Math.max(steps.length - 1, 0);

  const initialRemaining = steps[0]?.remainingInput ?? step?.remainingInput ?? ['$'];
  const tapeItems = useMemo(
    () => computeInputTape(initialRemaining, step?.remainingInput ?? ['$']),
    [initialRemaining, step?.remainingInput]
  );

  const isCallStackMode = Boolean(step?.callStack && step.callStack.length > 0 && !hasDFA && parserLabel.includes('Recursive'));
  const displayStack = useMemo(() => {
    if (isCallStackMode && step?.callStack) return step.callStack;
    return step?.stack ?? ['$'];
  }, [isCallStackMode, step]);

  const prevDisplayStack = useMemo(() => {
    if (!prevStep) return null;
    if (isCallStackMode && prevStep.callStack) return prevStep.callStack;
    return prevStep.stack;
  }, [isCallStackMode, prevStep]);

  const stackDiff = useMemo(
    () => computeStackDiff(prevDisplayStack, displayStack),
    [prevDisplayStack, displayStack]
  );

  const opMeta = getOperationMeta(step?.operation);

  const activeLRState =
    hasDFA && lrStates ? lrStates[step?.activeState ?? 0] ?? lrStates[0] : null;

  const isFinishedAccepted =
    step?.status === 'accepted' || (accepted && clampedIdx === steps.length - 1 && hasSteps);
  const isRejected = !hasSteps || step?.status === 'rejected';

  return (
    <section
      className="rounded-2xl bg-[#FFFDF9] border border-[#E4D4C3] shadow-sm overflow-hidden"
      aria-label={`${parserLabel} Interactive Visualizer`}
    >
      {/* 1. UNIFIED TOP BAR: View Mode Tabs + Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#F6ECE1] border-b border-[#E4D4C3]">
        {/* View Switcher Tabs */}
        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#FFFDF9] border border-[#E2CFBE]"
          role="tablist"
          aria-label="Visualizer display mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'guided'}
            onClick={() => setActiveTab('guided')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'guided'
                ? 'bg-[#C93B72] text-white font-semibold shadow-xs'
                : 'text-[#5A404B] hover:text-[#2B1B22] hover:bg-[#FAF4EC]'
            }`}
          >
            <LayoutPanelLeft className="w-3.5 h-3.5" />
            Guided Visual
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tree'}
            onClick={() => setActiveTab('tree')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'tree'
                ? 'bg-[#C93B72] text-white font-semibold shadow-xs'
                : 'text-[#5A404B] hover:text-[#2B1B22] hover:bg-[#FAF4EC]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Parse Tree
          </button>

          {hasDFA && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'dfa'}
              onClick={() => setActiveTab('dfa')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'dfa'
                  ? 'bg-[#7E2F5C] text-white font-semibold shadow-xs'
                  : 'text-[#5A404B] hover:text-[#2B1B22] hover:bg-[#FAF4EC]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              LR Automaton
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === '3d'}
            onClick={() => setActiveTab('3d')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === '3d'
                ? 'bg-[#C93B72] text-white font-semibold shadow-xs'
                : 'text-[#5A404B] hover:text-[#2B1B22] hover:bg-[#FAF4EC]'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D Interactive View
          </button>
        </div>

        {/* Integrated Step Playback Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={!hasSteps}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FastForward className="w-3.5 h-3.5" />
            Start
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!hasSteps}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FCEAF1] text-[#8F1F4C] border border-[#E6B0C6] hover:bg-[#F8DAE6] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            onClick={onPrev}
            disabled={!hasSteps || clampedIdx <= 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#FFFDF9] border border-[#DECAB6] text-[#4C3640] hover:border-[#C93B72] hover:text-[#B42A60] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            aria-label="Previous parsing step"
          >
            <SkipBack className="w-3.5 h-3.5" />
            Prev
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!hasSteps || clampedIdx >= steps.length - 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFFDF9] border border-[#C93B72] text-[#9D2454] hover:bg-[#FCEAF1] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            aria-label="Next parsing step"
          >
            Next
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={!hasSteps}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#FFFDF9] border border-[#DECAB6] text-[#5A404B] hover:text-[#2B1B22] disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            aria-label="Reset execution to step 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-[#DECAB6]">
            <label className="inline-flex items-center gap-1.5 text-[11px] text-[#5A404B]">
              <span>Speed</span>
              <input
                type="range"
                min={250}
                max={1800}
                step={150}
                value={2050 - speedMs}
                onChange={(e) => onSpeedChange(2050 - Number(e.target.value))}
                aria-label="Playback speed"
                className="w-16 accent-[#C93B72] cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 2. PLAIN-ENGLISH LIVE STEP STORY STRIP + TIMELINE SCRUBBER */}
      <div className="px-4 py-3 bg-[#FFFDF9] border-b border-[#EFE3D7] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-wide font-mono shrink-0 ${opMeta.bgClass} ${opMeta.borderClass} ${opMeta.textClass}`}
            >
              {opMeta.badge}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-sm font-bold text-[#2B1B22]">
                  {step ? step.actionLabel : statusMessage}
                </span>
                <span className="text-xs text-[#785D68]">
                  — {step ? step.explanation : 'Click Parse & Visualize to start stepping.'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono text-[#5A404B] tabular-nums">
              Step <strong className="text-[#2B1B22]">{step?.stepNumber ?? 0}</strong> / {totalSteps}
            </span>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
              {isFinishedAccepted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#166A4A]" />
                  <span className="text-[#166A4A]">Accepted</span>
                </>
              ) : isRejected ? (
                <>
                  <XCircle className="w-4 h-4 text-[#B51D3D]" />
                  <span className="text-[#B51D3D]">{hasSteps ? 'Rejected' : 'Halted'}</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 text-[#C93B72]" />
                  <span className="text-[#B42A60]">Stepping</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Scrubber */}
        {hasSteps && steps.length > 1 && (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              value={clampedIdx}
              onChange={(e) => onJumpToStep(Number(e.target.value))}
              aria-label="Execution step timeline scrubber"
              className="w-full accent-[#C93B72] cursor-pointer h-1.5"
            />
            <span className="hidden sm:inline text-[11px] text-[#8A6D79] whitespace-nowrap">
              Use ← / → keys to step
            </span>
          </div>
        )}
      </div>

      {/* 3. MAIN VISUALIZATION BODY */}
      <div className="p-4 bg-[#FBF6F0]">
        {/* TAB A: GUIDED SPLIT VISUAL (DEFAULT — CRYSTAL CLEAR & STUDENT-FRIENDLY) */}
        {activeTab === 'guided' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* LEFT PANE: INPUT TOKEN TAPE + VISUAL STACK + DECISION SUMMARY */}
            <div className="lg:col-span-5 flex flex-col gap-3.5">
              {/* Input Token Tape */}
              <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-display font-semibold text-[#2B1B22]">
                    Input Token Tape
                  </h3>
                  <span className="text-[11px] text-[#785D68]">
                    Lookahead:{' '}
                    <strong className="font-mono text-[#B42A60]">
                      {step?.remainingInput?.[0] ?? '$'}
                    </strong>
                  </span>
                </div>

                <div
                  className="flex flex-wrap items-end gap-1.5 pt-4 pb-1"
                  aria-label="Input token progress tape"
                >
                  {tapeItems.map((item) => {
                    const isCurrent = item.status === 'current';
                    const isMatched = item.status === 'matched';
                    return (
                      <div key={item.index} className="relative flex flex-col items-center">
                        {isCurrent && (
                          <span className="absolute -top-5 inline-flex items-center gap-0.5 text-[10px] font-bold text-[#C93B72] whitespace-nowrap">
                            <ArrowDown className="w-3 h-3" />
                            READ
                          </span>
                        )}
                        <div
                          className={`min-w-[38px] px-2.5 py-1.5 rounded-lg border font-mono text-xs font-bold text-center transition-all flex items-center justify-center gap-1 ${
                            isCurrent
                              ? 'bg-[#C93B72] text-white border-[#9D2454] shadow-sm -translate-y-0.5'
                              : isMatched
                              ? 'bg-[#E9F6F0] text-[#166A4A] border-[#A7DBC5] opacity-80'
                              : 'bg-[#FAF4EC] text-[#4C3640] border-[#DFCCB9]'
                          }`}
                        >
                          {isMatched && <Check className="w-3 h-3 shrink-0" />}
                          <span>{item.token}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#785D68] pt-1 border-t border-[#F0E5DA]">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-[#166A4A] inline-block" />
                    Matched
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-[#C93B72] inline-block" />
                    Current Lookahead
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-[#DFCCB9] inline-block" />
                    Unread
                  </span>
                </div>
              </div>

              {/* OPP Precedence Comparison Banner (shown when OPP step has a relation) */}
              {step?.precedenceRelation && step.precedenceRelation !== 'none' && (
                <div className="rounded-xl bg-[#FCEAF1] border border-[#E6B0C6] p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-mono font-bold text-[#2B1B22]">
                    <span className="px-2 py-0.5 rounded bg-[#FFFDF9] border border-[#DFC9B7]">
                      {oppTopTerminal ?? '$'}
                    </span>
                    <span className="text-base text-[#B42A60]">{step.precedenceRelation}</span>
                    <span className="px-2 py-0.5 rounded bg-[#FFFDF9] border border-[#DFC9B7]">
                      {step.currentToken ?? '$'}
                    </span>
                  </div>
                  <span className="font-semibold text-[#8F1F4C]">
                    {step.precedenceRelation === '>'
                      ? 'Takes precedence → Reduce'
                      : step.precedenceRelation === '<'
                      ? 'Yields precedence → Shift'
                      : 'Equal precedence → Shift'}
                  </span>
                </div>
              )}

              {/* Visual Parsing Stack / Call Stack */}
              <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-3.5 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-display font-semibold text-[#2B1B22] inline-flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#C93B72]" />
                      {isCallStackMode ? 'Recursive Function Call Stack' : 'Parsing Stack (Top at top)'}
                    </h3>
                    <span className="text-[11px] font-mono text-[#785D68]">
                      {displayStack.length} {isCallStackMode ? 'frames' : 'symbols'}
                    </span>
                  </div>

                  {/* Stack Diff Callout (what changed this step) */}
                  {(stackDiff.popped.length > 0 || stackDiff.pushed.length > 0) && clampedIdx > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono bg-[#FAF4EC] border border-[#E8DACB] rounded-lg px-2.5 py-1.5">
                      {stackDiff.popped.length > 0 && (
                        <span className="text-[#7E2F5C]">
                          Popped:{' '}
                          <strong className="line-through decoration-[#B51D3D]/70">
                            {stackDiff.popped.join(' ')}
                          </strong>
                        </span>
                      )}
                      {stackDiff.popped.length > 0 && stackDiff.pushed.length > 0 && (
                        <ArrowRight className="w-3 h-3 text-[#9B7E8A]" />
                      )}
                      {stackDiff.pushed.length > 0 && (
                        <span className="text-[#B42A60]">
                          Pushed: <strong>{stackDiff.pushed.join(' ')}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Vertical Stack Tiles (Top-most element rendered at top) */}
                  <div
                    className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto pr-1"
                    aria-label="Visual parsing stack"
                  >
                    {[...displayStack].reverse().map((sym, revIdx) => {
                      const origIdx = displayStack.length - 1 - revIdx;
                      const isTop = revIdx === 0;
                      const isNewlyPushed =
                        clampedIdx > 0 && origIdx >= stackDiff.commonPrefixLength;
                      return (
                        <div
                          key={`${origIdx}-${sym}`}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border font-mono text-xs transition-all ${
                            isTop
                              ? 'bg-[#FCEAF1] border-[#C93B72] text-[#2B1B22] font-bold shadow-xs'
                              : isNewlyPushed
                              ? 'bg-[#F8EEF4] border-[#D7B2C9] text-[#2B1B22] font-semibold'
                              : 'bg-[#FAF4EC] border-[#E4D4C3] text-[#4C3640]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-[#9B7E8A] w-5 tabular-nums">
                              #{origIdx}
                            </span>
                            <span className="truncate text-sm">{sym}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isNewlyPushed && (
                              <span className="px-1.5 py-0.5 rounded bg-[#FFFDF9] border border-[#E0A4BE] text-[10px] font-sans font-semibold text-[#9D2454]">
                                + NEW
                              </span>
                            )}
                            {isTop && (
                              <span className="px-1.5 py-0.5 rounded bg-[#C93B72] text-white text-[10px] font-sans font-bold">
                                TOP
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LR Active State Quick Card inside Left Pane */}
                {activeLRState && (
                  <div className="rounded-lg bg-[#F8EEF4] border border-[#DFB9CE] px-3 py-2 text-xs flex items-center justify-between gap-2">
                    <span className="text-[#5A404B]">
                      Active Automaton State:{' '}
                      <strong className="font-mono text-[#7E2F5C]">{activeLRState.label}</strong>
                    </span>
                    <span className="font-mono text-[11px] text-[#7E2F5C]">
                      {activeLRState.items.length} LR item{activeLRState.items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANE: LIVE PARSE TREE OR INTERACTIVE 2D LR AUTOMATON */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-3.5 flex-1 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-display font-semibold text-[#2B1B22]">
                      {hasDFA && rightPaneMode === 'dfa'
                        ? 'Interactive LR State Machine (DFA)'
                        : 'Live Growing Parse Tree'}
                    </h3>
                    <p className="text-[11px] text-[#785D68]">
                      {hasDFA && rightPaneMode === 'dfa'
                        ? 'Follows active state transitions left-to-right from I0. Click any circle to inspect items.'
                        : 'Synchronized with every step so you can see exactly how the derivation tree builds.'}
                    </p>
                  </div>

                  {hasDFA && (
                    <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[#F5ECE1] border border-[#E4D4C3]">
                      <button
                        type="button"
                        onClick={() => setRightPaneMode('dfa')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          rightPaneMode === 'dfa'
                            ? 'bg-[#7E2F5C] text-white'
                            : 'text-[#5A404B] hover:text-[#2B1B22]'
                        }`}
                      >
                        State Graph
                      </button>
                      <button
                        type="button"
                        onClick={() => setRightPaneMode('tree')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          rightPaneMode === 'tree'
                            ? 'bg-[#C93B72] text-white'
                            : 'text-[#5A404B] hover:text-[#2B1B22]'
                        }`}
                      >
                        Parse Tree
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  {hasDFA && rightPaneMode === 'dfa' ? (
                    <LRAutomaton2D
                      states={lrStates ?? []}
                      step={step}
                      showLookaheads={showLookaheads}
                      selectedStateId={selectedStateId}
                      onSelectState={onSelectState}
                      compact
                    />
                  ) : (
                    <ParseTree2D root={step?.treeSnapshot ?? null} compact />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB B: FULL-WIDTH INTERACTIVE PARSE TREE */}
        {activeTab === 'tree' && (
          <div className="space-y-2">
            <ParseTree2D root={step?.treeSnapshot ?? null} />
          </div>
        )}

        {/* TAB C: FULL-WIDTH INTERACTIVE 2D LR AUTOMATON */}
        {activeTab === 'dfa' && hasDFA && (
          <LRAutomaton2D
            states={lrStates ?? []}
            step={step}
            showLookaheads={showLookaheads}
            selectedStateId={selectedStateId}
            onSelectState={onSelectState}
          />
        )}

        {/* TAB D: FULL-WIDTH INTERACTIVE 3D STAGE */}
        {activeTab === '3d' && (
          <ParserStage3D
            step={step}
            family={family}
            lrStates={lrStates}
            defaultMode={default3DMode}
            heightClass="h-[460px]"
          />
        )}
      </div>
    </section>
  );
};
