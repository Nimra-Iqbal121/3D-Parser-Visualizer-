import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PARSER_METADATA, THEORY_TOPICS } from '../engine/comparisonData';
import { PageId } from '../engine/types';

interface TheoryPageProps {
  onNavigate: (page: PageId) => void;
}

export const TheoryPage: React.FC<TheoryPageProps> = ({ onNavigate }) => {
  const [category, setCategory] = useState<'All' | 'Foundations' | 'Top-Down' | 'Bottom-Up' | 'Core Algorithms'>('All');

  const filtered =
    category === 'All'
      ? THEORY_TOPICS
      : THEORY_TOPICS.filter((t) => t.category === category);

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <div className="text-xs font-semibold text-[#B42A60]">
          Compiler Construction Study Guide
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          Learning &amp; Theory Section
        </h1>
        <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">
          Clear, exam-ready explanations covering syntax analysis, Top-Down vs Bottom-Up parsing,
          FIRST &amp; FOLLOW sets, Closure &amp; GOTO, Shift/Reduce mechanics, and parsing conflicts.
        </p>
      </header>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter theory topics by category">
        {(['All', 'Foundations', 'Top-Down', 'Bottom-Up', 'Core Algorithms'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              category === cat
                ? 'bg-[#C93B72] text-white font-semibold shadow-xs'
                : 'bg-[#FFFDF9] text-[#4C3640] border border-[#E4D4C3] hover:border-[#D99BB3]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Theory Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((topic, idx) => (
          <article
            key={topic.id}
            className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 flex flex-col justify-between gap-4 shadow-xs"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-[#785D68]">
                <span className="font-mono font-semibold text-[#B42A60]">
                  0{idx + 1}. {topic.category}
                </span>
              </div>

              <h2 className="font-display font-semibold text-lg text-[#2B1B22]">
                {topic.title}
              </h2>

              <p className="text-sm text-[#4C3640] leading-relaxed">
                {topic.summary}
              </p>

              <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#4C3640] leading-relaxed">
                {topic.keyPoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>

              {topic.formula && (
                <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] px-3.5 py-2.5 font-mono text-xs font-semibold text-[#7E2F5C] overflow-x-auto">
                  {topic.formula}
                </div>
              )}

              {topic.example && (
                <div className="text-xs text-[#6E535E] leading-relaxed">
                  <span className="font-semibold text-[#2B1B22]">Example: </span>
                  <span className="font-mono text-[#4C3640]">{topic.example}</span>
                </div>
              )}
            </div>

            {topic.relatedParser && (
              <div className="pt-2 border-t border-[#EFE3D7]">
                <button
                  type="button"
                  onClick={() => onNavigate(PARSER_METADATA[topic.relatedParser!].pageId)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B42A60] hover:text-[#8F1F4C] cursor-pointer"
                >
                  {topic.relatedParser === 'slr1' ||
                  topic.relatedParser === 'lalr1' ||
                  topic.relatedParser === 'clr1'
                    ? `View ${PARSER_METADATA[topic.relatedParser].name} Concept`
                    : `Practice in ${PARSER_METADATA[topic.relatedParser].name}`}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};
