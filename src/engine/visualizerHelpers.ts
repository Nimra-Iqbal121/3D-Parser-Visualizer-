import { LRState, ParseStep } from './types';

export interface InputTapeItem {
  token: string;
  status: 'matched' | 'current' | 'upcoming';
  index: number;
}

export interface StackDiff {
  commonPrefixLength: number;
  popped: string[];
  pushed: string[];
}

export interface OperationVisualMeta {
  badge: string;
  verb: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  accentHex: string;
}

export interface PositionedLRNode {
  state: LRState;
  layer: number;
  row: number;
  x: number;
  y: number;
  isStart: boolean;
  isAccept: boolean;
  isReduceOnly: boolean;
  isMerged: boolean;
}

export interface PositionedLREdge {
  id: string;
  fromId: number;
  toId: number;
  symbols: string[];
  isSelfLoop: boolean;
  isBackward: boolean;
}

export interface LRAutomatonLayout {
  nodes: PositionedLRNode[];
  edges: PositionedLREdge[];
  width: number;
  height: number;
}

/**
 * Splits the full input token stream into matched (consumed), current (lookahead), and upcoming tokens
 * by aligning the current remainingInput suffix against the initial token stream.
 */
export function computeInputTape(
  initialRemaining: string[],
  currentRemaining: string[]
): InputTapeItem[] {
  const full = initialRemaining.length > 0 ? initialRemaining : currentRemaining;
  if (full.length === 0) return [];

  const matchedCount = Math.max(0, Math.min(full.length, full.length - currentRemaining.length));
  return full.map((token, index) => {
    if (index < matchedCount) {
      return { token, status: 'matched', index };
    }
    if (index === matchedCount && currentRemaining.length > 0) {
      return { token: currentRemaining[0], status: 'current', index };
    }
    const remIdx = index - matchedCount;
    return {
      token: currentRemaining[remIdx] ?? token,
      status: 'upcoming',
      index,
    };
  });
}

/**
 * Computes what symbols were popped and pushed between the previous step's stack and the current stack.
 */
export function computeStackDiff(
  prevStack: string[] | null | undefined,
  currentStack: string[]
): StackDiff {
  if (!prevStack) {
    return {
      commonPrefixLength: 0,
      popped: [],
      pushed: [...currentStack],
    };
  }

  let common = 0;
  const maxCommon = Math.min(prevStack.length, currentStack.length);
  while (common < maxCommon && prevStack[common] === currentStack[common]) {
    common++;
  }

  return {
    commonPrefixLength: common,
    popped: prevStack.slice(common),
    pushed: currentStack.slice(common),
  };
}

/**
 * Returns crisp pink/beige semantic styling and plain-English labels for every parser step operation.
 */
export function getOperationMeta(op: ParseStep['operation'] | undefined): OperationVisualMeta {
  switch (op) {
    case 'match':
      return {
        badge: 'MATCH',
        verb: 'Matched input token',
        bgClass: 'bg-[#E9F6F0]',
        borderClass: 'border-[#9AD4BC]',
        textClass: 'text-[#166A4A]',
        accentHex: '#166A4A',
      };
    case 'expand':
      return {
        badge: 'EXPAND',
        verb: 'Applied grammar rule',
        bgClass: 'bg-[#FCEAF1]',
        borderClass: 'border-[#E6A9C2]',
        textClass: 'text-[#9D2454]',
        accentHex: '#C93B72',
      };
    case 'shift':
      return {
        badge: 'SHIFT',
        verb: 'Shifted token onto stack',
        bgClass: 'bg-[#FCEAF1]',
        borderClass: 'border-[#E6A9C2]',
        textClass: 'text-[#9D2454]',
        accentHex: '#C93B72',
      };
    case 'reduce':
      return {
        badge: 'REDUCE',
        verb: 'Reduced handle to non-terminal',
        bgClass: 'bg-[#F3E5EE]',
        borderClass: 'border-[#D5B0C7]',
        textClass: 'text-[#732A53]',
        accentHex: '#7E2F5C',
      };
    case 'call':
      return {
        badge: 'CALL',
        verb: 'Entered recursive procedure',
        bgClass: 'bg-[#FCEAF1]',
        borderClass: 'border-[#E6A9C2]',
        textClass: 'text-[#9D2454]',
        accentHex: '#C93B72',
      };
    case 'return':
      return {
        badge: 'RETURN',
        verb: 'Completed procedure call',
        bgClass: 'bg-[#E9F6F0]',
        borderClass: 'border-[#9AD4BC]',
        textClass: 'text-[#166A4A]',
        accentHex: '#166A4A',
      };
    case 'backtrack':
      return {
        badge: 'BACKTRACK',
        verb: 'Trying next grammar alternative',
        bgClass: 'bg-[#FBF1E3]',
        borderClass: 'border-[#E0C299]',
        textClass: 'text-[#8C5A1B]',
        accentHex: '#9A6320',
      };
    case 'accept':
      return {
        badge: 'ACCEPTED',
        verb: 'Input string is valid',
        bgClass: 'bg-[#E5F6EE]',
        borderClass: 'border-[#7BC8A8]',
        textClass: 'text-[#115E41]',
        accentHex: '#166A4A',
      };
    case 'error':
      return {
        badge: 'SYNTAX ERROR',
        verb: 'Parsing halted with error',
        bgClass: 'bg-[#FDECEF]',
        borderClass: 'border-[#EBA4B5]',
        textClass: 'text-[#A61B38]',
        accentHex: '#B51D3D',
      };
    default:
      return {
        badge: 'START',
        verb: 'Initialized parser state',
        bgClass: 'bg-[#F4E9DD]',
        borderClass: 'border-[#DECAB6]',
        textClass: 'text-[#4C3640]',
        accentHex: '#8F3A68',
      };
  }
}

/**
 * Computes a clean, non-overlapping left-to-right layered BFS layout for an LR DFA state graph.
 * Groups parallel transitions between the same pair of states into a single labeled edge.
 */
export function layoutLRAutomaton2D(states: LRState[]): LRAutomatonLayout {
  if (states.length === 0) {
    return { nodes: [], edges: [], width: 520, height: 260 };
  }

  // 1. Assign BFS layers from state 0 (I0)
  const layerMap = new Map<number, number>();
  const queue: number[] = [];
  const startId = states[0].id;
  layerMap.set(startId, 0);
  queue.push(startId);

  const stateById = new Map<number, LRState>();
  for (const st of states) stateById.set(st.id, st);

  while (queue.length > 0) {
    const curId = queue.shift()!;
    const curLayer = layerMap.get(curId)!;
    const st = stateById.get(curId);
    if (!st) continue;
    for (const targetId of Object.values(st.transitions)) {
      if (!layerMap.has(targetId) && stateById.has(targetId)) {
        layerMap.set(targetId, curLayer + 1);
        queue.push(targetId);
      }
    }
  }

  // Ensure any unreachable state still receives a valid layer
  let maxLayer = 0;
  for (const l of layerMap.values()) maxLayer = Math.max(maxLayer, l);
  for (const st of states) {
    if (!layerMap.has(st.id)) {
      maxLayer++;
      layerMap.set(st.id, maxLayer);
    }
  }

  // Group states by layer
  const columns = new Map<number, LRState[]>();
  for (const st of states) {
    const l = layerMap.get(st.id) ?? 0;
    const arr = columns.get(l) ?? [];
    arr.push(st);
    columns.set(l, arr);
  }

  const colSpacing = 148;
  const rowSpacing = 98;
  const padX = 76;
  const padY = 64;

  let maxRows = 1;
  for (const col of columns.values()) {
    maxRows = Math.max(maxRows, col.length);
  }

  const totalHeight = Math.max(240, (maxRows - 1) * rowSpacing + padY * 2);
  const totalCols = Math.max(...columns.keys()) + 1;
  const totalWidth = Math.max(520, (totalCols - 1) * colSpacing + padX * 2);

  const nodePos = new Map<number, { x: number; y: number; layer: number }>();
  const positionedNodes: PositionedLRNode[] = [];

  for (let l = 0; l < totalCols; l++) {
    const col = columns.get(l) ?? [];
    const colHeight = (col.length - 1) * rowSpacing;
    const startY = (totalHeight - colHeight) / 2;

    col.forEach((st, rowIdx) => {
      const x = padX + l * colSpacing;
      const y = startY + rowIdx * rowSpacing;
      nodePos.set(st.id, { x, y, layer: l });

      const isAccept = st.items.some(
        (it) => it.prodId === 0 && it.dot === it.rhs.length
      );
      const isReduceOnly =
        !isAccept &&
        st.items.length > 0 &&
        st.items.every((it) => it.dot === it.rhs.length);
      const isMerged = Boolean(st.mergedFrom && st.mergedFrom.length > 1);

      positionedNodes.push({
        state: st,
        layer: l,
        row: rowIdx,
        x,
        y,
        isStart: st.id === startId,
        isAccept,
        isReduceOnly,
        isMerged,
      });
    });
  }

  // Aggregate transitions sharing (fromId, toId)
  const edgeMap = new Map<string, PositionedLREdge>();
  for (const st of states) {
    const fromMeta = nodePos.get(st.id);
    if (!fromMeta) continue;
    for (const [sym, targetId] of Object.entries(st.transitions)) {
      const toMeta = nodePos.get(targetId);
      if (!toMeta) continue;
      const key = `${st.id}->${targetId}`;
      const existing = edgeMap.get(key);
      if (existing) {
        if (!existing.symbols.includes(sym)) existing.symbols.push(sym);
      } else {
        edgeMap.set(key, {
          id: key,
          fromId: st.id,
          toId: targetId,
          symbols: [sym],
          isSelfLoop: st.id === targetId,
          isBackward: toMeta.layer <= fromMeta.layer && st.id !== targetId,
        });
      }
    }
  }

  return {
    nodes: positionedNodes,
    edges: Array.from(edgeMap.values()),
    width: totalWidth,
    height: totalHeight,
  };
}
