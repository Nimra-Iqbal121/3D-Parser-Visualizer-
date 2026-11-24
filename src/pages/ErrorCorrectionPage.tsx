import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { analyzeGrammarAndInput, DiagnosticAnalysisReport } from '../engine/diagnostics';
import { DiagnosticPanel } from '../components/workbench/DiagnosticPanel';
import { DemoExample, ParserId } from '../engine/types';

interface ErrorCorrectionPageProps {
  onLaunchDemo: (demo: DemoExample) => void;
}

const ERROR_SCENARIOS: Array<{
  id: string;
  label: string;
  parser: ParserId;
  grammar: string;
  input: string;
}> = [
  {
    id: 'err-left-rec',
    label: 'Immediate Left Recursion (LL(1))',
    parser: 'll1',
    grammar: 'E -> E + T | T\nT -> id',
    input: 'id + id',
  },
  {
    id: 'err-left-fact',
    label: 'Left Factoring Conflict (LL(1))',
    parser: 'll1',
    grammar: 'S -> if E then S else S | if E then S | id\nE -> id',
    input: 'if id then id',
  },
  {
    id: 'err-undef-nt',
    label: 'Undefined Non-Terminal',
    parser: 'll1',
    grammar: 'E -> T + X\nT -> id',
    input: 'id + id',
  },
  {
    id: 'err-syntax',
    label: 'Invalid Grammar Syntax (Missing Arrow)',
    parser: 'll1',
    grammar: 'E T + E\nT -> id',
    input: 'id + id',
  },
  {
    id: 'err-parens',
    label: 'Unmatched Parentheses & Invalid Token',
    parser: 'll1',
    grammar: "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id",
    input: '( id + unknown_tok',
  },
  {
    id: 'err-opp',
    label: 'Unsupported in OPP (Adjacent Non-Terminals)',
    parser: 'opp',
    grammar: 'E -> E A E | id\nA -> + | *',
    input: 'id + id',
  },
  {
    id: 'err-lr0-sr',
    label: 'Shift-Reduce Conflict (LR(0))',
    parser: 'lr0',
    grammar: 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id',
    input: 'id + id * id',
  },
];

const ACTIVE_HANDS_ON_PARSERS: ReadonlySet<ParserId> = new Set(['rd', 'll1', 'opp', 'lr0']);

export const ErrorCorrectionPage: React.FC<ErrorCorrectionPageProps> = ({ onLaunchDemo }) => {
  const initial = ERROR_SCENARIOS[0];
  const [selectedParser, setSelectedParser] = useState<ParserId>(initial.parser);
  const [grammarText, setGrammarText] = useState(initial.grammar);
  const [inputText, setInputText] = useState(initial.input);
  const [report, setReport] = useState<DiagnosticAnalysisReport>(() =>
    analyzeGrammarAndInput(initial.parser, initial.grammar, initial.input)
  );

  const runAnalysis = (p = selectedParser, g = grammarText, inp = inputText) => {
    setReport(analyzeGrammarAndInput(p, g, inp));
  };

  const loadScenario = (sc: (typeof ERROR_SCENARIOS)[number]) => {
    setSelectedParser(sc.parser);
    setGrammarText(sc.grammar);
    setInputText(sc.input);
    runAnalysis(sc.parser, sc.grammar, sc.input);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <div className="text-xs font-semibold text-[#9C5B12]">
          Intelligent Grammar &amp; Syntax Diagnostics
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          Error Detection &amp; Correction Assistant
        </h1>
        <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">
          Distinguishes between invalid grammar syntax, algorithm restrictions, parsing table
          conflicts (FIRST/FOLLOW, Shift/Reduce, Reduce/Reduce), and runtime input errors—with
          previewable corrections applied only after your confirmation.
        </p>
      </header>

      {/* Scenario Presets */}
      <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-2.5 shadow-xs">
        <div className="text-xs font-medium text-[#785D68]">Load Common Compiler Error Scenarios:</div>
        <div className="flex flex-wrap gap-2">
          {ERROR_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => loadScenario(sc)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#FAF4EC] text-[#4C3640] border border-[#E4D4C3] hover:border-[#D99BB3] hover:bg-[#FCEAF1] hover:text-[#8F1F4C] transition-colors cursor-pointer whitespace-nowrap"
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostic Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runAnalysis();
        }}
        className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-4 shadow-xs"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <label htmlFor="err-grammar" className="block text-xs font-medium text-[#4C3640] mb-1.5">
              Grammar Productions
            </label>
            <textarea
              id="err-grammar"
              rows={5}
              value={grammarText}
              onChange={(e) => setGrammarText(e.target.value)}
              spellCheck={false}
              className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3.5 py-2.5 font-mono text-sm text-[#2B1B22] focus:outline-none focus:border-[#C93B72]"
            />
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between gap-3">
            <div className="space-y-3">
              <div>
                <label htmlFor="err-parser" className="block text-xs font-medium text-[#4C3640] mb-1.5">
                  Target Parsing Technique
                </label>
                <select
                  id="err-parser"
                  value={selectedParser}
                  onChange={(e) => {
                    const next = e.target.value as ParserId;
                    setSelectedParser(next);
                    runAnalysis(next, grammarText, inputText);
                  }}
                  className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3 py-2 text-sm text-[#2B1B22] focus:outline-none focus:border-[#C93B72]"
                >
                  <option value="rd">Recursive Descent</option>
                  <option value="ll1">LL(1) Predictive Parser</option>
                  <option value="opp">Operator Precedence Parser (OPP)</option>
                  <option value="lr0">LR(0) Parser</option>
                </select>
              </div>

              <div>
                <label htmlFor="err-input" className="block text-xs font-medium text-[#4C3640] mb-1.5">
                  Input String
                </label>
                <input
                  id="err-input"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  spellCheck={false}
                  className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3.5 py-2 font-mono text-sm text-[#2B1B22] focus:outline-none focus:border-[#C93B72]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Analyze Grammar &amp; Input
              </button>
              <button
                type="button"
                onClick={() =>
                  onLaunchDemo({
                    id: 'from-error-lab',
                    parser: selectedParser,
                    title: 'From Error Lab',
                    category: 'Simple Grammar',
                    description: 'Loaded from Error Detection Assistant',
                    grammar: grammarText,
                    input: inputText,
                    expectedOutcome: report.accepted ? 'accepted' : 'rejected',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium bg-[#F4E9DD] text-[#4C3640] hover:bg-[#EAD8C6] transition-colors cursor-pointer whitespace-nowrap"
              >
                Open in 3D
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Primary Status Banner */}
      {report.diagnostics.filter((d) => d.severity === 'error').length === 0 && report.accepted ? (
        <div className="rounded-xl border border-[#A7DCC5] bg-[#E9F6F0] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#166A4A] shrink-0" />
            <div>
              <h2 className="font-display font-semibold text-sm text-[#12543B]">
                No Errors Detected — Input Accepted
              </h2>
              <p className="text-xs text-[#2B5A47] mt-0.5">{report.statusMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onLaunchDemo({
                id: 'verified-from-lab',
                parser: selectedParser,
                title: 'Verified Grammar',
                category: 'Simple Grammar',
                description: 'Verified in Error Lab',
                grammar: grammarText,
                input: inputText,
                expectedOutcome: 'accepted',
              })
            }
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#166A4A] text-white hover:bg-[#11543A] cursor-pointer whitespace-nowrap"
          >
            Visualize Execution →
          </button>
        </div>
      ) : null}

      {/* Detailed Diagnostics & Previewable Corrections */}
      <DiagnosticPanel
        diagnostics={report.diagnostics}
        onApplyGrammarCorrection={(fixed) => {
          setGrammarText(fixed);
          runAnalysis(selectedParser, fixed, inputText);
        }}
        onApplyInputCorrection={(fixedInput) => {
          setInputText(fixedInput);
          runAnalysis(selectedParser, grammarText, fixedInput);
        }}
      />

      {/* Cross-Parser Compatibility Matrix */}
      <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-3 shadow-xs">
        <div>
          <h2 className="font-display font-semibold text-base text-[#2B1B22]">
            Cross-Algorithm Compatibility Matrix
          </h2>
          <p className="text-xs text-[#6E535E] mt-0.5">
            Shows whether an issue is a syntax error in the grammar itself or strictly an algorithm
            restriction (for example, left recursion fails LL(1) while succeeding in SLR(1)).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="text-[#785D68] border-b border-[#E4D4C3]">
              <tr>
                <th className="py-2 pr-3 font-medium">Parser Algorithm</th>
                <th className="py-2 px-3 font-medium">Status</th>
                <th className="py-2 px-3 font-medium">Errors</th>
                <th className="py-2 px-3 font-medium">Table Conflicts</th>
                <th className="py-2 pl-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D7]">
              {report.compatibilityMatrix
                .filter((row) => ACTIVE_HANDS_ON_PARSERS.has(row.parserId))
                .map((row) => (
                <tr
                  key={row.parserId}
                  className={row.parserId === selectedParser ? 'bg-[#FCEAF1]/70' : ''}
                >
                  <td className="py-2.5 pr-3 font-semibold text-[#2B1B22]">{row.label}</td>
                  <td className="py-2.5 px-3">
                    {row.accepted ? (
                      <span className="inline-flex items-center gap-1.5 text-[#166A4A] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accepted
                      </span>
                    ) : row.status === 'Conflict' ? (
                      <span className="inline-flex items-center gap-1.5 text-[#9C5B12] font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Conflict
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[#B51D3D] font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        {row.status}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-[#4C3640]">
                    {row.errorCount}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-[#4C3640]">
                    {row.conflictCount}
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedParser(row.parserId);
                        runAnalysis(row.parserId, grammarText, inputText);
                      }}
                      className="text-xs font-semibold text-[#B42A60] hover:text-[#8F1F4C] cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
