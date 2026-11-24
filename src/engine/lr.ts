import {
  cloneTree,
  computeFirstOfSequence,
  computeFirstSets,
  computeFollowSets,
  formatProduction,
  parseGrammarText,
  tokenizeInput,
} from './grammar';
import {
  EOF_SYMBOL,
  EPSILON,
  LRActionEntry,
  LRItem,
  LRResult,
  LRState,
  LRTableCell,
  ParsedGrammar,
  ParseStep,
  ParseTreeNode,
  ParserDiagnostic,
  Production,
} from './types';

function itemCoreKey(prodId: number, dot: number): string {
  return `${prodId}@${dot}`;
}

function stateSignature0(items: LRItem[]): string {
  return items
    .map((it) => itemCoreKey(it.prodId, it.dot))
    .sort()
    .join('|');
}

function stateSignature1(items: LRItem[]): string {
  return items
    .map((it) => `${itemCoreKey(it.prodId, it.dot)}/${[...it.lookaheads].sort().join(',')}`)
    .sort()
    .join('|');
}

/**
 * Computes LR(0) closure of a kernel item set.
 */
function closure0(
  kernel: LRItem[],
  prods: Production[],
  ntSet: Set<string>
): LRItem[] {
  const map = new Map<string, LRItem>();
  for (const it of kernel) {
    const key = itemCoreKey(it.prodId, it.dot);
    if (!map.has(key)) map.set(key, { ...it, lookaheads: [] });
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const item of Array.from(map.values())) {
      const nextSym = item.rhs[item.dot];
      if (nextSym && ntSet.has(nextSym)) {
        for (const p of prods) {
          if (p.lhs === nextSym) {
            const key = itemCoreKey(p.id, 0);
            if (!map.has(key)) {
              map.set(key, {
                prodId: p.id,
                lhs: p.lhs,
                rhs: p.rhs,
                dot: 0,
                lookaheads: [],
              });
              changed = true;
            }
          }
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.prodId - b.prodId || a.dot - b.dot);
}

/**
 * Computes LR(1) closure (grouping items with identical cores by combining their lookahead sets).
 */
function closure1(
  kernel: LRItem[],
  prods: Production[],
  ntSet: Set<string>,
  firstSets: Record<string, string[]>
): LRItem[] {
  const map = new Map<string, { prodId: number; lhs: string; rhs: string[]; dot: number; la: Set<string> }>();

  const upsert = (prod: { id?: number; prodId?: number; lhs: string; rhs: string[] }, dot: number, lookaheads: string[]) => {
    const pid = prod.prodId ?? prod.id ?? 0;
    const key = itemCoreKey(pid, dot);
    let entry = map.get(key);
    let added = false;
    if (!entry) {
      entry = { prodId: pid, lhs: prod.lhs, rhs: prod.rhs, dot, la: new Set() };
      map.set(key, entry);
      added = true;
    }
    for (const l of lookaheads) {
      if (!entry.la.has(l)) {
        entry.la.add(l);
        added = true;
      }
    }
    return added;
  };

  for (const it of kernel) {
    upsert(it, it.dot, it.lookaheads);
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < 500) {
    changed = false;
    guard++;
    for (const entry of Array.from(map.values())) {
      const B = entry.rhs[entry.dot];
      if (!B || !ntSet.has(B)) continue;

      const beta = entry.rhs.slice(entry.dot + 1);
      const lookaheadList: string[] = [];
      for (const a of entry.la) {
        const firstBetaA = computeFirstOfSequence([...beta, a], firstSets, ntSet);
        for (const sym of firstBetaA) {
          if (sym !== EPSILON && !lookaheadList.includes(sym)) {
            lookaheadList.push(sym);
          }
        }
      }

      for (const p of prods) {
        if (p.lhs === B) {
          if (upsert(p, 0, lookaheadList)) {
            changed = true;
          }
        }
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.prodId - b.prodId || a.dot - b.dot)
    .map((e) => ({
      prodId: e.prodId,
      lhs: e.lhs,
      rhs: e.rhs,
      dot: e.dot,
      lookaheads: Array.from(e.la).sort(),
    }));
}

function buildLR0Automaton(
  augProds: Production[],
  ntSet: Set<string>,
  allSymbols: string[]
): LRState[] {
  const startItem: LRItem = {
    prodId: augProds[0].id,
    lhs: augProds[0].lhs,
    rhs: augProds[0].rhs,
    dot: 0,
    lookaheads: [],
  };

  const state0Items = closure0([startItem], augProds, ntSet);
  const states: LRState[] = [
    { id: 0, label: 'I0', items: state0Items, transitions: {} },
  ];
  const sigToId = new Map<string, number>([[stateSignature0(state0Items), 0]]);

  const MAX_STATES = 90;
  for (let i = 0; i < states.length && states.length < MAX_STATES; i++) {
    const state = states[i];
    for (const sym of allSymbols) {
      const moved = state.items
        .filter((it) => it.rhs[it.dot] === sym)
        .map((it) => ({ ...it, dot: it.dot + 1 }));
      if (moved.length === 0) continue;

      const closed = closure0(moved, augProds, ntSet);
      const sig = stateSignature0(closed);
      let targetId = sigToId.get(sig);
      if (targetId === undefined) {
        targetId = states.length;
        sigToId.set(sig, targetId);
        states.push({
          id: targetId,
          label: `I${targetId}`,
          items: closed,
          transitions: {},
        });
      }
      state.transitions[sym] = targetId;
    }
  }

  return states;
}

function buildLR1Automaton(
  augProds: Production[],
  ntSet: Set<string>,
  allSymbols: string[],
  firstSets: Record<string, string[]>
): LRState[] {
  const startItem: LRItem = {
    prodId: augProds[0].id,
    lhs: augProds[0].lhs,
    rhs: augProds[0].rhs,
    dot: 0,
    lookaheads: [EOF_SYMBOL],
  };

  const state0Items = closure1([startItem], augProds, ntSet, firstSets);
  const states: LRState[] = [
    { id: 0, label: 'I0', items: state0Items, transitions: {} },
  ];
  const sigToId = new Map<string, number>([[stateSignature1(state0Items), 0]]);

  const MAX_STATES = 110;
  for (let i = 0; i < states.length && states.length < MAX_STATES; i++) {
    const state = states[i];
    for (const sym of allSymbols) {
      const moved = state.items
        .filter((it) => it.rhs[it.dot] === sym)
        .map((it) => ({ ...it, dot: it.dot + 1, lookaheads: [...it.lookaheads] }));
      if (moved.length === 0) continue;

      const closed = closure1(moved, augProds, ntSet, firstSets);
      const sig = stateSignature1(closed);
      let targetId = sigToId.get(sig);
      if (targetId === undefined) {
        targetId = states.length;
        sigToId.set(sig, targetId);
        states.push({
          id: targetId,
          label: `I${targetId}`,
          items: closed,
          transitions: {},
        });
      }
      state.transitions[sym] = targetId;
    }
  }

  return states;
}

/**
 * Merges CLR(1) states that share identical LR(0) cores to produce LALR(1) states,
 * unioning their lookahead sets and recording every merged group explicitly.
 */
function mergeCLRToLALR(clrStates: LRState[]): {
  states: LRState[];
  mergeGroups: Array<{ mergedId: number; originalIds: number[]; coreSignature: string }>;
} {
  const coreOrder: string[] = [];
  const coreBuckets = new Map<string, LRState[]>();

  for (const st of clrStates) {
    const coreSig = stateSignature0(st.items);
    if (!coreBuckets.has(coreSig)) {
      coreBuckets.set(coreSig, []);
      coreOrder.push(coreSig);
    }
    coreBuckets.get(coreSig)!.push(st);
  }

  const oldToNew = new Map<number, number>();
  const mergedStates: LRState[] = [];
  const mergeGroups: Array<{ mergedId: number; originalIds: number[]; coreSignature: string }> = [];

  coreOrder.forEach((coreSig, newId) => {
    const group = coreBuckets.get(coreSig)!;
    const originalIds = group.map((g) => g.id);
    for (const old of group) oldToNew.set(old.id, newId);

    // Union lookaheads for matching cores
    const itemMap = new Map<string, LRItem>();
    for (const st of group) {
      for (const it of st.items) {
        const key = itemCoreKey(it.prodId, it.dot);
        const existing = itemMap.get(key);
        if (!existing) {
          itemMap.set(key, { ...it, lookaheads: [...it.lookaheads] });
        } else {
          const unionSet = new Set([...existing.lookaheads, ...it.lookaheads]);
          existing.lookaheads = Array.from(unionSet).sort();
        }
      }
    }

    const label =
      originalIds.length > 1 ? `I${originalIds.join('')}` : `I${originalIds[0]}`;

    mergedStates.push({
      id: newId,
      label,
      items: Array.from(itemMap.values()).sort((a, b) => a.prodId - b.prodId || a.dot - b.dot),
      transitions: {},
      mergedFrom: originalIds,
    });

    if (originalIds.length > 1) {
      mergeGroups.push({
        mergedId: newId,
        originalIds,
        coreSignature: coreSig,
      });
    }
  });

  // Remap transitions
  for (const st of clrStates) {
    const newFrom = oldToNew.get(st.id)!;
    for (const [sym, oldTo] of Object.entries(st.transitions)) {
      const newTo = oldToNew.get(oldTo)!;
      mergedStates[newFrom].transitions[sym] = newTo;
    }
  }

  return { states: mergedStates, mergeGroups };
}

/**
 * Executes any of the four LR-family parsers: LR(0), SLR(1), CLR(1), or LALR(1).
 */
export function runLRParser(
  variant: 'lr0' | 'slr1' | 'clr1' | 'lalr1',
  grammarText: string,
  inputText: string,
  explicitStartSymbol?: string
): LRResult {
  const { grammar, diagnostics: parseDiags } = parseGrammarText(grammarText, explicitStartSymbol);
  const diagnostics: ParserDiagnostic[] = [...parseDiags];

  if (!grammar) {
    return {
      variant,
      grammar: null,
      augmentedProductions: [],
      firstSets: {},
      followSets: {},
      states: [],
      actionTable: {},
      gotoTable: {},
      diagnostics,
      steps: [],
      accepted: false,
      statusMessage: `Grammar syntax errors prevented ${variant.toUpperCase()} construction.`,
    };
  }

  // Create augmented start symbol S'
  let augStart = `${grammar.startSymbol}'`;
  while (grammar.nonTerminals.includes(augStart)) augStart += "'";

  const augmentedProductions: Production[] = [
    { id: 0, lhs: augStart, rhs: [grammar.startSymbol], rawLine: 0 },
    ...grammar.productions.map((p, idx) => ({ ...p, id: idx + 1 })),
  ];

  const augGrammar: ParsedGrammar = {
    productions: augmentedProductions,
    startSymbol: augStart,
    nonTerminals: [augStart, ...grammar.nonTerminals],
    terminals: grammar.terminals,
    rawText: grammar.rawText,
  };

  const firstSets = computeFirstSets(augGrammar);
  const followSets = computeFollowSets(augGrammar, firstSets);

  const ntSet = new Set(augGrammar.nonTerminals);
  const termCols = [...grammar.terminals, EOF_SYMBOL];
  const gotoCols = [...grammar.nonTerminals];
  const allSymbols = [...grammar.terminals, ...grammar.nonTerminals];

  let states: LRState[] = [];
  let clrStateCount: number | undefined;
  let mergeGroups: Array<{ mergedId: number; originalIds: number[]; coreSignature: string }> | undefined;

  if (variant === 'lr0' || variant === 'slr1') {
    states = buildLR0Automaton(augmentedProductions, ntSet, allSymbols);
  } else if (variant === 'clr1') {
    states = buildLR1Automaton(augmentedProductions, ntSet, allSymbols, firstSets);
  } else {
    const clrStates = buildLR1Automaton(augmentedProductions, ntSet, allSymbols, firstSets);
    clrStateCount = clrStates.length;
    const merged = mergeCLRToLALR(clrStates);
    states = merged.states;
    mergeGroups = merged.mergeGroups;
  }

  // Build ACTION and GOTO tables
  const actionTable: Record<number, Record<string, LRTableCell>> = {};
  const gotoTable: Record<number, Record<string, number>> = {};

  for (const st of states) {
    actionTable[st.id] = {};
    gotoTable[st.id] = {};
    for (const t of termCols) {
      actionTable[st.id][t] = { actions: [], hasConflict: false };
    }
  }

  const pushAction = (stateId: number, term: string, entry: LRActionEntry) => {
    const cell = actionTable[stateId]?.[term];
    if (!cell) return;
    if (!cell.actions.some((a) => a.type === entry.type && a.target === entry.target)) {
      cell.actions.push(entry);
    }
    if (cell.actions.length > 1) {
      cell.hasConflict = true;
      const hasShift = cell.actions.some((a) => a.type === 'shift');
      const reduceCount = cell.actions.filter((a) => a.type === 'reduce').length;
      if (hasShift && reduceCount >= 1) cell.conflictType = 'Shift/Reduce';
      else if (reduceCount >= 2) cell.conflictType = 'Reduce/Reduce';
      else cell.conflictType = 'Shift/Reduce';
    }
  };

  for (const st of states) {
    // Shift & GOTO transitions
    for (const [sym, targetId] of Object.entries(st.transitions)) {
      if (ntSet.has(sym)) {
        gotoTable[st.id][sym] = targetId;
      } else {
        pushAction(st.id, sym, { type: 'shift', target: targetId, label: `s${targetId}` });
      }
    }

    // Reduce & Accept items (dot at end of RHS)
    for (const item of st.items) {
      if (item.dot !== item.rhs.length) continue;

      if (item.prodId === 0) {
        pushAction(st.id, EOF_SYMBOL, { type: 'accept', target: 0, label: 'acc' });
        continue;
      }

      const reduceEntry: LRActionEntry = {
        type: 'reduce',
        target: item.prodId,
        label: `r${item.prodId}`,
      };

      if (variant === 'lr0') {
        // LR(0) places reduce in ALL terminal columns (including $)
        for (const t of termCols) {
          pushAction(st.id, t, reduceEntry);
        }
      } else if (variant === 'slr1') {
        // SLR(1) places reduce only for terminals in FOLLOW(item.lhs)
        for (const t of followSets[item.lhs] || []) {
          pushAction(st.id, t, reduceEntry);
        }
      } else {
        // CLR(1) and LALR(1) place reduce strictly for the item's lookaheads
        for (const t of item.lookaheads) {
          pushAction(st.id, t, reduceEntry);
        }
      }
    }
  }

  // Record table conflicts clearly
  let conflictCount = 0;
  const variantLabel = variant.toUpperCase();
  const nextStrongerHint =
    variant === 'lr0'
      ? 'Try SLR(1), LALR(1), or CLR(1) which use lookahead sets to restrict reduce placements.'
      : variant === 'slr1'
      ? 'Try LALR(1) or CLR(1), which track context-sensitive LR(1) lookaheads instead of global FOLLOW sets.'
      : variant === 'lalr1'
      ? 'If the conflict was introduced by merging identical LR(0) cores, try CLR(1). Otherwise, the grammar itself may be ambiguous.'
      : 'A conflict in CLR(1) usually means the grammar is ambiguous or requires more than 1 token of lookahead (LR(k)).';

  for (const st of states) {
    for (const t of termCols) {
      const cell = actionTable[st.id][t];
      if (cell.hasConflict) {
        conflictCount++;
        const actionDesc = cell.actions
          .map((a) =>
            a.type === 'reduce'
              ? `${a.label} (${formatProduction(augmentedProductions[a.target])})`
              : a.label
          )
          .join(' vs ');
        diagnostics.push({
          id: `lr-conflict-${st.id}-${t}`,
          code: cell.conflictType === 'Reduce/Reduce' ? 'LR_RR_CONFLICT' : 'LR_SR_CONFLICT',
          category: 'parsing-conflict',
          severity: 'error',
          title: `${cell.conflictType} Conflict in State ${st.label} on "${t}"`,
          location: `ACTION[${st.label}, "${t}"]`,
          violatedRule: `A deterministic ${variantLabel} parser requires at most one action per ACTION[state, terminal] cell.`,
          explanation: `In state ${st.label} with lookahead "${t}", the table has conflicting actions: ${actionDesc}.`,
          suggestion: nextStrongerHint,
          noteUniqueness:
            'Resolving Shift/Reduce or Reduce/Reduce conflicts depends on intended operator precedence/associativity or upgrading to a stronger LR family member.',
        });
      }
    }
  }

  if (parseDiags.some((d) => d.severity === 'error')) {
    return {
      variant,
      grammar,
      augmentedProductions,
      firstSets,
      followSets,
      states,
      clrStateCount,
      mergeGroups,
      actionTable,
      gotoTable,
      diagnostics,
      steps: [],
      accepted: false,
      statusMessage: `Fix grammar definition errors before running ${variantLabel}.`,
    };
  }

  // Tokenize input and execute LR shift-reduce automaton
  // Even when a conflict exists, we run using deterministic conflict-preference (Shift over Reduce, lowest prod id)
  // only if zero conflicts OR we stop/flag clearly: let's follow strict compiler behavior—if conflicts exist,
  // still report the conflict clearly AND let the user inspect states/tables; only refuse execution if invalid grammar,
  // or execute with conflict warning? Better: refuse deterministic execution when conflictCount > 0 so students see
  // WHY LR(0) fails where SLR(1) succeeds! Let's check: the prompt says:
  // "Conflict detection", "Grammars that demonstrate parsing conflicts", "It should explain what went wrong".
  // Returning the complete DFA states + ACTION/GOTO tables with highlighted conflict cells and stopping execution
  // makes LR(0) vs SLR(1) vs CLR(1) vs LALR(1) differences crystal clear!
  if (conflictCount > 0) {
    return {
      variant,
      grammar,
      augmentedProductions,
      firstSets,
      followSets,
      states,
      clrStateCount,
      mergeGroups,
      actionTable,
      gotoTable,
      diagnostics,
      steps: [],
      accepted: false,
      statusMessage: `Grammar is not ${variantLabel}: ${conflictCount} conflict cell(s) detected in ACTION table.`,
    };
  }

  const { tokens, diagnostics: lexDiags } = tokenizeInput(inputText, grammar);
  diagnostics.push(...lexDiags);

  const stateStack: number[] = [0];
  const symbolStack: string[] = [EOF_SYMBOL];
  const nodeStack: ParseTreeNode[] = [];
  const steps: ParseStep[] = [];
  let cursor = 0;
  let stepNum = 0;
  let nodeCounter = 0;

  const getCurrentTree = (): ParseTreeNode | null => {
    if (nodeStack.length === 0) return null;
    if (nodeStack.length === 1) return cloneTree(nodeStack[0]);
    return {
      id: 'lr-forest-root',
      symbol: 'Reduced Subtrees',
      isTerminal: false,
      status: 'pending',
      children: nodeStack.map((n) => cloneTree(n)),
    };
  };

  const formatCombinedStack = (): string[] => {
    const out: string[] = [];
    for (let i = 0; i < stateStack.length; i++) {
      if (i > 0 && symbolStack[i]) out.push(symbolStack[i]);
      out.push(`S${stateStack[i]}`);
    }
    return out;
  };

  const pushStep = (
    operation: ParseStep['operation'],
    actionLabel: string,
    explanation: string,
    opts?: {
      production?: string;
      activeState?: number;
      fromState?: number;
      transitionSymbol?: string;
      highlightCount?: number;
      status?: ParseStep['status'];
    }
  ) => {
    const remaining = tokens.slice(cursor);
    steps.push({
      stepNumber: stepNum++,
      operation,
      stack: formatCombinedStack(),
      stateStack: [...stateStack],
      remainingInput: remaining,
      currentToken: remaining[0] ?? EOF_SYMBOL,
      production: opts?.production,
      actionLabel,
      explanation,
      activeState: opts?.activeState ?? stateStack[stateStack.length - 1],
      fromState: opts?.fromState,
      transitionSymbol: opts?.transitionSymbol,
      treeSnapshot: getCurrentTree(),
      highlightCount: opts?.highlightCount ?? 1,
      status: opts?.status ?? 'running',
    });
  };

  pushStep(
    'init',
    `Initialize ${variantLabel} at State ${states[0].label}`,
    `Push initial state 0 onto the LR stack. Lookahead is "${tokens[0]}".`,
    { activeState: 0 }
  );

  let accepted = false;
  const MAX_STEPS = 250;

  while (stepNum < MAX_STEPS) {
    const currState = stateStack[stateStack.length - 1];
    const lookahead = tokens[cursor] ?? EOF_SYMBOL;
    const cell = actionTable[currState]?.[lookahead];

    if (!cell || cell.actions.length === 0) {
      const expected = termCols.filter((t) => actionTable[currState]?.[t]?.actions.length > 0);
      const stateLabel = states[currState]?.label ?? `I${currState}`;
      const onlyExpectsEof =
        expected.length === 1 && expected[0] === EOF_SYMBOL && lookahead !== EOF_SYMBOL;
      const matchedPrefix = tokens.slice(0, cursor).join(' ');
      const leftover = tokens.slice(cursor, -1).join(' ');

      if (!diagnostics.some((d) => d.code === 'LEX_UNKNOWN_TOKEN' || d.code === 'SYN_PARENS')) {
        if (onlyExpectsEof && matchedPrefix) {
          diagnostics.push({
            id: `lr-syntax-err-${stepNum}`,
            code: 'LR_SYNTAX_ERROR',
            category: 'runtime-error',
            severity: 'error',
            title: `Extra Trailing Input "${lookahead}" After Complete "${grammar.startSymbol}"`,
            location: `Input Token #${cursor + 1} ("${lookahead}") in State ${stateLabel}`,
            violatedRule: `State ${stateLabel} has already matched a complete "${grammar.startSymbol}" and only accepts end-of-input ($).`,
            explanation: `The prefix "${matchedPrefix}" already reduced completely to "${grammar.startSymbol}" (State ${stateLabel} expects "$"). The remaining token(s) "${leftover}" go beyond what this grammar derives.`,
            suggestion: `Remove the extra trailing token(s) after "${matchedPrefix}" (use "${matchedPrefix}"), or modify your grammar if you want to allow repeating patterns.`,
            correctedInput: matchedPrefix,
          });
        } else if (lookahead === EOF_SYMBOL) {
          diagnostics.push({
            id: `lr-syntax-err-${stepNum}`,
            code: 'LR_SYNTAX_ERROR',
            category: 'runtime-error',
            severity: 'error',
            title: `Unexpected End of Input ($) in State ${stateLabel}`,
            location: `End of Input (after ${cursor} token${cursor === 1 ? '' : 's'})`,
            violatedRule: `ACTION[${stateLabel}, "$"] must be defined to finish parsing.`,
            explanation: `The input ended before "${grammar.startSymbol}" could be completely derived. State ${stateLabel} still needs more tokens to complete the active rule.`,
            suggestion: `Add one of { ${expected.join(', ')} } to complete the expression.`,
          });
        } else {
          diagnostics.push({
            id: `lr-syntax-err-${stepNum}`,
            code: 'LR_SYNTAX_ERROR',
            category: 'runtime-error',
            severity: 'error',
            title: `Syntax Error in State ${stateLabel} on "${lookahead}"`,
            location: `Input Token #${cursor + 1} ("${lookahead}")`,
            violatedRule: `ACTION[${stateLabel}, "${lookahead}"] must be defined.`,
            explanation: `In DFA state ${stateLabel}, there is no valid Shift, Reduce, or Accept action for lookahead "${lookahead}".`,
            suggestion: `Expected one of: { ${expected.join(', ')} } at this point in the input.`,
          });
        }
      }
      pushStep(
        'error',
        onlyExpectsEof
          ? `Error: Extra token "${lookahead}" after complete ${grammar.startSymbol}`
          : `Error: ACTION[${stateLabel}, ${lookahead}] empty`,
        onlyExpectsEof && matchedPrefix
          ? `State ${stateLabel} already matched a complete "${grammar.startSymbol}" on "${matchedPrefix}" and expected "$", not "${lookahead}".`
          : `No valid transition or reduction for "${lookahead}" in state ${stateLabel}.`,
        { activeState: currState, status: 'rejected' }
      );
      break;
    }

    const action = cell.actions[0];

    if (action.type === 'shift') {
      const prevState = currState;
      symbolStack.push(lookahead);
      stateStack.push(action.target);
      nodeStack.push({
        id: `lr-${++nodeCounter}`,
        symbol: lookahead,
        isTerminal: true,
        children: [],
        status: 'active',
      });
      cursor++;

      pushStep(
        'shift',
        `Shift "${lookahead}" → ${states[action.target].label} (${action.label})`,
        `ACTION[${states[prevState].label}, "${lookahead}"] = ${action.label}. Shift token "${lookahead}" and transition to state ${states[action.target].label}.`,
        {
          activeState: action.target,
          fromState: prevState,
          transitionSymbol: lookahead,
          highlightCount: 2,
        }
      );
    } else if (action.type === 'reduce') {
      const prod = augmentedProductions[action.target];
      const prodLabel = formatProduction(prod);
      const popCount = prod.rhs.length;

      const poppedChildren: ParseTreeNode[] = [];
      for (let i = 0; i < popCount; i++) {
        symbolStack.pop();
        stateStack.pop();
        const child = nodeStack.pop();
        if (child) poppedChildren.unshift({ ...child, status: 'matched' });
      }

      if (popCount === 0) {
        poppedChildren.push({
          id: `lr-${++nodeCounter}`,
          symbol: EPSILON,
          isTerminal: true,
          children: [],
          status: 'matched',
        });
      }

      const uncoveredState = stateStack[stateStack.length - 1];
      const gotoState = gotoTable[uncoveredState]?.[prod.lhs];

      if (gotoState === undefined) {
        pushStep(
          'error',
          `Error: GOTO[${states[uncoveredState]?.label}, ${prod.lhs}] undefined`,
          `After popping ${popCount} symbol(s) for ${prodLabel}, no GOTO transition exists for "${prod.lhs}".`,
          { activeState: uncoveredState, status: 'rejected' }
        );
        break;
      }

      symbolStack.push(prod.lhs);
      stateStack.push(gotoState);
      nodeStack.push({
        id: `lr-${++nodeCounter}`,
        symbol: prod.lhs,
        isTerminal: false,
        status: 'reduced',
        productionLabel: prodLabel,
        children: poppedChildren,
      });

      pushStep(
        'reduce',
        `Reduce ${prodLabel} (${action.label}), GOTO ${states[gotoState].label}`,
        `Pop ${popCount} symbol(s) & state(s) for ${prodLabel}, uncover state ${states[uncoveredState].label}, push "${prod.lhs}", and follow GOTO[${states[uncoveredState].label}, ${prod.lhs}] = ${states[gotoState].label}.`,
        {
          production: prodLabel,
          activeState: gotoState,
          fromState: uncoveredState,
          transitionSymbol: prod.lhs,
          highlightCount: 2,
        }
      );
    } else if (action.type === 'accept') {
      accepted = true;
      if (nodeStack[0]) nodeStack[0].status = 'matched';
      pushStep(
        'accept',
        `Accept (${variantLabel})`,
        `ACTION[${states[currState].label}, "$"] = acc. Input is accepted as a valid sentence of "${grammar.startSymbol}".`,
        { activeState: currState, status: 'accepted' }
      );
      break;
    }
  }

  return {
    variant,
    grammar,
    augmentedProductions,
    firstSets,
    followSets,
    states,
    clrStateCount,
    mergeGroups,
    actionTable,
    gotoTable,
    diagnostics,
    steps,
    accepted,
    statusMessage: accepted
      ? `Input accepted by ${variantLabel} in ${steps.length - 1} steps.`
      : `Input rejected by ${variantLabel} parser.`,
  };
}
