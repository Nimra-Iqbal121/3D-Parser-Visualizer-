import React, { useState } from 'react';
import {
  ArrowRight,
  Compass,
  BookOpen,
  PlayCircle,
  ShieldAlert,
  Scale,
  Play,
} from 'lucide-react';
import { DemoExample, PageId, ParserId } from '../engine/types';
import { PARSER_METADATA } from '../engine/comparisonData';
import { DEMO_EXAMPLES } from '../engine/demos';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
  onLaunchDemo: (demo: DemoExample) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onLaunchDemo,
}) => {
  const [quickParser, setQuickParser] = useState<ParserId>('ll1');
  const [quickGrammar, setQuickGrammar] = useState(
    "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id"
  );
  const [quickInput, setQuickInput] = useState('id + id * id');

  const handleQuickLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    onLaunchDemo({
      id: 'custom-launch',
      parser: quickParser,
      title: 'Custom Grammar',
      category: 'Simple Grammar',
      description: 'User custom grammar submitted from Dashboard',
      grammar: quickGrammar,
      input: quickInput,
      expectedOutcome: 'accepted',
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#B42A60]">Main Workspace Hub</div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
            Parser Visualizer 3D Dashboard
          </h1>
          <p className="text-sm text-[#6E535E] max-w-2xl">
            Jump directly into the 3D Parser Hierarchy, any Top-Down or Bottom-Up parsing workbench,
            curated demonstrations, error diagnostics, or theory reference.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('hierarchy')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
        >
          <Compass className="w-4 h-4" />
          Open 3D Parser Hierarchy
        </button>
      </header>

      {/* Primary Access Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(
          [
            {
              page: 'hierarchy' as PageId,
              title: '3D Hierarchy Explorer',
              desc: 'Rotate, zoom, and inspect all 11 nodes of the complete parser taxonomy.',
              icon: Compass,
              accent: 'text-[#C93B72]',
            },
            {
              page: 'demos' as PageId,
              title: 'Demo Examples',
              desc: `${DEMO_EXAMPLES.length} executable grammars including arithmetic, parentheses, and conflicts.`,
              icon: PlayCircle,
              accent: 'text-[#7E2F5C]',
            },
            {
              page: 'errors' as PageId,
              title: 'Error & Correction Lab',
              desc: 'Test custom grammars across all 4 hands-on parsers and apply guided fixes.',
              icon: ShieldAlert,
              accent: 'text-[#9C5B12]',
            },
            {
              page: 'theory' as PageId,
              title: 'Learning & Theory',
              desc: 'Concise compiler concepts: FIRST/FOLLOW, Closure/GOTO, Shift/Reduce.',
              icon: BookOpen,
              accent: 'text-[#A53B6B]',
            },
          ]
        ).map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.page}
              type="button"
              onClick={() => onNavigate(card.page)}
              className="text-left rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] hover:border-[#D99BB3] p-5 transition-colors cursor-pointer flex flex-col justify-between gap-3 group shadow-xs"
            >
              <div className="space-y-2">
                <Icon className={`w-5 h-5 ${card.accent}`} />
                <h2 className="font-display font-semibold text-base text-[#2B1B22] group-hover:text-[#B42A60]">
                  {card.title}
                </h2>
                <p className="text-xs text-[#6E535E] leading-relaxed">{card.desc}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B42A60]">
                Open Module <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Two-Column Parser Directory: Top-Down vs Bottom-Up */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EFE3D7] pb-3">
            <div>
              <div className="text-xs font-mono font-semibold text-[#B42A60]">Category A</div>
              <h2 className="font-display font-semibold text-lg text-[#2B1B22]">Top-Down Parsers</h2>
            </div>
            <span className="text-xs text-[#785D68]">2 Modules</span>
          </div>

          <div className="space-y-3">
            {(['rd', 'll1'] as ParserId[]).map((pid) => {
              const m = PARSER_METADATA[pid];
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => onNavigate(m.pageId)}
                  className="w-full text-left rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] hover:border-[#D99BB3] hover:bg-[#FCEAF1]/60 p-4 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-semibold text-sm text-[#2B1B22] group-hover:text-[#B42A60]">
                      {m.name}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-[#9B7E8A] group-hover:text-[#C93B72]" />
                  </div>
                  <p className="text-xs text-[#6E535E] mt-1 leading-relaxed">{m.summary}</p>
                  <div className="text-[11px] font-mono text-[#8A6D79] mt-2">
                    {m.derivation} · {m.timeComplexity}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-7 rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EFE3D7] pb-3">
            <div>
              <div className="text-xs font-mono font-semibold text-[#7E2F5C]">Category B</div>
              <h2 className="font-display font-semibold text-lg text-[#2B1B22]">Bottom-Up Parsers</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('lr-overview')}
              className="text-xs font-semibold text-[#7E2F5C] hover:text-[#B42A60] cursor-pointer"
            >
              LR Overview →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['opp', 'lr0', 'slr1', 'lalr1', 'clr1'] as ParserId[]).map((pid) => {
              const m = PARSER_METADATA[pid];
              const isTheoryOnly = pid === 'slr1' || pid === 'lalr1' || pid === 'clr1';
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => onNavigate(m.pageId)}
                  className="text-left rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] hover:border-[#C99EB9] hover:bg-[#F3E5EE]/65 p-3.5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-semibold text-sm text-[#2B1B22] group-hover:text-[#7E2F5C]">
                      {m.name}
                    </h3>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9B7E8A] group-hover:text-[#7E2F5C]" />
                  </div>
                  <p className="text-xs text-[#6E535E] mt-1 leading-relaxed line-clamp-2">
                    {m.summary}
                  </p>
                  <div className="text-[11px] font-mono text-[#8A6D79] mt-1.5">
                    {isTheoryOnly ? 'Theory & Comparison Reference' : 'Hands-On Workbench'}
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onNavigate('comparison')}
              className="text-left rounded-lg bg-[#FCEAF1]/75 border border-[#E8B4C9] hover:border-[#C93B72] p-3.5 transition-colors cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-semibold text-sm text-[#8F1F4C]">
                  Compare Techniques
                </h3>
                <Scale className="w-4 h-4 text-[#C93B72]" />
              </div>
              <p className="text-xs text-[#5A404B] mt-1 leading-relaxed">
                Side-by-side matrix comparing Top-Down vs Bottom-Up and all LR tiers.
              </p>
            </button>
          </div>
        </section>
      </div>

      {/* Custom Grammar Quick Launcher */}
      <form
        onSubmit={handleQuickLaunch}
        className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-4 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-semibold text-base text-[#2B1B22]">
              Custom Grammar Quick Launcher
            </h2>
            <p className="text-xs text-[#6E535E]">
              Submit your own grammar and input expression directly into any parsing algorithm.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6">
            <label htmlFor="dash-grammar" className="block text-xs font-medium text-[#4C3640] mb-1.5">
              Grammar Productions
            </label>
            <textarea
              id="dash-grammar"
              rows={4}
              value={quickGrammar}
              onChange={(e) => setQuickGrammar(e.target.value)}
              spellCheck={false}
              className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3 py-2 font-mono text-xs text-[#2B1B22] focus:outline-none focus:border-[#C93B72]"
            />
          </div>

          <div className="lg:col-span-6 flex flex-col justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="dash-parser" className="block text-xs font-medium text-[#4C3640] mb-1.5">
                  Target Parsing Algorithm
                </label>
                <select
                  id="dash-parser"
                  value={quickParser}
                  onChange={(e) => setQuickParser(e.target.value as ParserId)}
                  className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3 py-2 text-xs text-[#2B1B22] focus:outline-none focus:border-[#C93B72]"
                >
                  <option value="rd">Recursive Descent (Top-Down)</option>
                  <option value="ll1">LL(1) Predictive (Top-Down)</option>
                  <option value="opp">Operator Precedence (Bottom-Up)</option>
                  <option value="lr0">LR(0) (Bottom-Up)</option>
                </select>
              </div>

              <div>
                <label htmlFor="dash-input" className="block text-xs font-medium text-[#4C3640] mb-1.5">
                  Input String
                </label>
                <input
                  id="dash-input"
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  spellCheck={false}
                  className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3 py-2 font-mono text-sm text-[#2B1B22] focus:outline-none focus:border-[#C93B72]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run in {PARSER_METADATA[quickParser].shortName} Workbench
              </button>
              <button
                type="button"
                onClick={() => onNavigate('errors')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-medium bg-[#F4E9DD] text-[#4C3640] hover:bg-[#EAD8C6] transition-colors cursor-pointer whitespace-nowrap"
              >
                Diagnose Across Parsers
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
