import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PageId } from '../engine/types';

interface AboutPageProps {
  onNavigate: (page: PageId) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 max-w-4xl">
      <header className="space-y-1.5">
        <div className="text-xs font-semibold text-[#B42A60]">
          Compiler Construction Semester Project
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          About Parser Visualizer 3D
        </h1>
        <p className="text-sm text-[#4C3640] leading-relaxed">
          Parser Visualizer 3D is an interactive educational platform designed to make syntax
          analysis concrete and verifiable. Rather than displaying static textbook diagrams or
          canned animations, every parsing table, item set, error diagnosis, and 3D scene is driven
          live by genuine compiler algorithms.
        </p>
      </header>

      <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-6 space-y-4 shadow-xs">
        <h2 className="font-display font-semibold text-lg text-[#2B1B22]">
          Implemented Parser Coverage
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#4C3640] leading-relaxed">
          <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-4 space-y-1.5">
            <h3 className="font-display font-semibold text-sm text-[#B42A60]">Top-Down Parsers</h3>
            <p>
              <strong className="text-[#2B1B22]">1. Recursive Descent:</strong> Backtracking procedure call engine with
              generated pseudocode, call-frame inspection, and left-recursion prevention.
            </p>
            <p>
              <strong className="text-[#2B1B22]">2. LL(1) Predictive Parser:</strong> Algorithmic FIRST &amp; FOLLOW sets,
              left-recursion &amp; left-factoring diagnostics, M[A, a] predictive table, and stack
              trace.
            </p>
          </div>
          <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-4 space-y-1.5">
            <h3 className="font-display font-semibold text-sm text-[#7E2F5C]">Bottom-Up Parsers</h3>
            <p>
              <strong className="text-[#2B1B22]">1. Operator Precedence (OPP):</strong> Operator-grammar validator, FIRSTVT &amp;
              LASTVT calculation, &lt; / = / &gt; matrix, and handle shift-reduce execution.
            </p>
            <p>
              <strong className="text-[#2B1B22]">2. LR Family:</strong> Hands-on interactive LR(0)
              workbench (Closure, GOTO, ACTION/GOTO table, and 2D/3D DFA visualization), paired with
              full conceptual theory and side-by-side comparison for SLR(1), LALR(1), and CLR(1).
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-6 space-y-4 shadow-xs">
        <h2 className="font-display font-semibold text-lg text-[#2B1B22]">
          Technical Architecture
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#4C3640] leading-relaxed">
          <div className="space-y-1">
            <div className="font-semibold text-[#2B1B22]">Modular Parsing Engine</div>
            <p className="text-[#6E535E]">
              Pure TypeScript compiler algorithms decoupled from UI rendering and verified by
              automated unit tests covering FIRST/FOLLOW, FIRSTVT/LASTVT, LR state counts, and
              conflict detection.
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-[#2B1B22]">Interactive 3D Rendering</div>
            <p className="text-[#6E535E]">
              Three.js PBR scenes with composite porcelain-and-rose-gold nodes, OrbitControls,
              raycasting selection, 3D parsing stacks, auto-fitted 3D parse trees, and 3D LR state
              machines.
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-[#2B1B22]">Diagnostic Assistant</div>
            <p className="text-[#6E535E]">
              Separates invalid grammar syntax, unsupported algorithm conditions, table conflicts,
              and input errors, offering preview-and-confirm grammar transformations.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onNavigate('hierarchy')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] cursor-pointer shadow-xs"
        >
          Explore 3D Hierarchy
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium bg-[#F4E9DD] text-[#2B1B22] hover:bg-[#EAD8C6] cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
