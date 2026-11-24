import React from 'react';
import { ArrowRight, BookOpen, Scale } from 'lucide-react';
import { PARSER_METADATA } from '../engine/comparisonData';
import { PageId } from '../engine/types';

interface LROverviewPageProps {
  onNavigate: (page: PageId) => void;
}

const LR_COMPARISON_ROWS = [
  {
    variant: 'lr0' as const,
    lookahead: 'None (0 tokens)',
    stateSize: 'Smallest (LR(0) cores)',
    reduceRule: 'Reduces on all terminals in completed-item states',
    modeLabel: 'Hands-On Workbench',
  },
  {
    variant: 'slr1' as const,
    lookahead: 'Global FOLLOW(A)',
    stateSize: 'Same as LR(0)',
    reduceRule: 'Reduces A → α only on terminals in FOLLOW(A)',
    modeLabel: 'Theory & Comparison',
  },
  {
    variant: 'lalr1' as const,
    lookahead: 'Merged LR(1) lookaheads',
    stateSize: 'Same as LR(0) / SLR(1)',
    reduceRule: 'Merges CLR(1) states sharing identical LR(0) cores',
    modeLabel: 'Theory & Comparison',
  },
  {
    variant: 'clr1' as const,
    lookahead: 'Exact per-item LR(1)',
    stateSize: 'Largest (can split cores)',
    reduceRule: 'Reduces [A → α ·, a] strictly on exact lookahead a',
    modeLabel: 'Theory & Comparison',
  },
];

export const LROverviewPage: React.FC<LROverviewPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <div className="text-xs font-semibold text-[#7E2F5C]">
          Module 5 · Bottom-Up Shift-Reduce Automaton Family
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          LR Parser Family Overview
        </h1>
        <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">
          LR(k) parsers scan input Left-to-right, construct a Rightmost derivation in reverse, and
          use k tokens of lookahead. All four tiers share the same shift-reduce stack architecture
          while differing in item construction and lookahead precision:{' '}
          <span className="font-mono font-semibold text-[#7E2F5C]">
            LR(0) ⊂ SLR(1) ⊂ LALR(1) ⊂ CLR(1)
          </span>
          . Explore hands-on execution in <strong>LR(0)</strong> and conceptual theory &amp;
          comparison across <strong>SLR(1)</strong>, <strong>LALR(1)</strong>, and{' '}
          <strong>CLR(1)</strong>.
        </p>
      </header>

      {/* Four Submodule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['lr0', 'slr1', 'lalr1', 'clr1'] as const).map((v, idx) => {
          const m = PARSER_METADATA[v];
          const isHandsOn = v === 'lr0';
          return (
            <div
              key={v}
              className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 flex flex-col justify-between gap-4 shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#785D68]">
                  <span className="font-mono font-semibold text-[#7E2F5C]">
                    Tier 0{idx + 1} · {m.shortName}
                  </span>
                  <span className={isHandsOn ? 'font-semibold text-[#B42A60]' : 'text-[#785D68]'}>
                    {isHandsOn ? 'Interactive Workbench' : 'Theory & Comparison'}
                  </span>
                </div>
                <h2 className="font-display font-semibold text-lg text-[#2B1B22]">{m.name}</h2>
                <p className="text-xs text-[#4C3640] leading-relaxed">{m.summary}</p>
                <div className="text-xs text-[#6E535E] pt-1">
                  <strong className="text-[#2B1B22]">Data Structures:</strong> {m.dataStructures}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate(m.pageId)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isHandsOn
                    ? 'bg-[#C93B72] text-white hover:bg-[#AD2B5D] shadow-xs'
                    : 'bg-[#F3E5EE] border border-[#D7B2C9] text-[#732A53] hover:bg-[#EAD4E2]'
                }`}
              >
                {isHandsOn ? `Open ${m.shortName} Workbench` : `Read ${m.shortName} Theory`}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Conceptual Comparison Matrix */}
      <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-base text-[#2B1B22]">
              LR Family Theoretical Comparison
            </h2>
            <p className="text-xs text-[#6E535E] mt-0.5">
              Compare how LR(0), SLR(1), LALR(1), and CLR(1) balance table size against lookahead
              conflict resolution.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('comparison')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FCEAF1] border border-[#E8B4C9] text-[#8F1F4C] hover:bg-[#F7DCE7] transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              Full Side-by-Side Comparison
            </button>
            <button
              type="button"
              onClick={() => onNavigate('theory')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FAF4EC] border border-[#E4D4C3] text-[#4C3640] hover:border-[#D99BB3] transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#B42A60]" />
              Study Theory Guide
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="text-[#785D68] border-b border-[#E4D4C3]">
              <tr>
                <th className="py-2 pr-3 font-medium">Tier</th>
                <th className="py-2 px-3 font-medium">Lookahead Mechanism</th>
                <th className="py-2 px-3 font-medium">Automaton Size</th>
                <th className="py-2 px-3 font-medium">Reduction Placement Rule</th>
                <th className="py-2 pl-3 font-medium text-right">Module</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D7]">
              {LR_COMPARISON_ROWS.map((row) => {
                const meta = PARSER_METADATA[row.variant];
                return (
                  <tr key={row.variant}>
                    <td className="py-3 pr-3 font-mono font-bold text-[#2B1B22]">
                      {meta.shortName}
                    </td>
                    <td className="py-3 px-3 text-[#7E2F5C] font-medium">{row.lookahead}</td>
                    <td className="py-3 px-3 text-[#4C3640]">{row.stateSize}</td>
                    <td className="py-3 px-3 text-[#4C3640]">{row.reduceRule}</td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => onNavigate(meta.pageId)}
                        className="text-xs font-semibold text-[#B42A60] hover:text-[#8F1F4C] cursor-pointer whitespace-nowrap"
                      >
                        {row.variant === 'lr0' ? 'Open Workbench →' : 'View Theory →'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
