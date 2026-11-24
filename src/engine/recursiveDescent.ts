import {
  cloneTree,
  detectLeftRecursion,
  formatProduction,
  parseGrammarText,
  tokenizeInput,
} from './grammar';
import {
  EOF_SYMBOL,
  EPSILON,
  ParsedGrammar,
  ParseStep,
  ParseTreeNode,
  ParserDiagnostic,
  RDResult,
} from './types';

function generateRDPseudocode(grammar: ParsedGrammar): string {
  const ntSet = new Set(grammar.nonTerminals);
  const lines: string[] = [];

  for (const nt of grammar.nonTerminals) {
    const prods = grammar.productions.filter((p) => p.lhs === nt);
    const fnName = `parse_${nt.replace(/'/g, '_prime')}`;
    lines.push(`function ${fnName}():`);
    prods.forEach((prod, idx) => {
      const branch = idx === 0 ? '  try' : '  else try';
      lines.push(`${branch}  // ${formatProduction(prod)}`);
      if (prod.rhs.length === 0) {
        lines.push(`    return true  // ε`);
      } else {
        for (const sym of prod.rhs) {
          if (ntSet.has(sym)) {
            lines.push(`    parse_${sym.replace(/'/g, '_prime')}()`);
          } else {
            lines.push(`    match("${sym}")`);
          }
        }
      }
    });
    lines.push('');
  }
  return lines.join('\n').trim();
}

/**
 * Executes a real Recursive Descent Parser (with safe backtracking and full call-stack /
 * parse-tree step trace). Guards against left recursion before execution.
 */
export function runRecursiveDescent(
  grammarText: string,
  inputText: string,
  explicitStartSymbol?: string
): RDResult {
  const { grammar, diagnostics: parseDiags } = parseGrammarText(grammarText, explicitStartSymbol);
  const diagnostics: ParserDiagnostic[] = [...parseDiags];

  if (!grammar) {
    return {
      grammar: null,
      diagnostics,
      steps: [],
      accepted: false,
      statusMessage: 'Grammar syntax errors prevented Recursive Descent execution.',
      generatedPseudocode: '',
    };
  }

  const generatedPseudocode = generateRDPseudocode(grammar);

  // Check for undefined non-terminals error before running
  if (diagnostics.some((d) => d.severity === 'error')) {
    return {
      grammar,
      diagnostics,
      steps: [],
      accepted: false,
      statusMessage: 'Fix grammar definition errors before executing Recursive Descent.',
      generatedPseudocode,
    };
  }

  // Left recursion check (fatal for Recursive Descent)
  const lrCheck = detectLeftRecursion(grammar);
  if (lrCheck.hasImmediate || lrCheck.hasIndirect) {
    diagnostics.push(...lrCheck.diagnostics);
    return {
      grammar,
      diagnostics,
      steps: [],
      accepted: false,
      statusMessage: 'Recursive Descent cannot execute on a left-recursive grammar (would cause infinite recursion).',
      generatedPseudocode,
    };
  }

  const { tokens, diagnostics: lexDiags } = tokenizeInput(inputText, grammar);
  diagnostics.push(...lexDiags);

  const ntSet = new Set(grammar.nonTerminals);
  const steps: ParseStep[] = [];
  const callStack: string[] = [];
  let nodeCounter = 0;
  let stepCounter = 0;
  const MAX_STEPS = 450;
  let abortedForLimit = false;
  let longestStartMatchPos = -1;
  let furthestPos = 0;

  // Root of the live parse tree
  const rootNode: ParseTreeNode = {
    id: `rd-${++nodeCounter}`,
    symbol: grammar.startSymbol,
    isTerminal: false,
    children: [],
    status: 'active',
  };

  function recordStep(
    operation: ParseStep['operation'],
    pos: number,
    actionLabel: string,
    explanation: string,
    production?: string,
    status: ParseStep['status'] = 'running'
  ) {
    if (steps.length >= MAX_STEPS) {
      abortedForLimit = true;
      return;
    }
    if (pos > furthestPos) furthestPos = pos;
    const remaining = tokens.slice(pos);
    steps.push({
      stepNumber: stepCounter++,
      operation,
      stack: [...callStack].reverse(), // Top of call stack at index 0 for display
      remainingInput: remaining,
      currentToken: remaining[0] ?? EOF_SYMBOL,
      production,
      actionLabel,
      explanation,
      callDepth: callStack.length,
      callStack: [...callStack],
      treeSnapshot: cloneTree(rootNode),
      highlightCount: 1,
      status,
    });
  }

  recordStep(
    'init',
    0,
    `Start Recursive Descent at ${grammar.startSymbol}()`,
    `Initialize input cursor at "${tokens[0]}" and invoke the start procedure ${grammar.startSymbol}().`
  );

  function parseNonTerminal(
    nt: string,
    pos: number,
    treeNode: ParseTreeNode,
    continuation: (nextPos: number) => boolean
  ): boolean {
    if (abortedForLimit) return false;

    const isRootCall = callStack.length === 0 && nt === grammar!.startSymbol;
    callStack.push(`${nt}()`);
    treeNode.status = 'active';
    recordStep(
      'call',
      pos,
      `Call ${nt}()`,
      `Entered recursive procedure ${nt}() with lookahead "${tokens[pos]}".`
    );

    const prods = grammar!.productions.filter((p) => p.lhs === nt);

    for (let pIdx = 0; pIdx < prods.length; pIdx++) {
      if (abortedForLimit) break;
      const prod = prods[pIdx];
      const prodLabel = formatProduction(prod);
      const savedPos = pos;
      treeNode.children = [];
      treeNode.productionLabel = prodLabel;

      recordStep(
        'expand',
        pos,
        `Try ${prodLabel}`,
        `Attempting alternative #${pIdx + 1} for ${nt}: ${prodLabel}.`,
        prodLabel
      );

      const finishBranch = (cursor: number): boolean => {
        if (isRootCall && cursor > longestStartMatchPos) {
          longestStartMatchPos = cursor;
        }
        treeNode.status = 'matched';
        callStack.pop();
        recordStep(
          'return',
          cursor,
          `Return true from ${nt}()`,
          `Procedure ${nt}() succeeded via ${prodLabel}.`,
          prodLabel
        );

        if (continuation(cursor)) {
          return true;
        }

        // The branch matched locally, but the remaining grammar/EOF continuation failed -> backtrack!
        if (!abortedForLimit) {
          callStack.push(`${nt}()`);
          treeNode.status = 'active';
          recordStep(
            'backtrack',
            savedPos,
            isRootCall
              ? `Unconsumed input "${tokens[cursor]}"; backtrack ${nt}()`
              : `Backtrack ${nt}() — continuation failed at "${tokens[cursor]}"`,
            isRootCall
              ? `Production ${prodLabel} matched up to "${tokens[cursor]}", but input did not end at "$". Rewinding to try next alternative.`
              : `Production ${prodLabel} matched locally, but the following symbol failed at "${tokens[cursor]}". Rewinding ${nt}() to try another alternative.`,
            prodLabel
          );
        }
        return false;
      };

      const matchRhs = (symIdx: number, cursor: number): boolean => {
        if (abortedForLimit) return false;
        if (symIdx >= prod.rhs.length) {
          return finishBranch(cursor);
        }

        const sym = prod.rhs[symIdx];
        if (ntSet.has(sym)) {
          const childNode: ParseTreeNode = {
            id: `rd-${++nodeCounter}`,
            symbol: sym,
            isTerminal: false,
            children: [],
            status: 'pending',
          };
          treeNode.children.push(childNode);
          const ok = parseNonTerminal(sym, cursor, childNode, (nextPos) =>
            matchRhs(symIdx + 1, nextPos)
          );
          if (ok) return true;
          treeNode.children.pop();
          return false;
        } else {
          if (tokens[cursor] === sym) {
            const termNode: ParseTreeNode = {
              id: `rd-${++nodeCounter}`,
              symbol: sym,
              isTerminal: true,
              children: [],
              status: 'matched',
            };
            treeNode.children.push(termNode);
            const nextCursor = cursor + 1;
            recordStep(
              'match',
              nextCursor,
              `Match terminal "${sym}"`,
              `Current input token matched "${sym}". Advanced input pointer to "${tokens[nextCursor]}".`,
              prodLabel
            );
            if (matchRhs(symIdx + 1, nextCursor)) return true;
            treeNode.children.pop();
            return false;
          } else {
            recordStep(
              'backtrack',
              savedPos,
              `Mismatch: expected "${sym}", got "${tokens[cursor]}"`,
              `Alternative "${prodLabel}" failed at token "${tokens[cursor]}". Rewinding cursor to "${tokens[savedPos]}".`,
              prodLabel
            );
            return false;
          }
        }
      };

      if (prod.rhs.length === 0) {
        treeNode.children.push({
          id: `rd-${++nodeCounter}`,
          symbol: EPSILON,
          isTerminal: true,
          children: [],
          status: 'matched',
        });
        recordStep(
          'match',
          pos,
          `Match ε in ${nt}()`,
          `Applied empty production ${prodLabel} without consuming an input token.`,
          prodLabel
        );
        if (finishBranch(pos)) return true;
      } else {
        if (matchRhs(0, pos)) return true;
      }

      // Clear partial children before trying next alternative
      treeNode.children = [];
    }

    treeNode.status = 'error';
    if (callStack.length > 0) callStack.pop();
    recordStep(
      'backtrack',
      pos,
      `Fail ${nt}() — return false`,
      `All alternatives for ${nt} failed at lookahead "${tokens[pos]}".`
    );
    return false;
  }

  let acceptedFinalPos = -1;
  const parsedOk = parseNonTerminal(grammar.startSymbol, 0, rootNode, (finalPos) => {
    if (tokens[finalPos] === EOF_SYMBOL) {
      acceptedFinalPos = finalPos;
      return true;
    }
    return false;
  });

  if (parsedOk && acceptedFinalPos !== -1 && !abortedForLimit) {
    recordStep(
      'accept',
      acceptedFinalPos,
      'Input Accepted',
      `Recursive Descent matched the entire input string and reached end-of-input ($).`,
      undefined,
      'accepted'
    );
    return {
      grammar,
      diagnostics,
      steps,
      accepted: true,
      statusMessage: `Accepted in ${steps.length - 1} steps.`,
      generatedPseudocode,
    };
  }

  const hasPrefixMatch = longestStartMatchPos > 0 && tokens[longestStartMatchPos] !== EOF_SYMBOL;
  const failPos = hasPrefixMatch ? longestStartMatchPos : furthestPos;
  const unexpectedTok = tokens[failPos] ?? EOF_SYMBOL;
  const matchedPrefix = hasPrefixMatch ? tokens.slice(0, longestStartMatchPos).join(' ') : '';
  const leftover = hasPrefixMatch ? tokens.slice(longestStartMatchPos, -1).join(' ') : '';

  if (!diagnostics.some((d) => d.category === 'runtime-error')) {
    if (hasPrefixMatch) {
      diagnostics.push({
        id: 'rd-syntax-error',
        code: 'RD_SYNTAX_ERROR',
        category: 'runtime-error',
        severity: 'error',
        title: `Extra Trailing Input "${unexpectedTok}" After Complete "${grammar.startSymbol}"`,
        location: `Unconsumed input starting at token #${longestStartMatchPos + 1} ("${unexpectedTok}")`,
        violatedRule: `Start symbol "${grammar.startSymbol}" must derive the entire token stream up to $.`,
        explanation: `Recursive Descent matched a complete "${grammar.startSymbol}" on the prefix "${matchedPrefix}", but the remaining token(s) "${leftover}" could not be derived by this grammar.`,
        suggestion: `Remove the extra trailing token(s) after "${matchedPrefix}" (use "${matchedPrefix}"), or update the grammar to allow additional repetitions.`,
        correctedInput: matchedPrefix,
      });
    } else {
      diagnostics.push({
        id: 'rd-syntax-error',
        code: 'RD_SYNTAX_ERROR',
        category: 'runtime-error',
        severity: 'error',
        title: `Syntax Error Near "${unexpectedTok}"`,
        location: `Input position near token #${Math.min(failPos + 1, Math.max(1, tokens.length - 1))} ("${unexpectedTok}")`,
        violatedRule: `Start symbol "${grammar.startSymbol}" must derive the entire token stream up to $.`,
        explanation: `No sequence of recursive productions from "${grammar.startSymbol}" could match the full input token stream.`,
        suggestion:
          'Verify operator placement, parentheses balance, and ensure the input tokens match the grammar productions.',
      });
    }
  }

  recordStep(
    'error',
    failPos,
    'Input Rejected',
    abortedForLimit
      ? 'Execution stopped after reaching the maximum step budget (possible cyclic or exponential backtracking).'
      : hasPrefixMatch
      ? `Matched "${matchedPrefix}", but leftover "${leftover}" cannot be derived by ${grammar.startSymbol}.`
      : `Parsing failed: could not derive complete input up to $.`,
    undefined,
    'rejected'
  );

  return {
    grammar,
    diagnostics,
    steps,
    accepted: false,
    statusMessage: 'Input rejected by Recursive Descent parser.',
    generatedPseudocode,
  };
}
