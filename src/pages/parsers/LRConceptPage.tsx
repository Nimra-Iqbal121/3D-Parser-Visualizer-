import React from 'react';
import { ArrowRight, BookOpen, Scale, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { PARSER_METADATA } from '../../engine/comparisonData';
import { PageId } from '../../engine/types';

interface LRConceptPageProps {
  variant: 'slr1' | 'clr1' | 'lalr1';
  onNavigate: (page: PageId) => void;
}

const CONCEPT_DETAILS: Record<
  'slr1' | 'clr1' | 'lalr1',
  {
    tierLabel: string;
    howItWorks: string[];
    tableRule: string;
    keyExampleTitle: string;
    keyExampleGrammar: string;
    keyExampleNote: string;
  }
> = {
  slr1: {
    tierLabel: 'Tier 02 · Simple LR(1) — Theory & Concept Reference',
    howItWorks: [
      'Constructs the exact same canonical collection of LR(0) item sets (DFA states) as LR(0) — zero extra states are added.',
      'For any completed item A → α · inside state Ii, places a Reduce action ONLY in columns belonging to FOLLOW(A) instead of every terminal.',
      'Resolves most arithmetic Shift/Reduce conflicts where LR(0) fails, making standard left-recursive expression grammars deterministic.',
    ],
    tableRule: 'If [A → α ·] ∈ Ii, set ACTION[i, a] = reduce(A → α) for every terminal a ∈ FOLLOW(A).',
    keyExampleTitle: 'Where SLR(1) Succeeds vs. Where It Stops',
    keyExampleGrammar: 'E → E + T | T\nT → T * F | F\nF → ( E ) | id',
    keyExampleNote:
      'SLR(1) cleanly parses standard arithmetic expressions because FOLLOW(T) = { +, ), $ } excludes "*", avoiding a Shift/Reduce conflict. However, because FOLLOW(A) is global rather than state-specific, grammars like pointer assignment (S → L = R | R; L → * R | id; R → L) still produce an SLR(1) Shift/Reduce conflict.',
  },
  lalr1: {
    tierLabel: 'Tier 03 · Lookahead LR(1) — Theory & Concept Reference',
    howItWorks: [
      'Starts conceptually from Canonical LR(1) item sets and identifies states that share the exact same LR(0) item core (same productions and dot positions).',
      'Merges states with identical cores into a single compact state by taking the union of their per-item lookahead sets.',
      'Matches the small table size of SLR(1) while retaining nearly the full parsing power of CLR(1), which is why Yacc, Bison, and Menhir use LALR(1).',
    ],
    tableRule: 'Merge CLR(1) states Ij and Ik whenever core(Ij) = core(Ik), uniting each item’s lookahead set LAj ∪ LAk.',
    keyExampleTitle: 'Core Merging Trade-Off',
    keyExampleGrammar: 'S → C C\nC → c C | d',
    keyExampleNote:
      'On S → C C, CLR(1) creates 10 states while LALR(1) merges matching cores down to 7 states with zero conflicts. Merging cores can never introduce a new Shift/Reduce conflict, though in rare synthetic grammars it can merge lookaheads into a Reduce/Reduce conflict.',
  },
  clr1: {
    tierLabel: 'Tier 04 · Canonical LR(1) — Theory & Concept Reference',
    howItWorks: [
      'Augments every item with an exact lookahead terminal: [A → α · β, a], tracking which terminal may validly follow A in this specific DFA state.',
      'During closure of [A → α · B β, a], adds [B → · γ, b] for every b ∈ FIRST(β a) — giving exact context-sensitive lookahead propagation.',
      'Places Reduce actions for [A → α ·, a] strictly in column ACTION[i, a], achieving the maximum parsing power of any 1-token deterministic LR parser.',
    ],
    tableRule: 'If [A → α ·, a] ∈ Ii (with A ≠ S′), set ACTION[i, a] = reduce(A → α) strictly for lookahead a.',
    keyExampleTitle: 'Context-Sensitive Power vs. State Count',
    keyExampleGrammar: 'S → L = R | R\nL → * R | id\nR → L',
    keyExampleNote:
      'CLR(1) distinguishes left-hand vs. right-hand contexts so R → L · only reduces on "$" (not "="), eliminating the SLR(1) Shift/Reduce conflict. The trade-off is larger automata—real programming languages can generate thousands of CLR(1) states compared to hundreds in LALR(1).',
  },
};

export const LRConceptPage: React.FC<LRConceptPageProps> = ({ variant, onNavigate }) => {
  const meta = PARSER_METADATA[variant];
  const detail = CONCEPT_DETAILS[variant];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="text-xs font-semibold text-[#7E2F5C]">{detail.tierLabel}</div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          {meta.name}
        </h1>
        <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">{meta.summary}</p>
      </header>

      {/* Concept-only scope notice + quick links */}
      <div className="rounded-xl bg-[#FCEAF1] border border-[#E8B4C9] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5 max-w-2xl">
          <div className="text-xs font-semibold text-[#8F1F4C]">
            Theory &amp; Comparison Module
          </div>
          <p className="text-xs text-[#4C3640] leading-relaxed">
            {meta.shortName} is included here for conceptual study and side-by-side comparison within
            the LR hierarchy (<span className="font-mono font-semibold">LR(0) ⊂ SLR(1) ⊂ LALR(1) ⊂ CLR(1)</span>).
            For hands-on step-by-step LR execution, use the interactive <strong>LR(0) Parser</strong> workbench.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('comparison')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Scale className="w-3.5 h-3.5" />
            Compare LR Parsers
          </button>
          <button
            type="button"
            onClick={() => onNavigate('theory')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FFFDF9] border border-[#DECAB6] text-[#2B1B22] hover:border-[#C93B72] hover:text-[#B42A60] transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Full Theory Guide
          </button>
        </div>
      </div>

      {/* How It Works & Formal Table Rule */}
      <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-4 shadow-xs">
        <h2 className="font-display font-semibold text-lg text-[#2B1B22]">
          How {meta.shortName} Works
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-[#4C3640] leading-relaxed">
          {detail.howItWorks.map((pt, i) => (
            <li key={i}>{pt}</li>
          ))}
        </ul>
        <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] px-4 py-3 font-mono text-xs font-semibold text-[#7E2F5C]">
          {detail.tableRule}
        </div>
      </section>

      {/* Architecture Summary Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-3 shadow-xs">
          <h3 className="font-display font-semibold text-base text-[#2B1B22]">
            Algorithm Characteristics
          </h3>
          <dl className="space-y-2.5 text-xs leading-relaxed">
            <div>
              <dt className="font-semibold text-[#785D68]">Parsing Strategy</dt>
              <dd className="text-[#2B1B22] mt-0.5">{meta.strategy}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#785D68]">Grammar Requirements</dt>
              <dd className="text-[#2B1B22] mt-0.5">{meta.grammarRequirements}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#785D68]">Core Data Structures</dt>
              <dd className="text-[#2B1B22] mt-0.5">{meta.dataStructures}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#785D68]">Conflict Handling &amp; Complexity</dt>
              <dd className="text-[#2B1B22] mt-0.5">
                {meta.conflictHandling} · <span className="font-mono font-semibold text-[#B42A60]">{meta.timeComplexity}</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-3 shadow-xs">
          <h3 className="font-display font-semibold text-base text-[#2B1B22]">
            {detail.keyExampleTitle}
          </h3>
          <pre className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-3.5 font-mono text-xs font-semibold text-[#7E2F5C] whitespace-pre-wrap">
            {detail.keyExampleGrammar}
          </pre>
          <p className="text-xs text-[#4C3640] leading-relaxed">{detail.keyExampleNote}</p>
        </div>
      </section>

      {/* Advantages & Limitations */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#166A4A]" />
            <h3 className="font-display font-semibold text-base text-[#2B1B22]">Advantages</h3>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#4C3640] leading-relaxed">
            {meta.advantages.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#9C5B12]" />
            <h3 className="font-display font-semibold text-base text-[#2B1B22]">Limitations</h3>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#4C3640] leading-relaxed">
            {meta.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Related Navigation */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => onNavigate('lr0')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer shadow-xs"
        >
          Try Hands-On LR(0) Parser
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('lr-overview')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium bg-[#F4E9DD] text-[#2B1B22] hover:bg-[#EAD8C6] transition-colors cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-[#7E2F5C]" />
          Back to LR Family Overview
        </button>
      </div>
    </div>
  );
};
