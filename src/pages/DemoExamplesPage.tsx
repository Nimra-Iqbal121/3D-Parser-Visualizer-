import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { DEMO_EXAMPLES } from '../engine/demos';
import { PARSER_METADATA } from '../engine/comparisonData';
import { DemoExample, ParserId } from '../engine/types';

interface DemoExamplesPageProps {
  onLaunchDemo: (demo: DemoExample) => void;
}

export const DemoExamplesPage: React.FC<DemoExamplesPageProps> = ({ onLaunchDemo }) => {
  const [parserFilter, setParserFilter] = useState<'all' | ParserId>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = ['all', 'Arithmetic', 'Precedence', 'Parentheses', 'Simple Grammar', 'Conflict Case', 'Error Case'];

  const filtered = DEMO_EXAMPLES.filter((d) => {
    const matchParser = parserFilter === 'all' || d.parser === parserFilter;
    const matchCat = categoryFilter === 'all' || d.category === categoryFilter;
    return matchParser && matchCat;
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <div className="text-xs font-semibold text-[#B42A60]">
          Curated Semester Demonstrations · {DEMO_EXAMPLES.length} Executable Cases
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          Demonstration Examples
        </h1>
        <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">
          Select any predefined demonstration below to automatically load its grammar and input
          expression into the corresponding parsing module and execute its 3D visualization.
        </p>
      </header>

      {/* Filters */}
      <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter demos by parser">
          <span className="text-xs font-medium text-[#785D68] mr-2">Parser:</span>
          {(['all', 'rd', 'll1', 'opp', 'lr0'] as const).map((pid) => (
            <button
              key={pid}
              type="button"
              onClick={() => setParserFilter(pid)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                parserFilter === pid
                  ? 'bg-[#C93B72] text-white font-semibold shadow-xs'
                  : 'bg-[#FAF4EC] text-[#4C3640] border border-[#E4D4C3] hover:border-[#D99BB3]'
              }`}
            >
              {pid === 'all' ? 'All Parsers' : PARSER_METADATA[pid].shortName}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter demos by category">
          <span className="text-xs font-medium text-[#785D68] mr-2">Topic:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-[#F3E5EE] text-[#732A53] border border-[#D7B2C9] font-semibold'
                  : 'bg-[#FAF4EC] text-[#6E535E] border border-[#E4D4C3] hover:text-[#2B1B22]'
              }`}
            >
              {cat === 'all' ? 'All Topics' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Demo Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((demo) => {
          const meta = PARSER_METADATA[demo.parser];
          return (
            <div
              key={demo.id}
              className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 flex flex-col justify-between gap-4 shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs text-[#785D68]">
                  <span>
                    <strong className="text-[#B42A60] font-mono">{meta.shortName}</strong>
                    {' · '}
                    {demo.category}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    {demo.expectedOutcome === 'accepted' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#166A4A]" />
                        <span className="text-[#166A4A]">Accepted</span>
                      </>
                    ) : demo.expectedOutcome === 'conflict' ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-[#9C5B12]" />
                        <span className="text-[#9C5B12]">Conflict Demo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-[#B51D3D]" />
                        <span className="text-[#B51D3D]">Error Demo</span>
                      </>
                    )}
                  </span>
                </div>

                <div>
                  <h2 className="font-display font-semibold text-base text-[#2B1B22]">{demo.title}</h2>
                  <p className="text-xs text-[#4C3640] mt-1 leading-relaxed">{demo.description}</p>
                </div>

                <div className="rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] p-3 space-y-2 font-mono text-xs">
                  <pre className="text-[#7E2F5C] font-semibold whitespace-pre-wrap leading-relaxed">
                    {demo.grammar}
                  </pre>
                  <div className="pt-2 border-t border-[#E4D4C3] text-[#2B1B22]">
                    <span className="text-[#785D68]">Input: </span>
                    {demo.input}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onLaunchDemo(demo)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#C93B72] text-white hover:bg-[#AD2B5D] transition-colors cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Load &amp; Visualize in {meta.shortName}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
