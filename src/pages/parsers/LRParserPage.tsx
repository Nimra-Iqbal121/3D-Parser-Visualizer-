import React, { useEffect, useState } from 'react';
import { getDefaultDemoForParser } from '../../engine/demos';
import { PARSER_METADATA } from '../../engine/comparisonData';
import { formatProduction } from '../../engine/grammar';
import { runLRParser } from '../../engine/lr';
import { DemoExample, EOF_SYMBOL, LRItem, LRResult } from '../../engine/types';
import { ParserVisualizer } from '../../components/workbench/ParserVisualizer';
import { GrammarInputPanel } from '../../components/workbench/GrammarInputPanel';
import { DiagnosticPanel } from '../../components/workbench/DiagnosticPanel';
import { useStepPlayback } from '../../components/workbench/useStepPlayback';

interface LRParserPageProps {
  variant: 'lr0' | 'slr1' | 'clr1' | 'lalr1';
  externalDemo?: DemoExample | null;
  onClearExternalDemo?: () => void;
}

function formatLRItem(item: LRItem, showLookahead: boolean): string {
  const before = item.rhs.slice(0, item.dot).join(' ');
  const after = item.rhs.slice(item.dot).join(' ');
  const rhs = [before, '·', after].filter(Boolean).join(' ');
  if (showLookahead && item.lookaheads.length > 0) {
    return `[ ${item.lhs} → ${rhs},  ${item.lookaheads.join(' / ')} ]`;
  }
  return `${item.lhs} → ${rhs}`;
}

function loadSavedDraft(variant: string, fallbackGrammar: string, fallbackInput: string) {
  try {
    const raw = window.sessionStorage.getItem(`pv3d_draft_${variant}`);
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
    // ignore storage errors
  }
  return { grammar: fallbackGrammar, input: fallbackInput, startSymbol: '' };
}

export const LRParserPage: React.FC<LRParserPageProps> = ({
  variant,
  externalDemo,
  onClearExternalDemo,
}) => {
  const defaultDemo = getDefaultDemoForParser(variant);
  const initialDraft =
    externalDemo && externalDemo.parser === variant
      ? {
          grammar: externalDemo.grammar,
          input: externalDemo.input,
          startSymbol: externalDemo.startSymbol ?? '',
        }
      : loadSavedDraft(variant, defaultDemo.grammar, defaultDemo.input);

  const [grammarText, setGrammarText] = useState(initialDraft.grammar);
  const [inputText, setInputText] = useState(initialDraft.input);
  const [startSymbol, setStartSymbol] = useState(initialDraft.startSymbol);
  const [result, setResult] = useState<LRResult>(() =>
    runLRParser(
      variant,
      initialDraft.grammar,
      initialDraft.input,
      initialDraft.startSymbol || undefined
    )
  );
  const [selectedStateId, setSelectedStateId] = useState<number>(0);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        `pv3d_draft_${variant}`,
        JSON.stringify({ grammar: grammarText, input: inputText, startSymbol })
      );
    } catch {
      // ignore storage errors
    }
  }, [variant, grammarText, inputText, startSymbol]);

  useEffect(() => {
    if (externalDemo && externalDemo.parser === variant) {
      setGrammarText(externalDemo.grammar);
      setInputText(externalDemo.input);
      setStartSymbol(externalDemo.startSymbol ?? '');
      setResult(
        runLRParser(variant, externalDemo.grammar, externalDemo.input, externalDemo.startSymbol)
      );
      setSelectedStateId(0);
      onClearExternalDemo?.();
    }
  }, [variant, externalDemo, onClearExternalDemo]);

  const execute = (g = grammarText, inp = inputText, s = startSymbol) => {
    setResult(runLRParser(variant, g, inp, s || undefined));
    setSelectedStateId(0);
  };

  const handleLoadDemo = (demo: DemoExample) => {
    setGrammarText(demo.grammar);
    setInputText(demo.input);
    setStartSymbol(demo.startSymbol ?? '');
    execute(demo.grammar, demo.input, demo.startSymbol ?? '');
  };

  const playback = useStepPlayback(result.steps);
  const meta = PARSER_METADATA[variant];
  const showLookaheads = variant === 'clr1' || variant === 'lalr1';
  const termCols = result.grammar ? [...result.grammar.terminals, EOF_SYMBOL] : [];
  const gotoCols = result.grammar ? result.grammar.nonTerminals : [];
  const activeState = playback.currentStep?.activeState ?? selectedStateId;
  const activeLookahead = playback.currentStep?.currentToken;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#7E2F5C]">
            Bottom-Up LR Family · {meta.shortName} Canonical Automaton
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
            {meta.name}
          </h1>
          <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">
            {meta.summary}
          </p>
        </div>
        <span className="text-xs text-[#6E535E] font-mono tabular-nums">
          {result.states.length} DFA States
          {variant === 'lalr1' && result.clrStateCount !== undefined
            ? ` (merged from ${result.clrStateCount} CLR(1) states)`
            : ''}
          {' · '}Active State: <strong className="text-[#B42A60]">{result.states[activeState]?.label ?? 'I0'}</strong>
        </span>
      </header>

      <GrammarInputPanel
        parserId={variant}
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
        family="Bottom-Up"
        parserLabel={meta.name}
        steps={result.steps}
        currentStepIndex={playback.currentStepIndex}
        isPlaying={playback.isPlaying}
        speedMs={playback.speedMs}
        accepted={result.accepted}
        statusMessage={result.statusMessage}
        lrStates={result.states}
        showLookaheads={showLookaheads}
        selectedStateId={selectedStateId}
        onSelectState={setSelectedStateId}
        default3DMode="dfa"
        onStart={playback.handleStart}
        onTogglePlay={playback.handleTogglePlay}
        onPrev={playback.handlePrev}
        onNext={playback.handleNext}
        onReset={playback.handleReset}
        onJumpToStep={playback.handleJump}
        onSpeedChange={playback.setSpeedMs}
      />

      {/* LALR(1) Core State Merging Summary */}
      {variant === 'lalr1' && result.mergeGroups && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#DFB9CE] p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold text-sm text-[#7E2F5C]">
              LALR(1) State Core Merging Summary
            </h3>
            <span className="text-xs font-mono text-[#5A404B] tabular-nums">
              {result.clrStateCount} CLR(1) states → {result.states.length} LALR(1) states (
              {result.mergeGroups.length} merged core group{result.mergeGroups.length === 1 ? '' : 's'})
            </span>
          </div>
          {result.mergeGroups.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {result.mergeGroups.map((mg) => {
                const st = result.states[mg.mergedId];
                return (
                  <div
                    key={mg.mergedId}
                    className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-3 text-xs space-y-1"
                  >
                    <div className="font-mono font-bold text-[#7E2F5C]">
                      State {st?.label} ← Merged CLR states {mg.originalIds.map((id) => `I${id}`).join(' + ')}
                    </div>
                    <div className="text-[#6E535E]">
                      Identical LR(0) core ({st?.items.length} items) with unioned lookahead sets.
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#6E535E]">
              All CLR(1) states for this grammar already had distinct LR(0) cores; no states required merging.
            </p>
          )}
        </section>
      )}

      {/* Augmented Grammar + FIRST/FOLLOW Sets */}
      {result.grammar && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className={variant === 'lr0' ? 'lg:col-span-12 rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-2 shadow-xs' : 'lg:col-span-5 rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-2 shadow-xs'}>
            <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
              Augmented Grammar (Numbered for Reduce Actions)
            </h3>
            <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-3 font-mono text-xs space-y-1">
              {result.augmentedProductions.map((p) => (
                <div key={p.id} className="flex items-center gap-3 text-[#2B1B22]">
                  <span className="text-[#8A6D79] w-6 tabular-nums">({p.id})</span>
                  <span className={p.id === 0 ? 'text-[#B42A60] font-bold' : ''}>
                    {formatProduction(p)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {variant !== 'lr0' && (
            <div className="lg:col-span-7 rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-2 shadow-xs">
              <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
                FIRST &amp; FOLLOW Sets {variant === 'slr1' ? '(Used for SLR(1) Reduce Placement)' : '(Used for LR(1) Closure)'}
              </h3>
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="text-[#785D68] border-b border-[#E4D4C3]">
                    <tr>
                      <th className="py-1.5 pr-2">Non-Terminal</th>
                      <th className="py-1.5 px-2">FIRST(X)</th>
                      <th className="py-1.5 pl-2">FOLLOW(X)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE3D7]">
                    {result.grammar.nonTerminals.map((nt) => (
                      <tr key={nt}>
                        <td className="py-1.5 pr-2 text-[#7E2F5C] font-bold">{nt}</td>
                        <td className="py-1.5 px-2 text-[#2B1B22]">
                          {`{ ${(result.firstSets[nt] || []).join(', ')} }`}
                        </td>
                        <td className="py-1.5 pl-2 text-[#B42A60]">
                          {`{ ${(result.followSets[nt] || []).join(', ')} }`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Canonical Collection of LR Item Sets */}
      {result.states.length > 0 && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
              Canonical Collection of {showLookaheads ? 'LR(1)' : 'LR(0)'} Item Sets (Closure &amp; GOTO)
            </h3>
            <span className="text-xs text-[#785D68]">
              Highlighted card tracks the active DFA state during execution
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {result.states.map((st) => {
              const isHot = st.id === activeState;
              const isMerged = Boolean(st.mergedFrom && st.mergedFrom.length > 1);
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStateId(st.id)}
                  className={`rounded-lg border p-3 text-xs space-y-2 transition-colors cursor-pointer ${
                    isHot
                      ? 'bg-[#FCEAF1] border-[#D63D76]'
                      : isMerged
                      ? 'bg-[#F8EEF4] border-[#D7B2C9]'
                      : 'bg-[#FAF4EC] border-[#E4D4C3]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[#E8DACB] pb-1.5">
                    <span className="font-mono font-bold text-[#2B1B22]">
                      State {st.label}
                      {isMerged ? ` (Merged: ${st.mergedFrom!.map((x) => `I${x}`).join('+')})` : ''}
                    </span>
                    <span className="font-mono text-[11px] text-[#785D68]">
                      {st.items.length} item{st.items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#2B1B22] space-y-0.5 leading-relaxed">
                    {st.items.map((it, idx) => (
                      <div key={idx} className={it.dot === it.rhs.length ? 'text-[#7E2F5C] font-semibold' : ''}>
                        {formatLRItem(it, showLookaheads)}
                      </div>
                    ))}
                  </div>
                  {Object.keys(st.transitions).length > 0 && (
                    <div className="pt-1.5 border-t border-[#E8DACB] flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-[#6E535E]">
                      {Object.entries(st.transitions).map(([sym, tgt]) => (
                        <span key={sym}>
                          GOTO({sym})→<span className="text-[#B42A60] font-semibold">{result.states[tgt]?.label}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ACTION & GOTO Parsing Table */}
      {result.states.length > 0 && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
              {meta.shortName} ACTION &amp; GOTO Parsing Table
            </h3>
            <span className="text-xs font-mono text-[#785D68]">
              sN = Shift to state N · rK = Reduce by production (K) · acc = Accept
            </span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-center border-collapse text-xs font-mono">
              <thead className="sticky top-0 bg-[#F6ECE1] z-10">
                <tr className="border-b border-[#E4D4C3] text-[#6E535E]">
                  <th rowSpan={2} className="py-2 px-3 text-left border-r border-[#E4D4C3]">
                    State
                  </th>
                  <th colSpan={termCols.length} className="py-1.5 px-2 text-[#B42A60] border-r border-[#E4D4C3]">
                    ACTION (Terminals)
                  </th>
                  <th colSpan={gotoCols.length} className="py-1.5 px-2 text-[#7E2F5C]">
                    GOTO (Non-Terminals)
                  </th>
                </tr>
                <tr className="border-b border-[#E4D4C3] text-[#4C3640]">
                  {termCols.map((t) => (
                    <th
                      key={t}
                      className={`py-1.5 px-2.5 border-r border-[#E8DACB] ${
                        t === activeLookahead ? 'bg-[#FCEAF1] text-[#9D2454] font-bold' : ''
                      }`}
                    >
                      {t}
                    </th>
                  ))}
                  {gotoCols.map((nt) => (
                    <th key={nt} className="py-1.5 px-2.5 border-r border-[#E8DACB] text-[#7E2F5C]">
                      {nt}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D7]">
                {result.states.map((st) => {
                  const rowActive = st.id === activeState;
                  return (
                    <tr key={st.id} className={rowActive ? 'bg-[#FCEAF1]/60' : ''}>
                      <td className="py-2 px-3 text-left font-bold text-[#2B1B22] bg-[#FAF4EC] border-r border-[#E4D4C3]">
                        {st.label}
                      </td>
                      {termCols.map((t) => {
                        const cell = result.actionTable[st.id]?.[t];
                        const isCellHot = rowActive && t === activeLookahead;
                        return (
                          <td
                            key={t}
                            className={`py-2 px-2.5 border-r border-[#EFE3D7] ${
                              cell?.hasConflict
                                ? 'bg-[#FDECEF] text-[#B51D3D] font-bold'
                                : isCellHot
                                ? 'bg-[#FCEAF1] text-[#2B1B22] font-bold ring-1 ring-inset ring-[#C93B72]'
                                : 'text-[#4C3640]'
                            }`}
                          >
                            {cell && cell.actions.length > 0
                              ? cell.actions.map((a) => a.label).join(' / ')
                              : '·'}
                          </td>
                        );
                      })}
                      {gotoCols.map((nt) => {
                        const target = result.gotoTable[st.id]?.[nt];
                        return (
                          <td
                            key={nt}
                            className="py-2 px-2.5 border-r border-[#EFE3D7] text-[#7E2F5C] font-semibold"
                          >
                            {target !== undefined ? target : '·'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* LR Shift-Reduce Execution Trace */}
      {result.steps.length > 0 && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
          <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
            {meta.shortName} Step-by-Step Stack Execution Trace
          </h3>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#FFFDF9] text-[#785D68] border-b border-[#E4D4C3]">
                <tr>
                  <th className="py-2 pr-3 font-medium">Step</th>
                  <th className="py-2 px-3 font-medium">State &amp; Symbol Stack</th>
                  <th className="py-2 px-3 font-medium">Remaining Input</th>
                  <th className="py-2 px-3 font-medium">Action / GOTO</th>
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
                        active ? 'bg-[#F3E5EE] text-[#2B1B22] font-semibold' : 'text-[#4C3640] hover:bg-[#FAF4EC]'
                      }`}
                    >
                      <td className="py-2 pr-3 tabular-nums text-[#785D68]">{s.stepNumber}</td>
                      <td className="py-2 px-3 text-[#7E2F5C]">{s.stack.join(' ')}</td>
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
