import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ParseTreeNode } from '../../engine/types';

interface ParseTree2DProps {
  root: ParseTreeNode | null;
  compact?: boolean;
}

interface PositionedNode {
  id: string;
  symbol: string;
  isTerminal: boolean;
  status?: ParseTreeNode['status'];
  x: number;
  y: number;
  parentX?: number;
  parentY?: number;
}

export const ParseTree2D: React.FC<ParseTree2DProps> = ({ root, compact = false }) => {
  const [zoom, setZoom] = useState<number>(1);

  if (!root) {
    return (
      <div className="h-60 flex flex-col items-center justify-center rounded-xl bg-[#FAF4EC] border border-[#E4D4C3] text-center px-6 space-y-1.5">
        <div className="text-xs font-semibold text-[#4C3640]">Parse Tree Ready</div>
        <p className="text-xs text-[#785D68] max-w-xs">
          Click <strong>Next</strong> or <strong>Play</strong> to watch the parse tree grow step by step.
        </p>
      </div>
    );
  }

  const nodes: PositionedNode[] = [];
  let leafX = 0;
  const xStep = 86;
  const yStep = 72;

  function walk(node: ParseTreeNode, depth: number): { x: number; y: number } {
    const y = 40 + depth * yStep;
    if (!node.children || node.children.length === 0) {
      const x = 58 + leafX * xStep;
      leafX++;
      nodes.push({
        id: node.id,
        symbol: node.symbol,
        isTerminal: node.isTerminal,
        status: node.status,
        x,
        y,
      });
      return { x, y };
    }
    const childCoords = node.children.map((c) => walk(c, depth + 1));
    const x = (childCoords[0].x + childCoords[childCoords.length - 1].x) / 2;
    for (const child of node.children) {
      const found = nodes.find((n) => n.id === child.id);
      if (found) {
        found.parentX = x;
        found.parentY = y;
      }
    }
    nodes.push({
      id: node.id,
      symbol: node.symbol,
      isTerminal: node.isTerminal,
      status: node.status,
      x,
      y,
    });
    return { x, y };
  }

  walk(root, 0);

  const maxX = Math.max(...nodes.map((n) => n.x), 300) + 64;
  const maxY = Math.max(...nodes.map((n) => n.y), 190) + 48;

  return (
    <div className="rounded-xl bg-[#FAF4EC] border border-[#E4D4C3] overflow-hidden flex flex-col">
      {/* Legend + Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#F5ECE1] border-b border-[#E4D4C3]">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5A404B]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#FFFDF9] border-2 border-[#C93B72] inline-block" />
            Non-Terminal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E9F6F0] border-2 border-[#166A4A] inline-block" />
            Terminal (Token)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#FCE4EE] border-2 border-[#C93B72] inline-block" />
            Active Step
          </span>
        </div>

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.15).toFixed(2))))}
            className="p-1 rounded bg-[#FFFDF9] border border-[#DFCCB9] text-[#5A404B] hover:text-[#B42A60] cursor-pointer"
            aria-label="Zoom out parse tree"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-[#6E535E] w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
            className="p-1 rounded bg-[#FFFDF9] border border-[#DFCCB9] text-[#5A404B] hover:text-[#B42A60] cursor-pointer"
            aria-label="Zoom in parse tree"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1 rounded bg-[#FFFDF9] border border-[#DFCCB9] text-[#5A404B] hover:text-[#B42A60] cursor-pointer"
            aria-label="Reset parse tree zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className={`overflow-auto p-2.5 ${compact ? 'max-h-[300px]' : 'max-h-[450px]'}`}>
        <svg
          width={zoom === 1 ? '100%' : Math.round(maxX * zoom)}
          height={zoom === 1 ? undefined : Math.round(maxY * zoom)}
          viewBox={`0 0 ${maxX} ${maxY}`}
          className={`mx-auto block ${
            zoom === 1
              ? compact
                ? 'w-full h-auto max-h-[275px]'
                : 'w-full h-auto max-h-[420px]'
              : ''
          }`}
          role="img"
          aria-label="2D Parse Tree Diagram"
        >
          {/* Smooth Cubic Bezier Branches */}
          {nodes.map((n) => {
            if (n.parentX === undefined || n.parentY === undefined) return null;
            const sy = n.parentY + 18;
            const ey = n.y - 18;
            const midY = (sy + ey) / 2;
            const activeBranch = n.status === 'active' || n.status === 'reduced';
            return (
              <path
                key={`edge-${n.id}`}
                d={`M ${n.parentX} ${sy} C ${n.parentX} ${midY}, ${n.x} ${midY}, ${n.x} ${ey}`}
                fill="none"
                stroke={activeBranch ? '#C93B72' : '#C5AA9B'}
                strokeWidth={activeBranch ? 2.6 : 1.9}
              />
            );
          })}

          {/* Crisp Nodes */}
          {nodes.map((n) => {
            const isHighlighted = n.status === 'active' || n.status === 'reduced';
            const stroke =
              n.status === 'error'
                ? '#B51D3D'
                : n.status === 'reduced'
                ? '#7E2F5C'
                : n.status === 'active'
                ? '#C93B72'
                : n.isTerminal
                ? '#166A4A'
                : '#C93B72';
            const fill =
              n.status === 'error'
                ? '#FDECEF'
                : n.status === 'reduced'
                ? '#F3E5EE'
                : n.status === 'active'
                ? '#FCE4EE'
                : n.isTerminal
                ? '#E9F6F0'
                : '#FFFDF9';

            return (
              <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                {isHighlighted && (
                  <rect
                    x={-34}
                    y={-21}
                    width={68}
                    height={42}
                    rx={n.isTerminal ? 20 : 11}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={0.32}
                    strokeWidth={4}
                  />
                )}
                <rect
                  x={-29}
                  y={-17}
                  width={58}
                  height={34}
                  rx={n.isTerminal ? 17 : 8}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isHighlighted ? 2.4 : 1.8}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#2B1B22"
                  fontSize={13}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={700}
                >
                  {n.symbol.length > 7 ? `${n.symbol.slice(0, 6)}…` : n.symbol}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
