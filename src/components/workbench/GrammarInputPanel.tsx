import React, { useState } from 'react';
import { Play, RotateCcw, BookOpen, HelpCircle } from 'lucide-react';
import { DEMO_EXAMPLES } from '../../engine/demos';
import { DemoExample, ParserId } from '../../engine/types';

interface GrammarInputPanelProps {
  parserId: ParserId;
  grammarText: string;
  inputText: string;
  startSymbol: string;
  onGrammarChange: (val: string) => void;
  onInputChange: (val: string) => void;
  onStartSymbolChange: (val: string) => void;
  onRun: () => void;
  onLoadDemo: (demo: DemoExample) => void;
  restrictionsNote: string;
  compact?: boolean;
}

export const GrammarInputPanel: React.FC<GrammarInputPanelProps> = ({
  parserId,
  grammarText,
  inputText,
  startSymbol,
  onGrammarChange,
  onInputChange,
  onStartSymbolChange,
  onRun,
  onLoadDemo,
  restrictionsNote,
  compact = false,
}) => {
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const parserDemos = DEMO_EXAMPLES.filter((d) => d.parser === parserId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRun();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-3.5 space-y-2.5 flex flex-col justify-between h-full shadow-xs"
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-semibold text-sm text-[#2B1B22]">
              Grammar &amp; Input
            </h2>
            <p className="text-[11px] text-[#785D68] mt-0.5 leading-snug">{restrictionsNote}</p>
          </div>

          <button
            type="button"
            onClick={() => setShowFormatHelp((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6B4E5A] hover:text-[#B42A60] transition-colors cursor-pointer whitespace-nowrap"
            aria-expanded={showFormatHelp}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showFormatHelp ? 'Hide Guide' : 'Syntax Guide'}
          </button>
        </div>

        {showFormatHelp && (
          <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-3 text-[11px] text-[#4C3640] space-y-1 leading-relaxed">
            <p className="font-semibold text-[#2B1B22]">Grammar &amp; Input Format</p>
            <p>
              One rule per line using <code className="text-[#B42A60] font-semibold">-&gt;</code>,{' '}
              <code className="text-[#B42A60] font-semibold">→</code>, or{' '}
              <code className="text-[#B42A60] font-semibold">::=</code>, alternatives with{' '}
              <code className="text-[#B42A60] font-semibold">|</code>, and{' '}
              <code className="text-[#B42A60] font-semibold">ε</code> /{' '}
              <code className="text-[#B42A60] font-semibold">eps</code> for epsilon. Both spaced (
              <code className="text-[#B42A60] font-semibold">S -&gt; A A</code>) and compact textbook notation (
              <code className="text-[#B42A60] font-semibold">S -&gt; AA</code>,{' '}
              <code className="text-[#B42A60] font-semibold">E -&gt; E+T | T</code>,{' '}
              <code className="text-[#B42A60] font-semibold">F -&gt; (E) | id</code>) as well as unspaced inputs (
              <code className="text-[#B42A60] font-semibold">abab</code>,{' '}
              <code className="text-[#B42A60] font-semibold">id+id*id</code>) are supported.
            </p>
          </div>
        )}

        {/* Predefined demos quick loader */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#785D68] mr-0.5">
            <BookOpen className="w-3 h-3 text-[#C93B72]" />
            Demos:
          </span>
          {parserDemos.map((demo) => (
            <button
              key={demo.id}
              type="button"
              onClick={() => onLoadDemo(demo)}
              className="px-2 py-1 rounded text-[11px] font-medium bg-[#F8F0E6] text-[#4C3640] border border-[#E3D1C0] hover:border-[#D99BB3] hover:bg-[#FCEAF1] hover:text-[#8F1F4C] transition-colors cursor-pointer whitespace-nowrap"
            >
              {demo.title}
            </button>
          ))}
        </div>

        <div className={compact ? 'space-y-3' : 'grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-end'}>
          <div className={compact ? '' : 'lg:col-span-6'}>
            <label
              htmlFor={`grammar-input-${parserId}`}
              className="block text-xs font-medium text-[#4C3640] mb-1"
            >
              Grammar Productions
            </label>
            <textarea
              id={`grammar-input-${parserId}`}
              value={grammarText}
              onChange={(e) => onGrammarChange(e.target.value)}
              rows={compact ? 5 : 3}
              spellCheck={false}
              className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3 py-2 font-mono text-sm text-[#2B1B22] placeholder-[#9B818B] focus:outline-none focus:border-[#C93B72] focus:ring-1 focus:ring-[#C93B72]/35"
              placeholder="E -> T E'&#10;E' -> + T E' | ε"
            />
          </div>

          <div className={compact ? 'grid grid-cols-1 sm:grid-cols-12 gap-2.5' : 'lg:col-span-6 space-y-2.5'}>
            <div className={compact ? 'sm:col-span-8' : 'grid grid-cols-1 sm:grid-cols-12 gap-2.5'}>
              <div className={compact ? '' : 'sm:col-span-8'}>
                <label
                  htmlFor={`expr-input-${parserId}`}
                  className="block text-xs font-medium text-[#4C3640] mb-1"
                >
                  Input Expression
                </label>
                <input
                  id={`expr-input-${parserId}`}
                  type="text"
                  value={inputText}
                  onChange={(e) => onInputChange(e.target.value)}
                  spellCheck={false}
                  className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3 py-2 font-mono text-sm text-[#2B1B22] placeholder-[#9B818B] focus:outline-none focus:border-[#C93B72] focus:ring-1 focus:ring-[#C93B72]/35"
                  placeholder="id + id * id"
                />
              </div>

              {!compact && (
                <div className="sm:col-span-4">
                  <label
                    htmlFor={`start-input-${parserId}`}
                    className="block text-xs font-medium text-[#4C3640] mb-1"
                  >
                    Start Symbol
                  </label>
                  <input
                    id={`start-input-${parserId}`}
                    type="text"
                    value={startSymbol}
                    onChange={(e) => onStartSymbolChange(e.target.value)}
                    spellCheck={false}
                    className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3 py-2 font-mono text-sm text-[#2B1B22] placeholder-[#9B818B] focus:outline-none focus:border-[#C93B72] focus:ring-1 focus:ring-[#C93B72]/35"
                    placeholder="Auto"
                  />
                </div>
              )}
            </div>

            {compact && (
              <div className="sm:col-span-4">
                <label
                  htmlFor={`start-input-${parserId}`}
                  className="block text-xs font-medium text-[#4C3640] mb-1"
                >
                  Start Symbol
                </label>
                <input
                  id={`start-input-${parserId}`}
                  type="text"
                  value={startSymbol}
                  onChange={(e) => onStartSymbolChange(e.target.value)}
                  spellCheck={false}
                  className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3 py-2 font-mono text-sm text-[#2B1B22] placeholder-[#9B818B] focus:outline-none focus:border-[#C93B72] focus:ring-1 focus:ring-[#C93B72]/35"
                  placeholder="Auto"
                />
              </div>
            )}

            {!compact && (
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Parse &amp; Visualize
                </button>
                <button
                  type="button"
                  onClick={() => onLoadDemo(parserDemos[0])}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#F3E7DB] text-[#4C3640] hover:bg-[#E9D7C6] transition-colors cursor-pointer whitespace-nowrap"
                  aria-label="Reset to default demo grammar and input"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Default
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {compact && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Parse &amp; Visualize
          </button>
          <button
            type="button"
            onClick={() => onLoadDemo(parserDemos[0])}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#F3E7DB] text-[#4C3640] hover:bg-[#E9D7C6] transition-colors cursor-pointer whitespace-nowrap"
            aria-label="Reset to default demo grammar and input"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Default
          </button>
        </div>
      )}
    </form>
  );
};
