import React, { useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { LRItem, LRState, ParseStep } from '../../engine/types';
import { layoutLRAutomaton2D } from '../../engine/visualizerHelpers';

interface LRAutomaton2DProps {
  states: LRState[];
  step: ParseStep | null;
  showLookaheads?: boolean;
  selectedStateId?: number;
  onSelectState?: (stateId: number) => void;
  compact?: boolean;
}

function formatItem(item: LRItem, showLookaheads: boolean): string {
  const before = item.rhs.slice(0, item.dot).join(' ');
  const after = item.rhs.slice(item.dot).join(' ');
  const rhs = [before, '·', after].filter(Boolean).join(' ');
  if (showLookaheads && item.lookaheads.length > 0) {
    return `${item.lhs} → ${rhs}   [ ${item.lookaheads.join(' / ')} ]`;
  }
  return `${item.lhs} → ${rhs}`;
}

export const LRAutomaton2D: React.FC<LRAutomaton2DProps> = ({
  states,
  step,
  showLookaheads = false,
  selectedStateId,
  onSelectState,
  compact = false,
}) => {
  const [localSelectedId, setLocalSelectedId] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const layout = useMemo(() => layoutLRAutomaton2D(states), [states]);
  const nodeById = useMemo(() => {
    const map = new Map<number, (typeof layout.nodes)[number]>();
    for (const n of layout.nodes) map.set(n.state.id, n);
    return map;
  }, [layout]);

  const activeStateId = step?.activeState ?? 0;
  const fromStateId = step?.fromState;
  const activeSym = step?.transitionSymbol;

  const inspectedId = localSelectedId ?? selectedStateId ?? activeStateId;
  const inspectedState = states.find((s) => s.id === inspectedId) ?? states[0] ?? null;

  const handleSelect = (id: number) => {
    setLocalSelectedId(id);
    onSelectState?.(id);
  };

  if (states.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center rounded-xl bg-[#FAF4EC] border border-[#E4D4C3] text-xs text-[#785D68]">
        Enter a valid grammar to generate the interactive LR state machine.
      </div>
    );
  }

  const nodeR = 29;

  return (
    <div className="rounded-xl bg-[#FAF4EC] border border-[#E4D4C3] overflow-hidden flex flex-col">
      {/* Legend + Zoom Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#F5ECE1] border-b border-[#E4D4C3]">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5A404B]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C93B72] inline-block" />
            Active State
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E9F6F0] border-2 border-[#166A4A] inline-block" />
            Accept
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F3E5EE] border-2 border-[#7E2F5C] inline-block" />
            Merged / Reduce
          </span>
          <span className="hidden sm:inline text-[#8A6D79]">· Click any state to inspect items</span>
        </div>

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
            className="p-1 rounded bg-[#FFFDF9] border border-[#DFCCB9] text-[#5A404B] hover:text-[#B42A60] cursor-pointer"
            aria-label="Zoom out LR automaton"
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
            aria-label="Zoom in LR automaton"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setLocalSelectedId(null);
            }}
            className="p-1 rounded bg-[#FFFDF9] border border-[#DFCCB9] text-[#5A404B] hover:text-[#B42A60] cursor-pointer"
            aria-label="Reset LR automaton zoom and follow active state"
            title="Reset zoom & follow active state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable / Auto-Fitted SVG Graph */}
      <div
        className={`overflow-auto bg-[#FAF4EC] p-2 ${compact ? 'max-h-[300px]' : 'max-h-[430px]'}`}
      >
        <svg
          width={zoom === 1 ? '100%' : Math.round(layout.width * zoom)}
          height={zoom === 1 ? undefined : Math.round(layout.height * zoom)}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className={`mx-auto block select-none ${
            zoom === 1
              ? compact
                ? 'w-full h-auto max-h-[280px]'
                : 'w-full h-auto max-h-[410px]'
              : ''
          }`}
          role="img"
          aria-label="Interactive 2D LR State Automaton Diagram"
        >
          <defs>
            <marker
              id="lr-arrow-normal"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#8C6275" />
            </marker>
            <marker
              id="lr-arrow-hot"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="7.5"
              markerHeight="7.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9.5 5 L 0 9 z" fill="#C93B72" />
            </marker>
          </defs>

          {/* Start Entry Arrow pointing into I0 */}
          {layout.nodes[0] && (
            <g>
              <line
                x1={Math.max(14, layout.nodes[0].x - 76)}
                y1={layout.nodes[0].y}
                x2={layout.nodes[0].x - nodeR - 4}
                y2={layout.nodes[0].y}
                stroke="#C93B72"
                strokeWidth={2.2}
                markerEnd="url(#lr-arrow-hot)"
              />
              <text
                x={Math.max(14, layout.nodes[0].x - 76)}
                y={layout.nodes[0].y - 9}
                fill="#9D2454"
                fontSize={10}
                fontWeight={700}
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                START
              </text>
            </g>
          )}

          {/* Edges */}
          {layout.edges.map((edge) => {
            const from = nodeById.get(edge.fromId);
            const to = nodeById.get(edge.toId);
            if (!from || !to) return null;

            const isHot =
              fromStateId === edge.fromId &&
              activeStateId === edge.toId &&
              Boolean(activeSym && edge.symbols.includes(activeSym));

            const labelText = edge.symbols.join(', ');
            const labelW = Math.max(24, labelText.length * 8.2 + 12);

            if (edge.isSelfLoop) {
              const sx = from.x - 12;
              const sy = from.y - nodeR + 2;
              const ex = from.x + 12;
              const ey = from.y - nodeR + 2;
              const cy = from.y - nodeR - 54;
              const lx = from.x;
              const ly = from.y - nodeR - 39;

              return (
                <g key={edge.id}>
                  <path
                    d={`M ${sx} ${sy} C ${from.x - 42} ${cy}, ${from.x + 42} ${cy}, ${ex} ${ey}`}
                    fill="none"
                    stroke={isHot ? '#C93B72' : '#9B7586'}
                    strokeWidth={isHot ? 3 : 1.8}
                    markerEnd={isHot ? 'url(#lr-arrow-hot)' : 'url(#lr-arrow-normal)'}
                  />
                  <rect
                    x={lx - labelW / 2}
                    y={ly - 10}
                    width={labelW}
                    height={20}
                    rx={5}
                    fill={isHot ? '#C93B72' : '#FFFDF9'}
                    stroke={isHot ? '#9D2454' : '#D9C2B3'}
                    strokeWidth={1.4}
                  />
                  <text
                    x={lx}
                    y={ly + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isHot ? '#FFFFFF' : '#2B1B22'}
                    fontSize={11}
                    fontWeight={700}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {labelText}
                  </text>
                </g>
              );
            }

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.hypot(dx, dy) || 1;
            const ux = dx / dist;
            const uy = dy / dist;

            // Curve slightly so opposite-direction or long backward arcs never collide
            const hasReverse = layout.edges.some(
              (e) => e.fromId === edge.toId && e.toId === edge.fromId
            );
            const curveLift = edge.isBackward
              ? 46
              : hasReverse
              ? 24
              : Math.abs(dy) < 4 && Math.abs(dx) > 220
              ? -36
              : 10;

            const nx = -uy;
            const ny = ux;
            const mx = (from.x + to.x) / 2 + nx * curveLift;
            const my = (from.y + to.y) / 2 + ny * curveLift;

            // Trim endpoints cleanly to circle perimeter
            const startAngle = Math.atan2(my - from.y, mx - from.x);
            const endAngle = Math.atan2(my - to.y, mx - to.x);
            const sx = from.x + Math.cos(startAngle) * (nodeR + 1);
            const sy = from.y + Math.sin(startAngle) * (nodeR + 1);
            const ex = to.x + Math.cos(endAngle) * (nodeR + 5);
            const ey = to.y + Math.sin(endAngle) * (nodeR + 5);

            // Quadratic Bezier midpoint at t = 0.5
            const lx = 0.25 * sx + 0.5 * mx + 0.25 * ex;
            const ly = 0.25 * sy + 0.5 * my + 0.25 * ey;

            return (
              <g key={edge.id}>
                <path
                  d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
                  fill="none"
                  stroke={isHot ? '#C93B72' : '#9B7586'}
                  strokeWidth={isHot ? 3 : 1.7}
                  strokeDasharray={edge.isBackward && !isHot ? '5 3' : undefined}
                  markerEnd={isHot ? 'url(#lr-arrow-hot)' : 'url(#lr-arrow-normal)'}
                />
                <rect
                  x={lx - labelW / 2}
                  y={ly - 10}
                  width={labelW}
                  height={20}
                  rx={5}
                  fill={isHot ? '#C93B72' : '#FFFDF9'}
                  stroke={isHot ? '#9D2454' : '#D9C2B3'}
                  strokeWidth={1.4}
                />
                <text
                  x={lx}
                  y={ly + 0.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isHot ? '#FFFFFF' : '#2B1B22'}
                  fontSize={11}
                  fontWeight={700}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {labelText}
                </text>
              </g>
            );
          })}

          {/* State Nodes */}
          {layout.nodes.map((node) => {
            const st = node.state;
            const isActive = st.id === activeStateId;
            const isInspected = st.id === inspectedId;

            const fill = isActive
              ? '#C93B72'
              : node.isAccept
              ? '#E9F6F0'
              : node.isMerged || node.isReduceOnly
              ? '#F3E5EE'
              : '#FFFDF9';

            const stroke = isActive
              ? '#8F1F4C'
              : node.isAccept
              ? '#166A4A'
              : node.isMerged || node.isReduceOnly
              ? '#7E2F5C'
              : '#B896A6';

            const textColor = isActive ? '#FFFFFF' : '#2B1B22';
            const subColor = isActive ? '#FDE4EE' : '#785D68';

            return (
              <g
                key={st.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleSelect(st.id)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Inspect LR state ${st.label} with ${st.items.length} items`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(st.id);
                  }
                }}
              >
                {/* Selection / Active outer halo */}
                {(isActive || isInspected) && (
                  <circle
                    r={nodeR + 6}
                    fill="none"
                    stroke={isActive ? '#C93B72' : '#7E2F5C'}
                    strokeOpacity={isActive ? 0.35 : 0.45}
                    strokeWidth={4}
                  />
                )}

                {/* Double-ring for Accept state */}
                {node.isAccept && (
                  <circle
                    r={nodeR + 3.5}
                    fill="none"
                    stroke={isActive ? '#166A4A' : '#166A4A'}
                    strokeWidth={1.6}
                  />
                )}

                <circle
                  r={nodeR}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isActive || isInspected ? 2.5 : 1.8}
                />

                <text
                  y={-4}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={textColor}
                  fontSize={12.5}
                  fontWeight={800}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {st.label}
                </text>
                <text
                  y={12}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={subColor}
                  fontSize={9.5}
                  fontWeight={600}
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  {st.items.length} item{st.items.length === 1 ? '' : 's'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected / Active State Inspector Strip */}
      {inspectedState && (
        <div className="px-3.5 py-2.5 bg-[#FFFDF9] border-t border-[#E4D4C3] flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 text-xs">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-[#B42A60]">
                State {inspectedState.label}
              </span>
              {inspectedState.id === activeStateId && (
                <span className="px-1.5 py-0.5 rounded bg-[#FCEAF1] text-[#9D2454] text-[10px] font-semibold">
                  Current Active State
                </span>
              )}
              {inspectedState.mergedFrom && inspectedState.mergedFrom.length > 1 && (
                <span className="px-1.5 py-0.5 rounded bg-[#F3E5EE] text-[#732A53] text-[10px] font-semibold font-mono">
                  Merged {inspectedState.mergedFrom.map((id) => `I${id}`).join(' + ')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[11px] text-[#2B1B22]">
              {inspectedState.items.slice(0, 5).map((it, i) => (
                <span
                  key={i}
                  className={it.dot === it.rhs.length ? 'text-[#7E2F5C] font-semibold' : ''}
                >
                  {formatItem(it, showLookaheads)}
                </span>
              ))}
              {inspectedState.items.length > 5 && (
                <span className="text-[#8A6D79]">
                  +{inspectedState.items.length - 5} more items
                </span>
              )}
            </div>
          </div>

          {Object.keys(inspectedState.transitions).length > 0 && (
            <div className="shrink-0 flex flex-wrap gap-1.5 font-mono text-[11px]">
              {Object.entries(inspectedState.transitions).map(([sym, tgt]) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleSelect(tgt)}
                  className="px-2 py-0.5 rounded bg-[#F8F0E6] border border-[#E3D1C0] text-[#4C3640] hover:border-[#C93B72] hover:text-[#9D2454] cursor-pointer"
                >
                  {sym} → <strong className="text-[#B42A60]">{states[tgt]?.label}</strong>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
