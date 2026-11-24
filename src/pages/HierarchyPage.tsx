import React from 'react';
import { PageId } from '../engine/types';
import { Hierarchy3DScene, HIERARCHY_NODES } from '../components/three/Hierarchy3DScene';

interface HierarchyPageProps {
  onNavigate: (page: PageId) => void;
}

export const HierarchyPage: React.FC<HierarchyPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <div className="text-xs font-semibold text-[#B42A60]">
          Module 1 · Complete Syntax Analysis Taxonomy
        </div>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#2B1B22]">
          3D Parser Hierarchy Explorer
        </h1>
        <p className="text-sm text-[#4C3640] max-w-3xl leading-relaxed">
          Orbit, zoom, hover, and click any node in the 3D tree to examine its parsing paradigm and
          open its interactive workbench. Top-Down parsers are represented as hexagonal rose-pink
          towers; Bottom-Up parsers use stepped berry-plum prisms.
        </p>
      </header>

      <Hierarchy3DScene onOpenPage={onNavigate} heightClass="h-[620px]" />

      {/* Structured Taxonomy Breakdown */}
      <section className="rounded-xl bg-[#FFFDF9] border border-[#E4D4C3] p-5 space-y-4 shadow-xs">
        <h2 className="font-display font-semibold text-base text-[#2B1B22]">
          Complete Hierarchy Directory (11 Nodes)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HIERARCHY_NODES.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => onNavigate(node.targetPage)}
              className="text-left rounded-lg bg-[#FAF4EC] border border-[#E4D4C3] hover:border-[#D99BB3] hover:bg-[#FCEAF1]/60 p-3.5 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-semibold text-sm text-[#2B1B22]">
                  {node.label}
                </span>
                <span className="text-[11px] font-mono text-[#8F1F4C]">{node.shortTag}</span>
              </div>
              <p className="text-xs text-[#6E535E] mt-1 leading-relaxed">{node.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
