import React, { useEffect, useState } from 'react';
import { getDefaultDemoForParser } from '../../engine/demos';
import { PARSER_METADATA } from '../../engine/comparisonData';
import { runOPPParser } from '../../engine/opp';
import { DemoExample, OPPResult } from '../../engine/types';
import { ParserVisualizer } from '../../components/workbench/ParserVisualizer';
import { GrammarInputPanel } from '../../components/workbench/GrammarInputPanel';
import { DiagnosticPanel } from '../../components/workbench/DiagnosticPanel';
import { useStepPlayback } from '../../components/workbench/useStepPlayback';

interface OPPParserPageProps {
  externalDemo?: DemoExample | null;
  onClearExternalDemo?: () => void;
}

function loadSavedOPPDraft(fallbackGrammar: string, fallbackInput: string) {
  try {
    const raw = window.sessionStorage.getItem('pv3d_draft_opp');
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

export const OPPParserPage: React.FC<OPPParserPageProps> = ({
  externalDemo,
  onClearExternalDemo,
}) => {
  const defaultDemo = getDefaultDemoForParser('opp');
  const initial =
    externalDemo && externalDemo.parser === 'opp'
      ? {
          grammar: externalDemo.grammar,
          input: externalDemo.input,
          startSymbol: externalDemo.startSymbol ?? '',
        }
      : loadSavedOPPDraft(defaultDemo.grammar, defaultDemo.input);

  const [grammarText, setGrammarText] = useState(initial.grammar);
  const [inputText, setInputText] = useState(initial.input);
  const [startSymbol, setStartSymbol] = useState(initial.startSymbol);
  const [result, setResult] = useState<OPPResult>(() =>
    runOPPParser(initial.grammar, initial.input, initial.startSymbol || undefined)
  );

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        'pv3d_draft_opp',
        JSON.stringify({ grammar: grammarText, input: inputText, startSymbol })
      );
    } catch {
      // ignore
    }
  }, [grammarText, inputText, startSymbol]);

  useEffect(() => {
    if (externalDemo && externalDemo.parser === 'opp') {
      setGrammarText(externalDemo.grammar);
      setInputText(externalDemo.input);
      setStartSymbol(externalDemo.startSymbol ?? '');
      setResult(runOPPParser(externalDemo.grammar, externalDemo.input, externalDemo.startSymbol));
      onClearExternalDemo?.();
    }
  }, [externalDemo, onClearExternalDemo]);

  const execute = (g = grammarText, inp = inputText, s = startSymbol) => {
    setResult(runOPPParser(g, inp, s || undefined));
  };

  const handleLoadDemo = (demo: DemoExample) => {
    setGrammarText(demo.grammar);
    setInputText(demo.input);
    setStartSymbol(demo.startSymbol ?? '');
    execute(demo.grammar, demo.input, demo.startSymbol ?? '');
  };

  const playback = useStepPlayback(result.steps);
  const meta = PARSER_METADATA.opp;

  const ntSet = new Set(result.grammar?.nonTerminals ?? []);
  const activeStack = playback.currentStep?.stack ?? [];
  const topTerminal =
    [...activeStack].reverse().find((sym) => !ntSet.has(sym)) ?? '$';
  const activeLookahead = playback.currentStep?.currentToken ?? '$';

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <div className="text-xs font-semibold text-[#7E2F5C]">
          Bottom-Up Parsing · Terminal Precedence Shift-Reduce
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          {meta.name} (OPP)
        </h1>
        <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">
          {meta.summary} Computes FIRSTVT and LASTVT sets algorithmically, builds the terminal
          precedence matrix, and shifts or reduces handles step by step.
        </p>
      </header>

      <GrammarInputPanel
        parserId="opp"
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
        diagnostics={result.diagnostics.filter((d) => d.severity !== 'info')}
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
        parserLabel={`${meta.name} (OPP)`}
        steps={result.steps}
        currentStepIndex={playback.currentStepIndex}
        isPlaying={playback.isPlaying}
        speedMs={playback.speedMs}
        accepted={result.accepted}
        statusMessage={result.statusMessage}
        default3DMode="stack"
        oppTopTerminal={topTerminal}
        onStart={playback.handleStart}
        onTogglePlay={playback.handleTogglePlay}
        onPrev={playback.handlePrev}
        onNext={playback.handleNext}
        onReset={playback.handleReset}
        onJumpToStep={playback.handleJump}
        onSpeedChange={playback.setSpeedMs}
      />

      <DiagnosticPanel
        diagnostics={result.diagnostics.filter((d) => d.severity === 'info')}
        onApplyGrammarCorrection={(fixed) => {
          setGrammarText(fixed);
          execute(fixed, inputText, startSymbol);
        }}
        onApplyInputCorrection={(fixedInput) => {
          setInputText(fixedInput);
          execute(grammarText, fixedInput, startSymbol);
        }}
      />

      {/* Precedence Symbol Legend (<, =, >) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 shadow-xs">
          <div className="font-mono text-sm font-bold text-[#B42A60]">a &lt; b · Yields Precedence</div>
          <p className="text-xs text-[#4C3640] mt-1 leading-relaxed">
            Top stack terminal <code className="text-[#2B1B22] font-semibold">a</code> yields to lookahead{' '}
            <code className="text-[#2B1B22] font-semibold">b</code>. The parser <strong>Shifts</strong>{' '}
            <code className="text-[#2B1B22] font-semibold">b</code> onto the stack because{' '}
            <code className="text-[#2B1B22] font-semibold">b</code> binds tighter.
          </p>
        </div>
        <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 shadow-xs">
          <div className="font-mono text-sm font-bold text-[#166A4A]">a = b · Equal Precedence</div>
          <p className="text-xs text-[#4C3640] mt-1 leading-relaxed">
            Paired delimiters such as <code className="text-[#2B1B22] font-semibold">(</code> and{' '}
            <code className="text-[#2B1B22] font-semibold">)</code> belong to the same handle. The parser{' '}
            <strong>Shifts</strong> <code className="text-[#2B1B22] font-semibold">b</code> to complete the handle.
          </p>
        </div>
        <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 shadow-xs">
          <div className="font-mono text-sm font-bold text-[#7E2F5C]">a &gt; b · Takes Precedence</div>
          <p className="text-xs text-[#4C3640] mt-1 leading-relaxed">
            Top stack terminal <code className="text-[#2B1B22] font-semibold">a</code> takes precedence over{' '}
            <code className="text-[#2B1B22] font-semibold">b</code>. The parser locates the handle and{' '}
            <strong>Reduces</strong> it to its non-terminal.
          </p>
        </div>
      </div>

      {/* FIRSTVT / LASTVT Sets */}
      {result.grammar && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
          <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
            FIRSTVT &amp; LASTVT Sets
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="text-[#785D68] border-b border-[#E4D4C3]">
                <tr>
                  <th className="py-2 pr-3 font-medium">Non-Terminal</th>
                  <th className="py-2 px-3 font-medium">FIRSTVT(X)</th>
                  <th className="py-2 pl-3 font-medium">LASTVT(X)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D7] font-mono">
                {result.grammar.nonTerminals.map((nt) => (
                  <tr key={nt}>
                    <td className="py-2 pr-3 font-bold text-[#7E2F5C]">{nt}</td>
                    <td className="py-2 px-3 text-[#2B1B22]">
                      {`{ ${(result.firstVT[nt] || []).join(', ')} }`}
                    </td>
                    <td className="py-2 pl-3 text-[#B42A60]">
                      {`{ ${(result.lastVT[nt] || []).join(', ')} }`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Operator Precedence Matrix */}
      {result.tableSymbols.length > 0 && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
              Operator Precedence Relations Table
            </h3>
            <span className="text-xs text-[#785D68] font-mono">
              Comparing top stack terminal ({topTerminal}) vs lookahead ({activeLookahead})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#E4D4C3] text-[#6E535E]">
                  <th className="py-2 px-3 bg-[#F6ECE1] text-left">Stack \ Input</th>
                  {result.tableSymbols.map((sym) => (
                    <th
                      key={sym}
                      className={`py-2 px-3 border-l border-[#E8DACB] ${
                        sym === activeLookahead
                          ? 'text-[#9D2454] bg-[#FCEAF1] font-bold'
                          : 'bg-[#F6ECE1]'
                      }`}
                    >
                      {sym}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D7]">
                {result.tableSymbols.map((rowSym) => (
                  <tr key={rowSym}>
                    <td
                      className={`py-2 px-3 text-left font-bold ${
                        rowSym === topTerminal
                          ? 'text-[#732A53] bg-[#F3E5EE]'
                          : 'text-[#4C3640] bg-[#FAF4EC]'
                      }`}
                    >
                      {rowSym}
                    </td>
                    {result.tableSymbols.map((colSym) => {
                      const rel = result.precedenceTable[rowSym]?.[colSym] ?? '';
                      const isHot = rowSym === topTerminal && colSym === activeLookahead;
                      return (
                        <td
                          key={colSym}
                          className={`py-2 px-3 border-l border-[#EFE3D7] font-bold ${
                            rel === 'conflict'
                              ? 'bg-[#FDECEF] text-[#B51D3D]'
                              : isHot
                              ? 'bg-[#FCEAF1] text-[#2B1B22] ring-1 ring-inset ring-[#C93B72]'
                              : rel === '<'
                              ? 'text-[#B42A60]'
                              : rel === '>'
                              ? 'text-[#7E2F5C]'
                              : rel === '='
                              ? 'text-[#166A4A]'
                              : 'text-[#C4B0A2]'
                          }`}
                        >
                          {rel === 'conflict' ? 'ERR' : rel || '·'}
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

      {/* Shift / Reduce Execution Trace */}
      {result.steps.length > 0 && (
        <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
          <h3 className="font-display font-semibold text-sm text-[#2B1B22]">
            OPP Shift / Reduce Trace
          </h3>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#FFFDF9] text-[#785D68] border-b border-[#E4D4C3]">
                <tr>
                  <th className="py-2 pr-3 font-medium">Step</th>
                  <th className="py-2 px-3 font-medium">Stack</th>
                  <th className="py-2 px-3 font-medium">Rel</th>
                  <th className="py-2 px-3 font-medium">Remaining Input</th>
                  <th className="py-2 px-3 font-medium">Operation</th>
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
                      <td className="py-2 px-3 text-[#B42A60] font-bold">
                        {s.precedenceRelation && s.precedenceRelation !== 'none'
                          ? s.precedenceRelation
                          : '—'}
                      </td>
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
