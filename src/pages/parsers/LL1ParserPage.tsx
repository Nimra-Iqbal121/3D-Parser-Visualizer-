import React, { useEffect, useState } from 'react';
import { getDefaultDemoForParser } from '../../engine/demos';
import { PARSER_METADATA } from '../../engine/comparisonData';
import { formatProduction } from '../../engine/grammar';
import { runLL1Parser } from '../../engine/ll1';
import { DemoExample, EOF_SYMBOL, LL1Result } from '../../engine/types';
import { ParserVisualizer } from '../../components/workbench/ParserVisualizer';
import { GrammarInputPanel } from '../../components/workbench/GrammarInputPanel';
import { DiagnosticPanel } from '../../components/workbench/DiagnosticPanel';
import { useStepPlayback } from '../../components/workbench/useStepPlayback';

interface LL1ParserPageProps {
  externalDemo?: DemoExample | null;
  onClearExternalDemo?: () => void;
}

function loadSavedLL1Draft(fallbackGrammar: string, fallbackInput: string) {
  try {
    const raw = window.sessionStorage.getItem('pv3d_draft_ll1');
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

export const LL1ParserPage: React.FC<LL1ParserPageProps> = ({
  externalDemo,
  onClearExternalDemo,
}) => {
  const defaultDemo = getDefaultDemoForParser('ll1');
  const initial =
    externalDemo && externalDemo.parser === 'll1'
      ? {
          grammar: externalDemo.grammar,
          input: externalDemo.input,
          startSymbol: externalDemo.startSymbol ?? '',
        }
      : loadSavedLL1Draft(defaultDemo.grammar, defaultDemo.input);

  const [grammarText, setGrammarText] = useState(initial.grammar);
  const [inputText, setInputText] = useState(initial.input);
  const [startSymbol, setStartSymbol] = useState(initial.startSymbol);
  const [result, setResult] = useState<LL1Result>(() =>
    runLL1Parser(initial.grammar, initial.input, initial.startSymbol || undefined)
  );

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        'pv3d_draft_ll1',
        JSON.stringify({ grammar: grammarText, input: inputText, startSymbol })
      );
    } catch {
      // ignore
    }
  }, [grammarText, inputText, startSymbol]);

  useEffect(() => {
    if (externalDemo && externalDemo.parser === 'll1') {
      setGrammarText(externalDemo.grammar);
      setInputText(externalDemo.input);
      setStartSymbol(externalDemo.startSymbol ?? '');
      setResult(runLL1Parser(externalDemo.grammar, externalDemo.input, externalDemo.startSymbol));
      onClearExternalDemo?.();
    }
  }, [externalDemo, onClearExternalDemo]);

  const execute = (g = grammarText, inp = inputText, s = startSymbol) => {
    setResult(runLL1Parser(g, inp, s || undefined));
  };

  const handleLoadDemo = (demo: DemoExample) => {
    setGrammarText(demo.grammar);
    setInputText(demo.input);
    setStartSymbol(demo.startSymbol ?? '');
    execute(demo.grammar, demo.input, demo.startSymbol ?? '');
  };

  const playback = useStepPlayback(result.steps);
  const meta = PARSER_METADATA.ll1;

  const colTerminals = result.grammar ? [...result.grammar.terminals, EOF_SYMBOL] : [];
  const activeNT = playback.currentStep?.production?.split('→')[0]?.trim();
  const activeLookahead = playback.currentStep?.currentToken;

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <div className="text-xs font-semibold text-[#B42A60]">
          Top-Down Parsing · Non-Recursive Predictive Table
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          {meta.name}
        </h1>
        <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">
          {meta.summary} Inspect left-recursion &amp; left-factoring checks, dynamically calculated FIRST
          and FOLLOW sets, the predictive table M[A, a], and synchronized 3D stack &amp; parse-tree execution.
        </p>
      </header>

      <GrammarInputPanel
        parserId="ll1"
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
        default3DMode="stack"
        onStart={playback.handleStart}
        onTogglePlay={playback.handleTogglePlay}
        onPrev={playback.handlePrev}
        onNext={playback.handleNext}
        onReset={playback.handleReset}
        onJumpToStep={playback.handleJump}
        onSpeedChange={playback.setSpeedMs}
      />

      {/* FIRST & FOLLOW Sets */}
      {result.grammar && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
              Algorithmic FIRST &amp; FOLLOW Sets
            </h3>
            <span className="text-xs text-[#785D68]">
              Active non-terminal row highlights during step playback
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="text-[#785D68] border-b border-[#E4D4C3]">
                <tr>
                  <th className="py-2 pr-3 font-medium">Non-Terminal</th>
                  <th className="py-2 px-3 font-medium">FIRST(X)</th>
                  <th className="py-2 pl-3 font-medium">FOLLOW(X)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D7] font-mono">
                {result.grammar.nonTerminals.map((nt) => (
                  <tr key={nt} className={nt === activeNT ? 'bg-[#FCEAF1]' : ''}>
                    <td className="py-2 pr-3 font-bold text-[#B42A60]">{nt}</td>
                    <td className="py-2 px-3 text-[#2B1B22]">
                      {`{ ${(result.firstSets[nt] || []).join(', ')} }`}
                    </td>
                    <td className="py-2 pl-3 text-[#7E2F5C]">
                      {`{ ${(result.followSets[nt] || []).join(', ')} }`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* LL(1) Predictive Parsing Table M[A, a] */}
      {result.grammar && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
              LL(1) Predictive Parsing Table M[Non-Terminal, Lookahead]
            </h3>
            <span className="text-xs text-[#785D68]">
              Active rule cell highlighted during step playback
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#E4D4C3] text-[#6E535E]">
                  <th className="py-2 px-3 bg-[#F6ECE1] font-semibold text-[#4C3640]">NT \ Term</th>
                  {colTerminals.map((term) => (
                    <th
                      key={term}
                      className={`py-2 px-3 border-l border-[#E8DACB] ${
                        term === activeLookahead
                          ? 'text-[#9D2454] bg-[#FCEAF1] font-bold'
                          : 'bg-[#F6ECE1]'
                      }`}
                    >
                      {term}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D7]">
                {result.grammar.nonTerminals.map((nt) => (
                  <tr key={nt}>
                    <td className="py-2.5 px-3 font-bold text-[#B42A60] bg-[#FAF4EC]">
                      {nt}
                    </td>
                    {colTerminals.map((term) => {
                      const cell = result.table[nt]?.[term];
                      const isHot = nt === activeNT && term === activeLookahead;
                      return (
                        <td
                          key={term}
                          className={`py-2.5 px-3 border-l border-[#EFE3D7] align-top ${
                            cell?.hasConflict
                              ? 'bg-[#FDECEF] text-[#9F1936] border border-[#EBA8B8]'
                              : isHot
                              ? 'bg-[#FCEAF1] text-[#2B1B22] font-bold ring-1 ring-inset ring-[#C93B72]'
                              : 'text-[#4C3640]'
                          }`}
                        >
                          {cell && cell.entries.length > 0 ? (
                            <div className="space-y-1">
                              {cell.entries.map((p) => (
                                <div key={p.id} className="whitespace-nowrap">
                                  {formatProduction(p)}
                                </div>
                              ))}
                              {cell.hasConflict && (
                                <div className="text-[10px] text-[#B51D3D] font-sans font-semibold">
                                  Conflict ({cell.conflictType})
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#C4B0A2]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Step-by-Step Execution Table */}
      {result.steps.length > 0 && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
          <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
            LL(1) Parsing Trace
          </h3>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#FFFDF9] text-[#785D68] border-b border-[#E4D4C3]">
                <tr>
                  <th className="py-2 pr-3 font-medium">Step</th>
                  <th className="py-2 px-3 font-medium">Stack (Bottom → Top)</th>
                  <th className="py-2 px-3 font-medium">Remaining Input</th>
                  <th className="py-2 px-3 font-medium">Production / Action</th>
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
                      <td className="py-2 px-3 text-[#B42A60]">{s.stack.join(' ')}</td>
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
