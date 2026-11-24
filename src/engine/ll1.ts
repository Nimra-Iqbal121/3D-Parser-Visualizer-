import {
  cloneTree,
  computeFirstOfSequence,
  computeFirstSets,
  computeFollowSets,
  detectLeftFactoring,
  detectLeftRecursion,
  formatProduction,
  parseGrammarText,
  tokenizeInput,
} from './grammar';
import {
  EOF_SYMBOL,
  EPSILON,
  LL1Result,
  LL1TableCell,
  ParseStep,
  ParseTreeNode,
  ParserDiagnostic,
  Production,
} from './types';

function findTreeNodeById(node: ParseTreeNode, id: string): ParseTreeNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findTreeNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Full LL(1) Predictive Parser:
 * 1. Parses and validates grammar
 * 2. Detects Left Recursion & Left Factoring
 * 3. Computes FIRST and FOLLOW sets algorithmically
 * 4. Builds M[A, a] predictive table & detects FIRST/FIRST and FIRST/FOLLOW conflicts
 * 5. Executes stack-based predictive parsing with live parse-tree snapshots
 */
export function runLL1Parser(
  grammarText: string,
  inputText: string,
  explicitStartSymbol?: string
): LL1Result {
  const { grammar, diagnostics: parseDiags } = parseGrammarText(grammarText, explicitStartSymbol);
  const diagnostics: ParserDiagnostic[] = [...parseDiags];

  if (!grammar) {
    return {
      grammar: null,
      firstSets: {},
      followSets: {},
      table: {},
      diagnostics,
      steps: [],
      accepted: false,
      statusMessage: 'Grammar syntax errors prevented LL(1) table generation.',
    };
  }

  const firstSets = computeFirstSets(grammar);
  const followSets = computeFollowSets(grammar, firstSets);

  // Detect Left Recursion & Left Factoring
  const lrCheck = detectLeftRecursion(grammar);
  const lfCheck = detectLeftFactoring(grammar);
  diagnostics.push(...lrCheck.diagnostics);
  if (!lrCheck.hasImmediate && !lrCheck.hasIndirect) {
    diagnostics.push(...lfCheck.diagnostics);
  }

  // Construct LL(1) Predictive Parsing Table M[A, a]
  const ntSet = new Set(grammar.nonTerminals);
  const colSymbols = [...grammar.terminals, EOF_SYMBOL];
  const table: Record<string, Record<string, LL1TableCell>> = {};

  for (const nt of grammar.nonTerminals) {
    table[nt] = {};
    for (const term of colSymbols) {
      table[nt][term] = { entries: [], hasConflict: false };
    }
  }

  const cellReasons: Record<string, Record<string, Set<'FIRST' | 'FOLLOW'>>> = {};
  for (const nt of grammar.nonTerminals) {
    cellReasons[nt] = {};
    for (const term of colSymbols) cellReasons[nt][term] = new Set();
  }

  function addEntry(nt: string, term: string, prod: Production, reason: 'FIRST' | 'FOLLOW') {
    const cell = table[nt]?.[term];
    if (!cell) return;
    if (!cell.entries.some((e) => e.id === prod.id)) {
      cell.entries.push(prod);
    }
    cellReasons[nt][term].add(reason);
    if (cell.entries.length > 1) {
      cell.hasConflict = true;
      const reasons = cellReasons[nt][term];
      cell.conflictType =
        reasons.has('FIRST') && reasons.has('FOLLOW') ? 'FIRST/FOLLOW' : 'FIRST/FIRST';
    }
  }

  for (const prod of grammar.productions) {
    const firstAlpha = computeFirstOfSequence(prod.rhs, firstSets, ntSet);
    for (const sym of firstAlpha) {
      if (sym !== EPSILON) {
        addEntry(prod.lhs, sym, prod, 'FIRST');
      }
    }
    if (firstAlpha.includes(EPSILON)) {
      for (const followSym of followSets[prod.lhs] || []) {
        addEntry(prod.lhs, followSym, prod, 'FOLLOW');
      }
    }
  }

  // Report table conflicts clearly
  let hasTableConflict = false;
  for (const nt of grammar.nonTerminals) {
    for (const term of colSymbols) {
      const cell = table[nt][term];
      if (cell.hasConflict) {
        hasTableConflict = true;
        const ruleList = cell.entries.map(formatProduction).join('  vs  ');
        diagnostics.push({
          id: `ll1-conflict-${nt}-${term}`,
          code: cell.conflictType === 'FIRST/FOLLOW' ? 'LL1_FIRST_FOLLOW' : 'LL1_TABLE_CONFLICT',
          category: 'parsing-conflict',
          severity: 'error',
          title: `LL(1) ${cell.conflictType || 'Table'} Conflict at M[${nt}, ${term}]`,
          location: `Parsing Table Cell M[${nt}, "${term}"]`,
          violatedRule: 'Each cell M[A, a] in an LL(1) table must contain at most one production.',
          explanation:
            cell.conflictType === 'FIRST/FOLLOW'
              ? `Non-terminal "${nt}" can both start with "${term}" and derive ε while "${term}" is in FOLLOW(${nt}): ${ruleList}.`
              : `Two productions for "${nt}" share lookahead "${term}" in their FIRST sets: ${ruleList}.`,
          suggestion: lrCheck.correctedGrammar
            ? 'Eliminate left recursion first, then re-check the LL(1) parsing table.'
            : lfCheck.correctedGrammar
            ? 'Apply left factoring to separate shared prefixes.'
            : 'Refactor the grammar to make FIRST/FOLLOW sets disjoint, or switch to a Bottom-Up LR parser (SLR(1)/CLR(1)/LALR(1)).',
          correctedGrammar: lrCheck.correctedGrammar ?? lfCheck.correctedGrammar ?? undefined,
          noteUniqueness:
            'Not every context-free grammar has an equivalent LL(1) form; ambiguous grammars require disambiguation.',
        });
      }
    }
  }

  // Stop before parsing execution if grammar has hard errors or conflicts
  if (
    parseDiags.some((d) => d.severity === 'error') ||
    lrCheck.hasImmediate ||
    lrCheck.hasIndirect ||
    hasTableConflict
  ) {
    return {
      grammar,
      firstSets,
      followSets,
      table,
      diagnostics,
      steps: [],
      accepted: false,
      statusMessage: hasTableConflict
        ? 'Grammar is not LL(1): parsing table conflicts detected.'
        : 'Grammar violates LL(1) prerequisites. Review diagnostics for suggested fixes.',
    };
  }

  // Tokenize input and run predictive stack parser
  const { tokens, diagnostics: lexDiags } = tokenizeInput(inputText, grammar);
  diagnostics.push(...lexDiags);

  let nodeCounter = 0;
  const rootTree: ParseTreeNode = {
    id: `ll1-${++nodeCounter}`,
    symbol: grammar.startSymbol,
    isTerminal: false,
    children: [],
    status: 'active',
  };

  interface StackItem {
    symbol: string;
    nodeId?: string;
  }

  // Stack top is at the end of array for natural push/pop; we store top-first or bottom-first consistently.
  // Convention for visualization: stack[0] = bottom ($), stack[stack.length - 1] = TOP of stack.
  const stack: StackItem[] = [
    { symbol: EOF_SYMBOL },
    { symbol: grammar.startSymbol, nodeId: rootTree.id },
  ];

  const steps: ParseStep[] = [];
  let cursor = 0;
  let stepNum = 0;

  const pushStep = (
    operation: ParseStep['operation'],
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
      actionLabel,
      explanation,
      treeSnapshot: cloneTree(rootTree),
      highlightCount,
      status,
    });
  };

  pushStep(
    'init',
    `Initialize stack [$ ${grammar.startSymbol}]`,
    `Push end-marker "$" and start symbol "${grammar.startSymbol}" onto the predictive parsing stack. Lookahead is "${tokens[0]}".`,
    undefined,
    1
  );

  const MAX_STEPS = 250;
  let accepted = false;

  while (stack.length > 0 && stepNum < MAX_STEPS) {
    const top = stack[stack.length - 1];
    const lookahead = tokens[cursor] ?? EOF_SYMBOL;

    if (top.symbol === EOF_SYMBOL && lookahead === EOF_SYMBOL) {
      accepted = true;
      pushStep(
        'accept',
        'Accept ($ matches $)',
        'Both the top of the parsing stack and remaining input reached the end marker "$". Input is accepted!',
        undefined,
        1,
        'accepted'
      );
      break;
    }

    if (!ntSet.has(top.symbol)) {
      // Terminal on top of stack
      if (top.symbol === lookahead) {
        stack.pop();
        if (top.nodeId) {
          const tNode = findTreeNodeById(rootTree, top.nodeId);
          if (tNode) tNode.status = 'matched';
        }
        cursor++;
        pushStep(
          'match',
          `Match "${lookahead}"`,
          `Top of stack "${top.symbol}" matches current lookahead "${lookahead}". Pop stack and advance input.`,
          undefined,
          1
        );
      } else {
        const isTrailingAfterComplete = top.symbol === EOF_SYMBOL && lookahead !== EOF_SYMBOL;
        const matchedPrefix = tokens.slice(0, cursor).join(' ');
        const leftover = tokens.slice(cursor, -1).join(' ');

        if (!diagnostics.some((d) => d.code === 'LEX_UNKNOWN_TOKEN' || d.code === 'SYN_PARENS')) {
          if (isTrailingAfterComplete && matchedPrefix) {
            diagnostics.push({
              id: `ll1-mismatch-${stepNum}`,
              code: 'LL1_TOKEN_MISMATCH',
              category: 'runtime-error',
              severity: 'error',
              title: `Extra Trailing Input "${lookahead}" After Complete "${grammar.startSymbol}"`,
              location: `Input Token #${cursor + 1} ("${lookahead}")`,
              violatedRule: `Parsing stack reached "$", meaning "${grammar.startSymbol}" is already complete and input must end.`,
              explanation: `The prefix "${matchedPrefix}" already matched a complete "${grammar.startSymbol}", leaving only "$" on the stack. The remaining token(s) "${leftover}" cannot be derived by this grammar.`,
              suggestion: `Remove the extra trailing token(s) after "${matchedPrefix}" (use "${matchedPrefix}"), or modify your grammar to accept additional repetitions.`,
              correctedInput: matchedPrefix,
            });
          } else {
            diagnostics.push({
              id: `ll1-mismatch-${stepNum}`,
              code: 'LL1_TOKEN_MISMATCH',
              category: 'runtime-error',
              severity: 'error',
              title: `Unexpected Token "${lookahead}"`,
              location: `Input Token #${cursor + 1} ("${lookahead}")`,
              violatedRule: `Top of stack expected terminal "${top.symbol}".`,
              explanation: `The parser expected "${top.symbol}" to match the top of the stack, but encountered "${lookahead}" in the input.`,
              suggestion: `Insert "${top.symbol}" before "${lookahead}" or check your expression syntax.`,
            });
          }
        }
        pushStep(
          'error',
          isTrailingAfterComplete
            ? `Error: Extra token "${lookahead}" after complete ${grammar.startSymbol}`
            : `Error: expected "${top.symbol}", found "${lookahead}"`,
          isTrailingAfterComplete && matchedPrefix
            ? `Stack reached "$" after matching "${matchedPrefix}", but extra token "${lookahead}" remains in the input.`
            : `Terminal mismatch: stack expected "${top.symbol}" but input provided "${lookahead}".`,
          undefined,
          1,
          'rejected'
        );
        break;
      }
    } else {
      // Non-terminal on top of stack -> consult M[top, lookahead]
      const cell = table[top.symbol]?.[lookahead];
      if (!cell || cell.entries.length === 0) {
        const expectedTerminals = colSymbols.filter(
          (t) => table[top.symbol]?.[t]?.entries.length > 0
        );
        if (!diagnostics.some((d) => d.code === 'LEX_UNKNOWN_TOKEN')) {
          diagnostics.push({
            id: `ll1-empty-cell-${stepNum}`,
            code: 'LL1_EMPTY_TABLE_CELL',
            category: 'runtime-error',
            severity: 'error',
            title: `Syntax Error: Empty Table Entry M[${top.symbol}, ${lookahead}]`,
            location: `Input Token #${cursor + 1} ("${lookahead}")`,
            violatedRule: `M[${top.symbol}, ${lookahead}] must contain a production to expand "${top.symbol}".`,
            explanation: `No production for non-terminal "${top.symbol}" can derive a string starting with "${lookahead}".`,
            suggestion: `Expected one of: { ${expectedTerminals.join(', ')} } at this position.`,
          });
        }
        pushStep(
          'error',
          `Error: M[${top.symbol}, ${lookahead}] is empty`,
          `No predictive rule exists for non-terminal "${top.symbol}" on lookahead "${lookahead}".`,
          undefined,
          1,
          'rejected'
        );
        break;
      }

      const prod = cell.entries[0];
      const prodLabel = formatProduction(prod);
      stack.pop();

      const parentTreeNode = top.nodeId ? findTreeNodeById(rootTree, top.nodeId) : null;
      if (parentTreeNode) {
        parentTreeNode.status = 'matched';
        parentTreeNode.productionLabel = prodLabel;
      }

      if (prod.rhs.length === 0) {
        if (parentTreeNode) {
          parentTreeNode.children.push({
            id: `ll1-${++nodeCounter}`,
            symbol: EPSILON,
            isTerminal: true,
            children: [],
            status: 'matched',
          });
        }
        pushStep(
          'expand',
          `Expand ${prodLabel}`,
          `Consult M[${top.symbol}, ${lookahead}] = (${prodLabel}). Pop "${top.symbol}" and push nothing (ε).`,
          prodLabel,
          1
        );
      } else {
        const newNodes: ParseTreeNode[] = prod.rhs.map((sym) => ({
          id: `ll1-${++nodeCounter}`,
          symbol: sym,
          isTerminal: !ntSet.has(sym),
          children: [],
          status: 'pending',
        }));

        if (parentTreeNode) {
          parentTreeNode.children.push(...newNodes);
        }

        // Push RHS onto stack in reverse order so leftmost symbol is on top
        for (let i = prod.rhs.length - 1; i >= 0; i--) {
          stack.push({ symbol: prod.rhs[i], nodeId: newNodes[i].id });
        }

        pushStep(
          'expand',
          `Expand ${prodLabel}`,
          `Consult M[${top.symbol}, ${lookahead}] = (${prodLabel}). Pop "${top.symbol}" and push [${[...prod.rhs].reverse().join(' ')}] (top: "${prod.rhs[0]}").`,
          prodLabel,
          prod.rhs.length
        );
      }
    }
  }

  return {
    grammar,
    firstSets,
    followSets,
    table,
    diagnostics,
    steps,
    accepted,
    statusMessage: accepted
      ? `Input accepted in ${steps.length - 1} steps.`
      : 'Input rejected during LL(1) predictive parsing.',
  };
}
