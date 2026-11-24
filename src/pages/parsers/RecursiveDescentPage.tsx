import React, { useEffect, useState } from 'react';
import { getDefaultDemoForParser } from '../../engine/demos';
import { PARSER_METADATA } from '../../engine/comparisonData';
import { runRecursiveDescent } from '../../engine/recursiveDescent';
import { DemoExample, RDResult } from '../../engine/types';
import { ParserVisualizer } from '../../components/workbench/ParserVisualizer';
import { GrammarInputPanel } from '../../components/workbench/GrammarInputPanel';
import { DiagnosticPanel } from '../../components/workbench/DiagnosticPanel';
import { useStepPlayback } from '../../components/workbench/useStepPlayback';

interface RecursiveDescentPageProps {
  externalDemo?: DemoExample | null;
  onClearExternalDemo?: () => void;
}

function loadSavedRDDraft(fallbackGrammar: string, fallbackInput: string) {
  try {
    const raw = window.sessionStorage.getItem('pv3d_draft_rd');
    if (raw) {
      const parsed = JSON.parse(raw) as { grammar?: string; input?: string; startSymbol?: string };
      if (typeof parsed.grammar === 'string' && typeof parsed.input === 'string') {
        return {
          grammar: parsed.grammar,
          input: parsed.input,
          startSymbol: typeof parsed.startSymbol === 'string' ? parsed.startSymbol : '',
        };
      }
    }
  } catch {
    // ignore
  }
  return { grammar: fallbackGrammar, input: fallbackInput, startSymbol: '' };
}

export const RecursiveDescentPage: React.FC<RecursiveDescentPageProps> = ({
  externalDemo,
  onClearExternalDemo,
}) => {
  const defaultDemo = getDefaultDemoForParser('rd');
  const initial =
    externalDemo && externalDemo.parser === 'rd'
      ? {
          grammar: externalDemo.grammar,
          input: externalDemo.input,
          startSymbol: externalDemo.startSymbol ?? '',
        }
      : loadSavedRDDraft(defaultDemo.grammar, defaultDemo.input);

  const [grammarText, setGrammarText] = useState(initial.grammar);
  const [inputText, setInputText] = useState(initial.input);
  const [startSymbol, setStartSymbol] = useState(initial.startSymbol);
  const [result, setResult] = useState<RDResult>(() =>
    runRecursiveDescent(initial.grammar, initial.input, initial.startSymbol || undefined)
  );

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        'pv3d_draft_rd',
        JSON.stringify({ grammar: grammarText, input: inputText, startSymbol })
      );
    } catch {
      // ignore
    }
  }, [grammarText, inputText, startSymbol]);

  useEffect(() => {
    if (externalDemo && externalDemo.parser === 'rd') {
      setGrammarText(externalDemo.grammar);
      setInputText(externalDemo.input);
      setStartSymbol(externalDemo.startSymbol ?? '');
      setResult(runRecursiveDescent(externalDemo.grammar, externalDemo.input, externalDemo.startSymbol));
      onClearExternalDemo?.();
    }
  }, [externalDemo, onClearExternalDemo]);

  const execute = (g = grammarText, inp = inputText, s = startSymbol) => {
    setResult(runRecursiveDescent(g, inp, s || undefined));
  };

  const handleLoadDemo = (demo: DemoExample) => {
    setGrammarText(demo.grammar);
    setInputText(demo.input);
    setStartSymbol(demo.startSymbol ?? '');
    execute(demo.grammar, demo.input, demo.startSymbol ?? '');
  };

  const playback = useStepPlayback(result.steps);
  const meta = PARSER_METADATA.rd;

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <div className="text-xs font-semibold text-[#B42A60]">
          Top-Down Parsing · Procedure-Driven Leftmost Derivation
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          {meta.name}
        </h1>
        <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">
          {meta.summary} Each non-terminal compiles into a recursive procedure that matches terminals
          against the lookahead token and invokes child procedures to build the parse tree from root to leaves.
        </p>
      </header>

      <GrammarInputPanel
        parserId="rd"
        grammarText={grammarText}
        inputText={inputText}
        startSymbol={startSymbol}
        onGrammarChange={setGrammarText}
        onInputChange={setInputText}
        onStartSymbolChange={setStartSymbol}
        onRun={() => execute()}
        onLoadDemo={handleLoadDemo}
        restrictionsNote={meta.restrictionsNote}
      />

      <DiagnosticPanel
        diagnostics={result.diagnostics}
        onApplyGrammarCorrection={(fixed) => {
          setGrammarText(fixed);
          execute(fixed, inputText, startSymbol);
        }}
        onApplyInputCorrection={(fixedInput) => {
          setInputText(fixedInput);
          execute(grammarText, fixedInput, startSymbol);
        }}
      />

      <ParserVisualizer
        family="Top-Down"
        parserLabel={meta.name}
        steps={result.steps}
        currentStepIndex={playback.currentStepIndex}
        isPlaying={playback.isPlaying}
        speedMs={playback.speedMs}
        accepted={result.accepted}
        statusMessage={result.statusMessage}
        default3DMode="tree"
        onStart={playback.handleStart}
        onTogglePlay={playback.handleTogglePlay}
        onPrev={playback.handlePrev}
        onNext={playback.handleNext}
        onReset={playback.handleReset}
        onJumpToStep={playback.handleJump}
        onSpeedChange={playback.setSpeedMs}
      />

      {/* Generated Recursive Procedures & Live Call Frames */}
      <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
            Generated Recursive Procedures
          </h3>
          <span className="text-xs text-[#785D68]">
            Each non-terminal translates into a recursive parsing function
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <pre className="lg:col-span-8 rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-3.5 font-mono text-xs text-[#7E2F5C] overflow-x-auto leading-relaxed max-h-64">
            {result.generatedPseudocode || 'Enter a valid grammar to generate recursive procedures.'}
          </pre>

          <div className="lg:col-span-4 rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-3.5 space-y-2">
            <h4 className="text-xs font-semibold text-[#2B1B22]">Active Call Chain</h4>
            {playback.currentStep?.callStack && playback.currentStep.callStack.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                {playback.currentStep.callStack.map((frame, i) => (
                  <React.Fragment key={`${frame}-${i}`}>
                    <span className="px-2 py-1 rounded bg-[#FCEAF1] border border-[#E6B0C6] text-[#8F1F4C] font-semibold">
                      {frame}
                    </span>
                    {i < (playback.currentStep?.callStack?.length ?? 0) - 1 && (
                      <span className="text-[#9B7E8A]">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#785D68] font-mono">Call stack idle</p>
            )}
          </div>
        </div>
      </section>

      {/* Step-by-Step Derivation & Execution Log */}
      {result.steps.length > 0 && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
          <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
            Step-by-Step Recursive Execution Trace
          </h3>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#FFFDF9] text-[#785D68] border-b border-[#E4D4C3]">
                <tr>
                  <th className="py-2 pr-3 font-medium">Step</th>
                  <th className="py-2 px-3 font-medium">Call Stack</th>
                  <th className="py-2 px-3 font-medium">Remaining Input</th>
                  <th className="py-2 px-3 font-medium">Rule / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D7] font-mono">
                {result.steps.map((s, idx) => {
                  const active = idx === playback.currentStepIndex;
                  return (
                    <tr
                      key={s.stepNumber}
                      onClick={() => playback.handleJump(idx)}
                      className={`cursor-pointer transition-colors ${
                        active ? 'bg-[#FCEAF1] text-[#2B1B22] font-semibold' : 'text-[#4C3640] hover:bg-[#FAF4EC]'
                      }`}
                    >
                      <td className="py-2 pr-3 tabular-nums text-[#785D68]">{s.stepNumber}</td>
                      <td className="py-2 px-3 text-[#B42A60]">{s.callStack?.join(' → ') || '—'}</td>
                      <td className="py-2 px-3">{s.remainingInput.join(' ')}</td>
                      <td className="py-2 px-3">{s.actionLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
