import {
  cloneTree,
  formatProduction,
  parseGrammarText,
  tokenizeInput,
} from './grammar';
import {
  EOF_SYMBOL,
  OPPResult,
  ParsedGrammar,
  ParseStep,
  ParseTreeNode,
  ParserDiagnostic,
  PrecedenceRel,
} from './types';

// Standard arithmetic operator precedence and associativity for resolving
// ambiguous operator-expression grammars like E -> E + E | E * E | ( E ) | id
const DEFAULT_OPERATOR_PRECEDENCE: Record<string, { prec: number; assoc: 'left' | 'right' }> = {
  '=': { prec: 1, assoc: 'right' },
  '||': { prec: 2, assoc: 'left' },
  '&&': { prec: 3, assoc: 'left' },
  '+': { prec: 10, assoc: 'left' },
  '-': { prec: 10, assoc: 'left' },
  '*': { prec: 20, assoc: 'left' },
  '/': { prec: 20, assoc: 'left' },
  '%': { prec: 20, assoc: 'left' },
  '^': { prec: 30, assoc: 'right' },
  '**': { prec: 30, assoc: 'right' },
};

export function computeFirstVT(grammar: ParsedGrammar): Record<string, string[]> {
  const ntSet = new Set(grammar.nonTerminals);
  const fvt: Record<string, Set<string>> = {};
  for (const nt of grammar.nonTerminals) fvt[nt] = new Set();

  let changed = true;
  let guard = 0;
  while (changed && guard < 200) {
    changed = false;
    guard++;
    for (const p of grammar.productions) {
      if (p.rhs.length === 0) continue;
      const first = p.rhs[0];
      if (!ntSet.has(first)) {
        if (!fvt[p.lhs].has(first)) {
          fvt[p.lhs].add(first);
          changed = true;
        }
      } else {
        // P -> Q ... => FIRSTVT(Q) subset FIRSTVT(P)
        for (const t of fvt[first]) {
          if (!fvt[p.lhs].has(t)) {
            fvt[p.lhs].add(t);
            changed = true;
          }
        }
        // P -> Q a ... => a in FIRSTVT(P)
        if (p.rhs.length >= 2 && !ntSet.has(p.rhs[1])) {
          if (!fvt[p.lhs].has(p.rhs[1])) {
            fvt[p.lhs].add(p.rhs[1]);
            changed = true;
          }
        }
      }
    }
  }

  const out: Record<string, string[]> = {};
  for (const nt of grammar.nonTerminals) out[nt] = Array.from(fvt[nt]);
  return out;
}

export function computeLastVT(grammar: ParsedGrammar): Record<string, string[]> {
  const ntSet = new Set(grammar.nonTerminals);
  const lvt: Record<string, Set<string>> = {};
  for (const nt of grammar.nonTerminals) lvt[nt] = new Set();

  let changed = true;
  let guard = 0;
  while (changed && guard < 200) {
    changed = false;
    guard++;
    for (const p of grammar.productions) {
      if (p.rhs.length === 0) continue;
      const last = p.rhs[p.rhs.length - 1];
      if (!ntSet.has(last)) {
        if (!lvt[p.lhs].has(last)) {
          lvt[p.lhs].add(last);
          changed = true;
        }
      } else {
        // P -> ... Q => LASTVT(Q) subset LASTVT(P)
        for (const t of lvt[last]) {
          if (!lvt[p.lhs].has(t)) {
            lvt[p.lhs].add(t);
            changed = true;
          }
        }
        // P -> ... a Q => a in LASTVT(P)
        if (p.rhs.length >= 2 && !ntSet.has(p.rhs[p.rhs.length - 2])) {
          const prevTerm = p.rhs[p.rhs.length - 2];
          if (!lvt[p.lhs].has(prevTerm)) {
            lvt[p.lhs].add(prevTerm);
            changed = true;
          }
        }
      }
    }
  }

  const out: Record<string, string[]> = {};
  for (const nt of grammar.nonTerminals) out[nt] = Array.from(lvt[nt]);
  return out;
}

/**
 * Runs the complete Operator Precedence Parser:
 * - Validates operator grammar conditions (no ε-productions, no adjacent non-terminals)
 * - Computes FIRSTVT and LASTVT sets algorithmically
 * - Builds precedence matrix (<, =, >) using grammar relations + standard operator precedence disambiguation
 * - Executes Shift / Reduce bottom-up parsing with handle reduction and dynamic parse tree
 */
export function runOPPParser(
  grammarText: string,
  inputText: string,
  explicitStartSymbol?: string
): OPPResult {
  const { grammar, diagnostics: parseDiags } = parseGrammarText(grammarText, explicitStartSymbol);
  const diagnostics: ParserDiagnostic[] = [...parseDiags];

  if (!grammar) {
    return {
      grammar: null,
      firstVT: {},
      lastVT: {},
      precedenceTable: {},
      tableSymbols: [],
      diagnostics,
      steps: [],
      accepted: false,
      statusMessage: 'Grammar syntax errors prevented Operator Precedence analysis.',
      isOperatorGrammar: false,
    };
  }

  const ntSet = new Set(grammar.nonTerminals);
  let isOperatorGrammar = true;

  // Validate Operator Grammar Requirements:
  // 1. No ε-productions
  // 2. No two adjacent non-terminals on any RHS
  for (const p of grammar.productions) {
    if (p.rhs.length === 0) {
      isOperatorGrammar = false;
      diagnostics.push({
        id: `opp-eps-${p.id}`,
        code: 'OPP_EPSILON',
        category: 'unsupported-algorithm',
        severity: 'error',
        title: `Epsilon Production Unsupported in OPP (${formatProduction(p)})`,
        location: `Line ${p.rawLine}: ${formatProduction(p)}`,
        violatedRule: 'An Operator Grammar cannot contain empty (ε) productions.',
        explanation: `Operator Precedence Parsing relies on terminal-to-terminal precedence relations and cannot match empty handles.`,
        suggestion: 'Remove ε-productions by rewriting the grammar without nullable rules, or use an LL(1) / LR parser.',
      });
    }
    for (let i = 0; i < p.rhs.length - 1; i++) {
      if (ntSet.has(p.rhs[i]) && ntSet.has(p.rhs[i + 1])) {
        isOperatorGrammar = false;
        diagnostics.push({
          id: `opp-adj-${p.id}-${i}`,
          code: 'OPP_ADJACENT_NT',
          category: 'unsupported-algorithm',
          severity: 'error',
          title: `Adjacent Non-Terminals "${p.rhs[i]} ${p.rhs[i + 1]}"`,
          location: `Line ${p.rawLine}: ${formatProduction(p)}`,
          violatedRule: 'An Operator Grammar forbids two adjacent non-terminals on any right-hand side.',
          explanation: `Production "${formatProduction(p)}" contains "${p.rhs[i]}" directly followed by "${p.rhs[i + 1]}" with no separating terminal operator.`,
          suggestion: 'Insert an operator/separator terminal between adjacent non-terminals, or use an LR parser.',
        });
      }
    }
  }

  const firstVT = computeFirstVT(grammar);
  const lastVT = computeLastVT(grammar);
  const tableSymbols = [...grammar.terminals, EOF_SYMBOL];

  // Track raw relations derived from FIRSTVT/LASTVT
  const rawRels: Record<string, Record<string, Set<'<' | '=' | '>'>>> = {};
  for (const a of tableSymbols) {
    rawRels[a] = {};
    for (const b of tableSymbols) rawRels[a][b] = new Set();
  }

  const addRel = (a: string, b: string, rel: '<' | '=' | '>') => {
    if (rawRels[a]?.[b]) rawRels[a][b].add(rel);
  };

  for (const p of grammar.productions) {
    const rhs = p.rhs;
    for (let i = 0; i < rhs.length; i++) {
      const x = rhs[i];
      const next = rhs[i + 1];
      const next2 = rhs[i + 2];

      // Case 1: ... a b ... => a = b
      if (next && !ntSet.has(x) && !ntSet.has(next)) {
        addRel(x, next, '=');
      }
      // Case 2: ... a B b ... => a = b
      if (next && next2 && !ntSet.has(x) && ntSet.has(next) && !ntSet.has(next2)) {
        addRel(x, next2, '=');
      }
      // Case 3: ... a B ... => a < b for all b in FIRSTVT(B)
      if (next && !ntSet.has(x) && ntSet.has(next)) {
        for (const b of firstVT[next] || []) addRel(x, b, '<');
      }
      // Case 4: ... A b ... => a > b for all a in LASTVT(A)
      if (next && ntSet.has(x) && !ntSet.has(next)) {
        for (const a of lastVT[x] || []) addRel(a, next, '>');
      }
    }
  }

  // Boundary relations with $: $ < FIRSTVT(S) and LASTVT(S) > $
  for (const t of firstVT[grammar.startSymbol] || []) {
    addRel(EOF_SYMBOL, t, '<');
  }
  for (const t of lastVT[grammar.startSymbol] || []) {
    addRel(t, EOF_SYMBOL, '>');
  }

  // Resolve final precedence table (applying standard operator precedence & associativity
  // when ambiguous binary operator grammars like E -> E + E | E * E produce both < and >)
  const precedenceTable: Record<string, Record<string, PrecedenceRel>> = {};
  let disambiguatedPairs = 0;
  let unresolvedConflicts = 0;

  for (const a of tableSymbols) {
    precedenceTable[a] = {};
    for (const b of tableSymbols) {
      const set = rawRels[a][b];
      if (set.size === 0) {
        precedenceTable[a][b] = '';
      } else if (set.size === 1) {
        precedenceTable[a][b] = Array.from(set)[0];
      } else {
        // Check if both a and b are known operators with standard precedence/associativity
        const opA = DEFAULT_OPERATOR_PRECEDENCE[a];
        const opB = DEFAULT_OPERATOR_PRECEDENCE[b];
        if (opA && opB && set.has('<') && set.has('>') && !set.has('=')) {
          disambiguatedPairs++;
          if (opA.prec > opB.prec) {
            precedenceTable[a][b] = '>';
          } else if (opA.prec < opB.prec) {
            precedenceTable[a][b] = '<';
          } else {
            precedenceTable[a][b] = opA.assoc === 'left' ? '>' : '<';
          }
        } else {
          unresolvedConflicts++;
          precedenceTable[a][b] = 'conflict';
          diagnostics.push({
            id: `opp-conflict-${a}-${b}`,
            code: 'OPP_PRECEDENCE_CONFLICT',
            category: 'parsing-conflict',
            severity: 'error',
            title: `Precedence Conflict Between "${a}" and "${b}"`,
            location: `Precedence Table Cell [${a}, ${b}]`,
            violatedRule: 'Each pair of terminals (a, b) in an Operator Precedence table must have at most one relation (<, =, or >).',
            explanation: `Both relations { ${Array.from(set).join(', ')} } were derived for (${a}, ${b}), indicating ambiguity that standard arithmetic precedence rules do not resolve.`,
            suggestion: 'Rewrite the grammar using layered precedence non-terminals (e.g. E, T, F) or specify unambiguous operators.',
            noteUniqueness: 'Multiple valid precedence assignments can resolve an ambiguous grammar depending on desired language semantics.',
          });
        }
      }
    }
  }

  if (disambiguatedPairs > 0 && unresolvedConflicts === 0) {
    diagnostics.push({
      id: 'opp-disambiguated-info',
      code: 'OPP_DISAMBIGUATED',
      category: 'parsing-conflict',
      severity: 'info',
      title: 'Operator Precedence & Associativity Applied',
      location: 'Precedence Table Construction',
      violatedRule: 'Ambiguous expression rules like E → E + E | E * E yield both < and > in raw FIRSTVT/LASTVT sets.',
      explanation: `Resolved ${disambiguatedPairs} operator pair(s) using standard algebraic precedence (* / higher than + -, left-associative; ^ right-associative).`,
      suggestion: 'Inspect the generated precedence matrix below to see how * takes precedence (>) over +.',
    });
  }

  if (!isOperatorGrammar || parseDiags.some((d) => d.severity === 'error') || unresolvedConflicts > 0) {
    return {
      grammar,
      firstVT,
      lastVT,
      precedenceTable,
      tableSymbols,
      diagnostics,
      steps: [],
      accepted: false,
      statusMessage: !isOperatorGrammar
        ? 'Grammar is not a valid Operator Grammar.'
        : 'Precedence conflicts prevented OPP execution.',
      isOperatorGrammar,
    };
  }

  const { tokens, diagnostics: lexDiags } = tokenizeInput(inputText, grammar);
  diagnostics.push(...lexDiags);

  // Execute Shift-Reduce Operator Precedence Parsing
  interface OPPStackEntry {
    symbol: string;
    isTerminal: boolean;
    node: ParseTreeNode;
  }

  let nodeCounter = 0;
  const stack: OPPStackEntry[] = [
    {
      symbol: EOF_SYMBOL,
      isTerminal: true,
      node: { id: `opp-${++nodeCounter}`, symbol: EOF_SYMBOL, isTerminal: true, children: [] },
    },
  ];

  const steps: ParseStep[] = [];
  let cursor = 0;
  let stepNum = 0;

  const getCurrentTree = (): ParseTreeNode | null => {
    const activeNodes = stack.slice(1).map((s) => s.node);
    if (activeNodes.length === 0) return null;
    if (activeNodes.length === 1) return cloneTree(activeNodes[0]);
    return {
      id: 'opp-forest-root',
      symbol: 'Stack Forest',
      isTerminal: false,
      status: 'pending',
      children: activeNodes.map((n) => cloneTree(n)),
    };
  };

  const pushStep = (
    operation: ParseStep['operation'],
    rel: ParseStep['precedenceRelation'],
    actionLabel: string,
    explanation: string,
    production?: string,
    highlightCount = 1,
    status: ParseStep['status'] = 'running'
  ) => {
    const remaining = tokens.slice(cursor);
    steps.push({
      stepNumber: stepNum++,
      operation,
      stack: stack.map((s) => s.symbol),
      remainingInput: remaining,
      currentToken: remaining[0] ?? EOF_SYMBOL,
      production,
      precedenceRelation: rel,
      actionLabel,
      explanation,
      treeSnapshot: getCurrentTree(),
      highlightCount,
      status,
    });
  };

  pushStep(
    'init',
    'none',
    'Initialize stack [$]',
    `Push boundary marker "$" onto the stack. Next input symbol is "${tokens[0]}".`
  );

  // Helper to find top-most terminal on the stack
  const findTopTerminalIndex = (): number => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].isTerminal) return i;
    }
    return 0;
  };

  // Match handle pattern against grammar productions (operator precedence ignores specific NT names when matching skeleton, then verifies)
  const matchHandleProduction = (handle: OPPStackEntry[]) => {
    // 1. Exact symbol match first
    const exact = grammar.productions.find(
      (p) =>
        p.rhs.length === handle.length &&
        p.rhs.every((sym, idx) => sym === handle[idx].symbol)
    );
    if (exact) return exact;

    // 2. Structural operator-skeleton match (any NT matches NT, terminals must match identically)
    return (
      grammar.productions.find(
        (p) =>
          p.rhs.length === handle.length &&
          p.rhs.every((sym, idx) => {
            const rhsIsNT = ntSet.has(sym);
            const handleIsNT = !handle[idx].isTerminal;
            return rhsIsNT === handleIsNT && (rhsIsNT || sym === handle[idx].symbol);
          })
      ) || null
    );
  };

  let accepted = false;
  const MAX_STEPS = 220;

  while (stepNum < MAX_STEPS) {
    const topTermIdx = findTopTerminalIndex();
    const a = stack[topTermIdx].symbol;
    const b = tokens[cursor] ?? EOF_SYMBOL;

    // Acceptance condition: stack is [$ S] (or single non-terminal with top terminal $) and input is $
    if (
      a === EOF_SYMBOL &&
      b === EOF_SYMBOL &&
      stack.length === 2 &&
      !stack[1].isTerminal
    ) {
      accepted = true;
      stack[1].node.status = 'matched';
      pushStep(
        'accept',
        'none',
        `Accept (${stack[1].symbol})`,
        `Top terminal is "$", input is "$", and stack reduced cleanly to start symbol "${stack[1].symbol}".`,
        undefined,
        1,
        'accepted'
      );
      break;
    }

    const rel = precedenceTable[a]?.[b] ?? '';

    if (rel === '<' || rel === '=') {
      const shiftedNode: ParseTreeNode = {
        id: `opp-${++nodeCounter}`,
        symbol: b,
        isTerminal: true,
        children: [],
        status: 'active',
      };
      stack.push({ symbol: b, isTerminal: true, node: shiftedNode });
      cursor++;
      pushStep(
        'shift',
        rel,
        `Shift "${b}" (${a} ${rel} ${b})`,
        `Precedence relation ${a} ${rel} ${b}: ${rel === '<' ? `"${a}" yields precedence to "${b}"` : `"${a}" has equal precedence to "${b}"`}. Shift "${b}" onto stack.`,
        undefined,
        1
      );
    } else if (rel === '>') {
      // Find leftmost terminal of handle by scanning backward until prevTerm < currTerm
      let handleStartTermIdx = topTermIdx;
      while (handleStartTermIdx > 0) {
        let prevTermIdx = handleStartTermIdx - 1;
        while (prevTermIdx >= 0 && !stack[prevTermIdx].isTerminal) prevTermIdx--;
        if (prevTermIdx < 0) break;
        const prevRel = precedenceTable[stack[prevTermIdx].symbol]?.[stack[handleStartTermIdx].symbol];
        if (prevRel === '<') {
          break;
        }
        handleStartTermIdx = prevTermIdx;
      }

      // Include a preceding non-terminal directly before handleStartTermIdx if present (for binary ops like E + E)
      let sliceStart = handleStartTermIdx;
      if (sliceStart > 1 && !stack[sliceStart - 1].isTerminal) {
        sliceStart = sliceStart - 1;
      }

      let handle = stack.slice(sliceStart);
      let matchedProd = matchHandleProduction(handle);

      // Fallback: try strictly from handleStartTermIdx if preceding NT wasn't part of handle (e.g. unary or id)
      if (!matchedProd && sliceStart !== handleStartTermIdx) {
        sliceStart = handleStartTermIdx;
        handle = stack.slice(sliceStart);
        matchedProd = matchHandleProduction(handle);
      }

      if (!matchedProd) {
        const handleText = handle.map((h) => h.symbol).join(' ');
        diagnostics.push({
          id: `opp-bad-handle-${stepNum}`,
          code: 'OPP_INVALID_HANDLE',
          category: 'runtime-error',
          severity: 'error',
          title: `Unrecognized Handle "${handleText}"`,
          location: `Stack Handle [${handleText}] at lookahead "${b}"`,
          violatedRule: 'When a > b, the top handle on the stack must match the RHS of a grammar production.',
          explanation: `Precedence relation ${a} > ${b} triggered a Reduce operation, but "${handleText}" does not match any production right-hand side.`,
          suggestion: 'Check for missing operands around an operator (e.g. "+ * id" or "id +").',
        });
        pushStep(
          'error',
          '>',
          `Error: cannot reduce handle "${handleText}"`,
          `Relation ${a} > ${b} requested Reduce, but no grammar rule matches "${handleText}".`,
          undefined,
          handle.length,
          'rejected'
        );
        break;
      }

      const prodLabel = formatProduction(matchedProd);
      const reducedNode: ParseTreeNode = {
        id: `opp-${++nodeCounter}`,
        symbol: matchedProd.lhs,
        isTerminal: false,
        status: 'reduced',
        productionLabel: prodLabel,
        children: handle.map((h) => ({ ...h.node, status: 'matched' })),
      };

      stack.splice(sliceStart, handle.length, {
        symbol: matchedProd.lhs,
        isTerminal: false,
        node: reducedNode,
      });

      pushStep(
        'reduce',
        '>',
        `Reduce ${prodLabel} (${a} > ${b})`,
        `Precedence relation ${a} > ${b} ("${a}" takes precedence over "${b}"). Reduced handle "${handle.map((h) => h.symbol).join(' ')}" to "${matchedProd.lhs}".`,
        prodLabel,
        1
      );
    } else {
      if (!diagnostics.some((d) => d.code === 'LEX_UNKNOWN_TOKEN' || d.code === 'SYN_PARENS')) {
        diagnostics.push({
          id: `opp-no-rel-${stepNum}`,
          code: 'OPP_MISSING_RELATION',
          category: 'runtime-error',
          severity: 'error',
          title: `Syntax Error: No Precedence Relation Between "${a}" and "${b}"`,
          location: `Input Token #${cursor + 1} ("${b}")`,
          violatedRule: `The precedence table cell [${a}, ${b}] must define <, =, or >.`,
          explanation: `Top stack terminal "${a}" cannot legally be followed by input token "${b}" in this operator grammar.`,
          suggestion: `Check whether an operator is missing between operands (e.g. "id id") or an operand is missing between operators (e.g. "id + * id").`,
        });
      }
      pushStep(
        'error',
        'none',
        `Error: blank relation [${a}, ${b}]`,
        `No valid operator precedence relation exists between stack top terminal "${a}" and lookahead "${b}".`,
        undefined,
        1,
        'rejected'
      );
      break;
    }
  }

  return {
    grammar,
    firstVT,
    lastVT,
    precedenceTable,
    tableSymbols,
    diagnostics,
    steps,
    accepted,
    statusMessage: accepted
      ? `Input accepted in ${steps.length - 1} steps.`
      : 'Input rejected during Operator Precedence parsing.',
    isOperatorGrammar,
  };
}
