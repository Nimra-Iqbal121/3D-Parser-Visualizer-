import React from 'react';
import {
  ArrowRight,
  GitBranch,
  Layers,
  Network,
  ShieldAlert,
  BookOpen,
  Scale,
} from 'lucide-react';
import { PageId } from '../engine/types';
import { Hierarchy3DScene } from '../components/three/Hierarchy3DScene';

interface LandingPageProps {
  onNavigate: (page: PageId) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="pt-8 lg:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <div className="text-xs font-semibold text-[#B42A60]">
              Compiler Construction · Interactive 3D Learning Platform
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-5xl text-[#2B1B22] leading-[1.12] tracking-tight">
              Understand Every Compiler Parser in Interactive 3D
            </h1>

            <p className="text-base text-[#4C3640] leading-relaxed max-w-xl">
              Explore the complete Top-Down and Bottom-Up parser hierarchy with genuine parsing
              algorithms. Enter custom grammars, compute FIRST/FOLLOW sets and LR item automata
              dynamically, and step through 3D stacks, parse trees, and DFA state transitions.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('hierarchy')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              >
                Explore 3D Hierarchy
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium bg-[#FFFDF9] border border-[#DECAB6] text-[#2B1B22] hover:border-[#C93B72] hover:text-[#B42A60] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              >
                Open Main Dashboard
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#785D68] pt-2 border-t border-[#E4D4C3]">
              <span>4 Hands-On Parsers</span>
              <span aria-hidden="true">·</span>
              <span>Full 7-Parser Theory &amp; Comparison</span>
              <span aria-hidden="true">·</span>
              <span>Real Error Diagnostics</span>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col">
            <Hierarchy3DScene
              onOpenPage={onNavigate}
              heightClass="h-[520px] lg:h-[570px]"
              defaultDockOpen={false}
            />
          </div>
        </div>
      </section>

      {/* Complete Parser Taxonomy Overview Strip */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E4D4C3] pb-4">
          <div>
            <h2 className="font-display font-semibold text-2xl text-[#2B1B22]">
              Complete Parser Architecture
            </h2>
            <p className="text-sm text-[#6E535E] mt-1">
              Every parser in the standard compiler taxonomy runs as an independent, verifiable algorithm.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('comparison')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B42A60] hover:text-[#8F1F4C] transition-colors cursor-pointer whitespace-nowrap"
          >
            Compare All Parsers
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top-Down Family */}
          <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-6 space-y-5 shadow-xs">
            <div>
              <div className="text-xs font-mono font-semibold text-[#B42A60]">
                Top-Down Paradigm · Root → Leaves
              </div>
              <h3 className="font-display font-semibold text-xl text-[#2B1B22] mt-1">
                Leftmost Derivation Parsers
              </h3>
              <p className="text-sm text-[#4C3640] mt-1.5 leading-relaxed">
                Start at the start symbol and expand non-terminals toward input tokens. Automatically
                detects left recursion and left factoring issues with previewable fixes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('rd')}
                className="text-left rounded-lg bg-[#FAF4EC] border border-[#E6D6C6] hover:border-[#D99BB3] hover:bg-[#FCEAF1]/60 p-4 transition-colors cursor-pointer group"
              >
                <div className="font-display font-semibold text-sm text-[#2B1B22] group-hover:text-[#B42A60]">
                  01. Recursive Descent
                </div>
                <p className="text-xs text-[#6E535E] mt-1 leading-relaxed">
                  Live procedure call stack, generated pseudocode, and growing 3D parse tree.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('ll1')}
                className="text-left rounded-lg bg-[#FAF4EC] border border-[#E6D6C6] hover:border-[#D99BB3] hover:bg-[#FCEAF1]/60 p-4 transition-colors cursor-pointer group"
              >
                <div className="font-display font-semibold text-sm text-[#2B1B22] group-hover:text-[#B42A60]">
                  02. LL(1) Predictive
                </div>
                <p className="text-xs text-[#6E535E] mt-1 leading-relaxed">
                  FIRST/FOLLOW sets, M[A, a] table, conflict detection, and 3D stack execution.
                </p>
              </button>
            </div>
          </div>

          {/* Bottom-Up Family */}
          <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-6 space-y-5 shadow-xs">
            <div>
              <div className="text-xs font-mono font-semibold text-[#7E2F5C]">
                Bottom-Up Paradigm · Leaves → Root
              </div>
              <h3 className="font-display font-semibold text-xl text-[#2B1B22] mt-1">
                Shift-Reduce &amp; LR Automaton Parsers
              </h3>
              <p className="text-sm text-[#4C3640] mt-1.5 leading-relaxed">
                Shift tokens onto a stack and reduce handles back to the start symbol in reverse
                rightmost order—supporting natural left-recursive expression grammars.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'opp', title: 'OPP', sub: 'Hands-On · FIRSTVT' },
                  { id: 'lr0', title: 'LR(0)', sub: 'Hands-On · DFA' },
                  { id: 'slr1', title: 'SLR(1)', sub: 'Theory · FOLLOW' },
                  { id: 'lalr1', title: 'LALR(1)', sub: 'Theory · Merged' },
                  { id: 'clr1', title: 'CLR(1)', sub: 'Theory · LR(1)' },
                  { id: 'lr-overview', title: 'LR Overview', sub: 'All 4 Tiers' },
                ] as Array<{ id: PageId; title: string; sub: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className="text-left rounded-lg bg-[#FAF4EC] border border-[#E6D6C6] hover:border-[#C99EB9] hover:bg-[#F3E5EE]/70 p-3 transition-colors cursor-pointer group"
                >
                  <div className="font-display font-semibold text-sm text-[#2B1B22] group-hover:text-[#7E2F5C]">
                    {item.title}
                  </div>
                  <div className="text-[11px] font-mono text-[#785D68] mt-0.5">{item.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-2.5 shadow-xs">
          <Layers className="w-5 h-5 text-[#C93B72]" />
          <h3 className="font-display font-semibold text-base text-[#2B1B22]">
            Synchronized 3D Visualizations
          </h3>
          <p className="text-sm text-[#4C3640] leading-relaxed">
            Switch seamlessly between 3D Parsing Stacks, growing 3D Parse Trees, and interactive 3D
            LR State Machines driven directly by live algorithm steps.
          </p>
        </div>

        <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-2.5 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-[#7E2F5C]" />
          <h3 className="font-display font-semibold text-base text-[#2B1B22]">
            Intelligent Error Assistant
          </h3>
          <p className="text-sm text-[#4C3640] leading-relaxed">
            Distinguishes invalid grammar syntax from algorithm incompatibilities and table
            conflicts, offering previewable corrections you confirm before applying.
          </p>
        </div>

        <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-2.5 shadow-xs">
          <Scale className="w-5 h-5 text-[#A53B6B]" />
          <h3 className="font-display font-semibold text-base text-[#2B1B22]">
            Side-by-Side Comparison &amp; Theory
          </h3>
          <p className="text-sm text-[#4C3640] leading-relaxed">
            Compare any two parsers (such as SLR(1) vs CLR(1) or Recursive Descent vs LL(1)) and
            review concise theory with runnable semester demonstrations.
          </p>
        </div>
      </section>

      {/* Quick Utility Links Row */}
      <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="font-display font-semibold text-lg text-[#2B1B22]">
            Ready to test your own grammar?
          </h3>
          <p className="text-sm text-[#6E535E] mt-0.5">
            Run curated semester examples or diagnose custom grammars in the interactive workbenches.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('demos')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#F4E9DD] text-[#2B1B22] hover:bg-[#EAD8C6] transition-colors cursor-pointer whitespace-nowrap"
          >
            <GitBranch className="w-3.5 h-3.5 text-[#C93B72]" />
            Browse Demos
          </button>
          <button
            type="button"
            onClick={() => onNavigate('errors')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#F4E9DD] text-[#2B1B22] hover:bg-[#EAD8C6] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Network className="w-3.5 h-3.5 text-[#7E2F5C]" />
            Error Detection Lab
          </button>
          <button
            type="button"
            onClick={() => onNavigate('theory')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Learning Guide
          </button>
        </div>
      </section>
    </div>
  );
};
