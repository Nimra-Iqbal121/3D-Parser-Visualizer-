import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PARSER_METADATA, PRESET_COMPARISONS } from '../engine/comparisonData';
import { PageId, ParserId } from '../engine/types';

interface ComparisonPageProps {
  onNavigate: (page: PageId) => void;
}

const ALL_IDS: ParserId[] = ['rd', 'll1', 'opp', 'lr0', 'slr1', 'lalr1', 'clr1'];

export const ComparisonPage: React.FC<ComparisonPageProps> = ({ onNavigate }) => {
  const [leftId, setLeftId] = useState<ParserId>('slr1');
  const [rightId, setRightId] = useState<ParserId>('clr1');
  const [activePresetId, setActivePresetId] = useState<string>('slr1-vs-clr1');

  const left = PARSER_METADATA[leftId];
  const right = PARSER_METADATA[rightId];
  const activePreset = PRESET_COMPARISONS.find(
    (p) => p.left === leftId && p.right === rightId
  );

  const selectPreset = (preset: (typeof PRESET_COMPARISONS)[number]) => {
    setLeftId(preset.left);
    setRightId(preset.right);
    setActivePresetId(preset.id);
  };

  const rows: Array<{ label: string; leftVal: string; rightVal: string }> = [
    { label: 'Parser Family', leftVal: left.family, rightVal: right.family },
    { label: 'Parsing Direction', leftVal: left.direction, rightVal: right.direction },
    { label: 'Derivation Type', leftVal: left.derivation, rightVal: right.derivation },
    { label: 'Grammar Requirements', leftVal: left.grammarRequirements, rightVal: right.grammarRequirements },
    { label: 'Parsing Strategy', leftVal: left.strategy, rightVal: right.strategy },
    { label: 'Main Data Structures', leftVal: left.dataStructures, rightVal: right.dataStructures },
    { label: 'Error & Conflict Handling', leftVal: left.conflictHandling, rightVal: right.conflictHandling },
    { label: 'Time Complexity', leftVal: left.timeComplexity, rightVal: right.timeComplexity },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <div className="text-xs font-semibold text-[#B42A60]">
          Comparative Analysis · Top-Down vs Bottom-Up &amp; LR Tiers
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          Parser Comparison Matrix
        </h1>
        <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">
          Select any two parsing techniques below to compare their direction, grammar restrictions,
          data structures, conflict handling, advantages, and limitations side by side.
        </p>
      </header>

      {/* Preset Pair Buttons */}
      <div className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-4 space-y-3 shadow-xs">
        <div className="text-xs font-medium text-[#785D68]">Key Compiler Construction Comparisons:</div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COMPARISONS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectPreset(preset)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activePresetId === preset.id && leftId === preset.left && rightId === preset.right
                  ? 'bg-[#C93B72] text-white font-semibold shadow-xs'
                  : 'bg-[#FAF4EC] text-[#4C3640] border border-[#E4D4C3] hover:border-[#D99BB3]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Pair Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#EFE3D7]">
          <div>
            <label htmlFor="cmp-left" className="block text-xs font-semibold text-[#B42A60] mb-1.5">
              Parser A (Left Column)
            </label>
            <select
              id="cmp-left"
              value={leftId}
              onChange={(e) => {
                setLeftId(e.target.value as ParserId);
                setActivePresetId('');
              }}
              className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3 py-2 text-sm text-[#2B1B22] focus:outline-none focus:border-[#C93B72]"
            >
              {ALL_IDS.map((id) => (
                <option key={id} value={id}>
                  {PARSER_METADATA[id].name} ({PARSER_METADATA[id].family})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cmp-right" className="block text-xs font-semibold text-[#7E2F5C] mb-1.5">
              Parser B (Right Column)
            </label>
            <select
              id="cmp-right"
              value={rightId}
              onChange={(e) => {
                setRightId(e.target.value as ParserId);
                setActivePresetId('');
              }}
              className="w-full rounded-lg bg-[#FAF4EC] border border-[#DECAB6] px-3 py-2 text-sm text-[#2B1B22] focus:outline-none focus:border-[#7E2F5C]"
            >
              {ALL_IDS.map((id) => (
                <option key={id} value={id}>
                  {PARSER_METADATA[id].name} ({PARSER_METADATA[id].family})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activePreset && (
        <div className="rounded-xl bg-[#FCEAF1] border border-[#E8B4C9] p-4 text-sm text-[#2B1B22] leading-relaxed">
          <strong className="text-[#9D2454]">Key Takeaway: </strong>
          {activePreset.keyTakeaway}
        </div>
      )}

      {/* Side-by-Side Comparison Table */}
      <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#F6ECE1] border-b border-[#E4D4C3]">
                <th className="py-3.5 px-4 w-48 text-xs font-semibold text-[#6E535E]">Criterion</th>
                <th className="py-3.5 px-4 border-l border-[#E4D4C3]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-semibold text-[#B42A60]">{left.name}</span>
                    <button
                      type="button"
                      onClick={() => onNavigate(left.pageId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#6E535E] hover:text-[#B42A60] cursor-pointer"
                    >
                      {left.id === 'slr1' || left.id === 'lalr1' || left.id === 'clr1' ? 'Theory' : 'Try'}{' '}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </th>
                <th className="py-3.5 px-4 border-l border-[#E4D4C3]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-semibold text-[#7E2F5C]">{right.name}</span>
                    <button
                      type="button"
                      onClick={() => onNavigate(right.pageId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#6E535E] hover:text-[#7E2F5C] cursor-pointer"
                    >
                      {right.id === 'slr1' || right.id === 'lalr1' || right.id === 'clr1' ? 'Theory' : 'Try'}{' '}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D7] text-xs leading-relaxed">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="py-3.5 px-4 font-semibold text-[#4C3640] bg-[#FAF4EC]">{r.label}</td>
                  <td className="py-3.5 px-4 text-[#2B1B22] border-l border-[#EFE3D7]">{r.leftVal}</td>
                  <td className="py-3.5 px-4 text-[#2B1B22] border-l border-[#EFE3D7]">{r.rightVal}</td>
                </tr>
              ))}
              <tr>
                <td className="py-3.5 px-4 font-semibold text-[#4C3640] bg-[#FAF4EC] align-top">
                  Advantages
                </td>
                <td className="py-3.5 px-4 text-[#2B1B22] border-l border-[#EFE3D7] align-top">
                  <ul className="list-disc pl-4 space-y-1">
                    {left.advantages.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </td>
                <td className="py-3.5 px-4 text-[#2B1B22] border-l border-[#EFE3D7] align-top">
                  <ul className="list-disc pl-4 space-y-1">
                    {right.advantages.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-[#4C3640] bg-[#FAF4EC] align-top">
                  Limitations
                </td>
                <td className="py-3.5 px-4 text-[#2B1B22] border-l border-[#EFE3D7] align-top">
                  <ul className="list-disc pl-4 space-y-1">
                    {left.limitations.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </td>
                <td className="py-3.5 px-4 text-[#2B1B22] border-l border-[#EFE3D7] align-top">
                  <ul className="list-disc pl-4 space-y-1">
                    {right.limitations.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Complete 7-Parser Quick Matrix */}
      <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-3 shadow-xs">
        <h2 className="font-display font-semibold text-base text-[#2B1B22]">
          Full 7-Technique Reference Summary
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="text-[#785D68] border-b border-[#E4D4C3]">
              <tr>
                <th className="py-2 pr-3 font-medium">Parser</th>
                <th className="py-2 px-3 font-medium">Paradigm</th>
                <th className="py-2 px-3 font-medium">Left Recursion</th>
                <th className="py-2 px-3 font-medium">Lookahead</th>
                <th className="py-2 pl-3 font-medium">Core Structure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D7]">
              {ALL_IDS.map((id) => {
                const m = PARSER_METADATA[id];
                return (
                  <tr key={id}>
                    <td className="py-2.5 pr-3 font-bold text-[#2B1B22]">{m.shortName}</td>
                    <td className="py-2.5 px-3 text-[#4C3640]">{m.family}</td>
                    <td className="py-2.5 px-3 font-mono text-[#4C3640]">
                      {m.family === 'Top-Down' ? 'Forbidden' : 'Supported'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#B42A60]">
                      {id === 'lr0' ? '0' : id === 'rd' ? 'Backtrack / 1' : '1 token'}
                    </td>
                    <td className="py-2.5 pl-3 text-[#4C3640]">{m.dataStructures}</td>
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
