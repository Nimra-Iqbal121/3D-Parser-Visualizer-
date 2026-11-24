import {
  EPSILON,
  EOF_SYMBOL,
  ParsedGrammar,
  ParserDiagnostic,
  Production,
} from './types';

const EPSILON_ALIASES = new Set([
  'ε',
  'eps',
  'epsilon',
  "''",
  '""',
  'λ',
  'lambda',
  'empty',
]);

const KNOWN_LOWERCASE_TERMINALS = new Set([
  'id',
  'num',
  'int',
  'float',
  'double',
  'char',
  'bool',
  'str',
  'string',
  'void',
  'if',
  'then',
  'else',
  'elif',
  'while',
  'do',
  'for',
  'begin',
  'end',
  'true',
  'false',
  'null',
  'not',
  'and',
  'or',
  'var',
  'let',
  'const',
  'fn',
  'def',
  'return',
  'print',
  'read',
  'write',
  'class',
  'new',
  'switch',
  'case',
  'break',
  'continue',
  'in',
  'to',
  'of',
]);

const KNOWN_UPPERCASE_TERMINALS = new Set([
  'ID',
  'NUM',
  'INT',
  'IF',
  'AND',
  'OR',
  'NOT',
  'EQ',
  'NE',
  'LE',
  'GE',
  'LT',
  'GT',
]);

const MULTI_CHAR_OPERATORS = ['<=', '>=', '==', '!=', '&&', '||', '**', ':=', '++', '--'];
const PUNCT_CHAR_RE = /^[()[\]{}+\-*/^=,;:<>!&|@#%~.]$/;
const KNOWN_LOWER_SORTED = Array.from(KNOWN_LOWERCASE_TERMINALS).sort((a, b) => b.length - a.length);

export function isEpsilonSymbol(sym: string): boolean {
  return EPSILON_ALIASES.has(sym.trim().toLowerCase()) || sym.trim() === EPSILON;
}

export function formatProduction(p: Production): string {
  const rhsStr = p.rhs.length === 0 ? EPSILON : p.rhs.join(' ');
  return `${p.lhs} → ${rhsStr}`;
}

export function cloneTree<T>(node: T): T {
  return node ? JSON.parse(JSON.stringify(node)) : node;
}

/**
 * Splits a production RHS on `|` while ignoring `|` inside single/double quotes.
 */
function splitAlternatives(rhsPart: string): string[] {
  const result: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (let i = 0; i < rhsPart.length; i++) {
    const ch = rhsPart[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
    } else if ((ch === "'" || ch === '"') && rhsPart.indexOf(ch, i + 1) !== -1) {
      // Only treat `'` as opening quote if it's not a prime right after an identifier like E'
      const prev = i > 0 ? rhsPart[i - 1] : '';
      if (ch === "'" && /[A-Za-z0-9']/.test(prev)) {
        current += ch;
      } else {
        quote = ch;
        current += ch;
      }
    } else if (ch === '|') {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Tokenizes a single whitespace-delimited RHS chunk into grammar symbols.
 * Handles both spaced notation (`S -> A A`, `F -> ( E ) | id`) and compact textbook
 * notation (`S -> AA`, `A -> aA | b`, `E -> E+T | T`, `E -> TE'`, `E' -> +TE' | ε`, `F -> (E) | id`, `S -> aSb`).
 */
function tokenizeRhsChunk(
  chunk: string,
  sortedNonTerminals: string[],
  lhsSet: Set<string>
): string[] {
  if (!chunk) return [];
  if (lhsSet.has(chunk) || isEpsilonSymbol(chunk)) return [chunk];
  if (chunk.length === 1) return [chunk];

  // Explicit quoted terminal like 'a', '+', "id"
  if (
    chunk.length >= 3 &&
    ((chunk.startsWith("'") && chunk.endsWith("'") && chunk.indexOf("'", 1) === chunk.length - 1) ||
      (chunk.startsWith('"') && chunk.endsWith('"') && chunk.indexOf('"', 1) === chunk.length - 1))
  ) {
    return [chunk.slice(1, -1)];
  }

  if (KNOWN_LOWERCASE_TERMINALS.has(chunk) || KNOWN_UPPERCASE_TERMINALS.has(chunk)) {
    return [chunk];
  }
  if (MULTI_CHAR_OPERATORS.includes(chunk)) {
    return [chunk];
  }

  // Pure lowercase identifier (e.g., "foo", "expr", "ab") that contains NO defined non-terminals
  // is kept intact here; Pass 2b handles splitting like `ab` -> `a b` when `a` and `b` are single-char terminals.
  if (/^[a-z_][a-z0-9_]*$/.test(chunk)) {
    const containsNT = sortedNonTerminals.some((nt) => chunk.includes(nt));
    if (!containsNT) return [chunk];
  }

  // Pure single undefined uppercase non-terminal like "X'" or "T1"
  if (/^[A-Z][0-9]*'*$/.test(chunk)) {
    return [chunk];
  }

  // Mixed or glued chunk: scan left-to-right with maximal munch
  const tokens: string[] = [];
  let pos = 0;

  while (pos < chunk.length) {
    const rest = chunk.slice(pos);

    // 1. Quoted literal inside a glued chunk (e.g. 'a'S'b')
    if (
      (chunk[pos] === "'" || chunk[pos] === '"') &&
      (pos === 0 || !/[A-Za-z0-9']/.test(chunk[pos - 1]))
    ) {
      const closeIdx = chunk.indexOf(chunk[pos], pos + 1);
      if (closeIdx > pos + 1) {
        tokens.push(chunk.slice(pos + 1, closeIdx));
        pos = closeIdx + 1;
        continue;
      }
    }

    // 2. Multi-character operators
    const multiOp = MULTI_CHAR_OPERATORS.find((op) => rest.startsWith(op));
    if (multiOp) {
      tokens.push(multiOp);
      pos += multiOp.length;
      continue;
    }

    // 3. Single-character punctuation / operators
    if (PUNCT_CHAR_RE.test(chunk[pos])) {
      tokens.push(chunk[pos]);
      pos += 1;
      continue;
    }

    // 4. Defined non-terminals (longest first, so E' matches before E)
    let matchedNT: string | null = null;
    for (const nt of sortedNonTerminals) {
      if (!rest.startsWith(nt)) continue;
      // Avoid matching a lowercase NT inside a known lowercase keyword like `if` or `id`
      if (/^[a-z]/.test(nt)) {
        const kwMatch = KNOWN_LOWER_SORTED.find(
          (kw) => rest.startsWith(kw) && !/[a-z0-9_]/.test(rest[kw.length] ?? '')
        );
        if (kwMatch && kwMatch.length > nt.length) continue;
      }
      matchedNT = nt;
      break;
    }
    if (matchedNT) {
      tokens.push(matchedNT);
      pos += matchedNT.length;
      continue;
    }

    // 5. Known uppercase terminals (ID, NUM, INT, etc.)
    const upperTerm = Array.from(KNOWN_UPPERCASE_TERMINALS).find(
      (ut) => rest.startsWith(ut) && !/[A-Z0-9']/.test(rest[ut.length] ?? '')
    );
    if (upperTerm) {
      tokens.push(upperTerm);
      pos += upperTerm.length;
      continue;
    }

    // 6. Undefined uppercase non-terminal symbol (e.g., X, B', T1)
    const undefNtMatch = rest.match(/^[A-Z][0-9]*'*/);
    if (undefNtMatch) {
      tokens.push(undefNtMatch[0]);
      pos += undefNtMatch[0].length;
      continue;
    }

    // 7. Known lowercase terminal keyword (e.g. id, num, if, else) at word boundary
    const kwMatch = KNOWN_LOWER_SORTED.find(
      (kw) => rest.startsWith(kw) && !/[a-z]/.test(rest[kw.length] ?? '')
    );
    if (kwMatch) {
      tokens.push(kwMatch);
      pos += kwMatch.length;
      continue;
    }

    // 8. Lowercase letter run before next NT / punctuation
    const lowerMatch = rest.match(/^[a-z]+/);
    if (lowerMatch) {
      const word = lowerMatch[0];
      const nextChar = chunk[pos + word.length] ?? '';
      const prevChar = pos > 0 ? chunk[pos - 1] : '';
      const gluedToNT =
        (nextChar !== '' && /[A-Z]/.test(nextChar)) ||
        (prevChar !== '' && /[A-Z']/.test(prevChar));

      if (word.length > 1 && gluedToNT && !KNOWN_LOWERCASE_TERMINALS.has(word)) {
        // e.g. `abS` -> `a`, `b`, `S`
        for (const ch of word) tokens.push(ch);
      } else {
        tokens.push(word);
      }
      pos += word.length;
      continue;
    }

    // 9. Digit run
    const numMatch = rest.match(/^[0-9]+/);
    if (numMatch) {
      const digits = numMatch[0];
      const nextChar = chunk[pos + digits.length] ?? '';
      const prevChar = pos > 0 ? chunk[pos - 1] : '';
      const gluedToNT =
        (nextChar !== '' && /[A-Z]/.test(nextChar)) ||
        (prevChar !== '' && /[A-Z']/.test(prevChar));
      if (digits.length > 1 && gluedToNT) {
        for (const ch of digits) tokens.push(ch);
      } else {
        tokens.push(digits);
      }
      pos += digits.length;
      continue;
    }

    // 10. Fallback single character
    tokens.push(chunk[pos]);
    pos += 1;
  }

  return tokens;
}

/**
 * Parses a user-supplied context-free grammar into structured productions.
 * Supports `->`, `→`, `::=`, `:=`, `=>`, alternatives with `|`, primed non-terminals like `E'`,
 * both spaced (`S -> A A`) and compact textbook notation (`S -> AA`, `E -> E+T | T`, `F -> (E) | id`),
 * multi-character tokens like `id`, `num`, `if`, `else`, and epsilon aliases.
 */
export function parseGrammarText(
  rawText: string,
  explicitStartSymbol?: string
): { grammar: ParsedGrammar | null; diagnostics: ParserDiagnostic[] } {
  const diagnostics: ParserDiagnostic[] = [];
  const lines = rawText.split(/\r?\n/);
  const productions: Production[] = [];
  const lhsSet = new Set<string>();
  let prodId = 0;

  if (!rawText.trim()) {
    diagnostics.push({
      id: 'empty-grammar',
      code: 'SYN_EMPTY',
      category: 'invalid-grammar',
      severity: 'error',
      title: 'Missing Grammar Productions',
      location: 'Grammar Editor (Line 1)',
      violatedRule: 'A context-free grammar must contain at least one production rule (A → α).',
      explanation: 'No production rules were found in the grammar input field.',
      suggestion: 'Enter at least one production using "->" or "→" (for example: "S -> A A").',
      correctedGrammar: "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id",
    });
    return { grammar: null, diagnostics };
  }

  // Pass 1: Validate line syntax and collect ALL defined LHS non-terminals first
  // so unspaced RHS rules like `S -> AA` or `E -> TE'` can recognize `A`, `T`, `E'` accurately.
  const parsedLines: Array<{ lineNum: number; stripped: string; lhs: string; rhsPart: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    let stripped = lines[i].replace(/\/\/.*$/, '').trim();
    if (!stripped) continue;

    // Strip optional textbook rule numbering like "1. S -> ..." or "(1) S -> ..."
    stripped = stripped.replace(/^(?:\(\d+\)|\d+[.)])\s+/, '');

    // Split on ->, →, ::=, :=, or =>
    const arrowMatch = stripped.match(/^(.*?)\s*(?:->|→|::=|:=|=>)\s*(.*)$/);
    if (!arrowMatch) {
      diagnostics.push({
        id: `syn-line-${lineNum}`,
        code: 'SYN_ARROW',
        category: 'invalid-grammar',
        severity: 'error',
        title: 'Invalid Production Syntax',
        location: `Line ${lineNum}: "${stripped}"`,
        violatedRule: 'Every production must have the form: NonTerminal -> RHS1 | RHS2',
        explanation: `Line ${lineNum} is missing a production arrow ("->", "→", or "::=") separating the left-hand side from the right-hand side.`,
        suggestion: 'Insert "->" between the left-hand side non-terminal and its right-hand side symbols.',
        correctedGrammar: rawText
          .split(/\r?\n/)
          .map((l, idx) =>
            idx === i
              ? `${l.trim().split(/\s+/)[0] || 'S'} -> ${l.trim().split(/\s+/).slice(1).join(' ') || 'id'}`
              : l
          )
          .join('\n'),
      });
      continue;
    }

    const lhs = arrowMatch[1].trim();
    const rhsPart = arrowMatch[2].trim();

    if (!lhs || /\s/.test(lhs)) {
      diagnostics.push({
        id: `syn-lhs-${lineNum}`,
        code: 'SYN_LHS',
        category: 'invalid-grammar',
        severity: 'error',
        title: 'Invalid Left-Hand Side Symbol',
        location: `Line ${lineNum}: "${lhs || '(empty)'}"`,
        violatedRule: 'In a Context-Free Grammar (Type-2), the left-hand side must be a single non-terminal symbol.',
        explanation: lhs
          ? `Found multiple tokens ("${lhs}") on the left-hand side. Context-free parsers require exactly one non-terminal on the LHS.`
          : 'The left-hand side before the arrow is empty.',
        suggestion: 'Use a single non-terminal identifier such as E, T, F, S, or E\' on the left-hand side.',
      });
      continue;
    }

    if (!rhsPart) {
      diagnostics.push({
        id: `syn-rhs-empty-${lineNum}`,
        code: 'SYN_EMPTY_RHS',
        category: 'invalid-grammar',
        severity: 'error',
        title: 'Empty Right-Hand Side',
        location: `Line ${lineNum}: "${stripped}"`,
        violatedRule: 'An empty derivation must be written explicitly with ε (or eps).',
        explanation: `Production for "${lhs}" has nothing after the arrow.`,
        suggestion: `Write "${lhs} -> ε" if you intend an empty (epsilon) production, or supply grammar symbols.`,
      });
      continue;
    }

    lhsSet.add(lhs);
    parsedLines.push({ lineNum, stripped, lhs, rhsPart });
  }

  // Sort non-terminals longest-first for maximal-munch RHS splitting (e.g. `E'` before `E`)
  const sortedNonTerminals = Array.from(lhsSet).sort((a, b) => b.length - a.length);

  // Pass 2: Tokenize RHS alternatives cleanly
  for (const { lineNum, stripped, lhs, rhsPart } of parsedLines) {
    const alternatives = splitAlternatives(rhsPart);

    for (const altRaw of alternatives) {
      const alt = altRaw.trim();
      if (!alt) {
        diagnostics.push({
          id: `syn-alt-empty-${lineNum}`,
          code: 'SYN_EMPTY_ALT',
          category: 'invalid-grammar',
          severity: 'error',
          title: 'Empty Alternative After "|"',
          location: `Line ${lineNum}: "${stripped}"`,
          violatedRule: 'Each "|" separator must be followed by symbols or explicit ε.',
          explanation: `There is a trailing or consecutive "|" with no symbols in the rule for "${lhs}".`,
          suggestion: `Remove the extra "|" or replace the blank branch with "ε".`,
        });
        continue;
      }

      if (isEpsilonSymbol(alt)) {
        productions.push({
          id: prodId++,
          lhs,
          rhs: [],
          rawLine: lineNum,
        });
        continue;
      }

      const wsChunks = alt.split(/\s+/).filter(Boolean);
      const rawTokens: string[] = [];
      for (const chunk of wsChunks) {
        rawTokens.push(...tokenizeRhsChunk(chunk, sortedNonTerminals, lhsSet));
      }

      const rhs =
        rawTokens.length === 1 && isEpsilonSymbol(rawTokens[0])
          ? []
          : rawTokens.filter((t) => !isEpsilonSymbol(t));

      productions.push({
        id: prodId++,
        lhs,
        rhs,
        rawLine: lineNum,
      });
    }
  }

  // Pass 2b: If a student wrote e.g. `S -> aSb | ab` or `S -> 0S1 | 01`, split glued lowercase/digit
  // base cases like `ab` -> `['a', 'b']` or `01` -> `['0', '1']` when every single character is
  // already used as a 1-character terminal in the grammar and the token is not a known keyword.
  const singleCharTerminals = new Set<string>();
  for (const p of productions) {
    for (const sym of p.rhs) {
      if (!lhsSet.has(sym) && sym.length === 1 && /^[a-z0-9]$/.test(sym)) {
        singleCharTerminals.add(sym);
      }
    }
  }
  if (singleCharTerminals.size > 0) {
    for (const p of productions) {
      const expanded: string[] = [];
      for (const sym of p.rhs) {
        if (
          !lhsSet.has(sym) &&
          sym.length >= 2 &&
          sym.length <= 6 &&
          /^[a-z0-9]+$/.test(sym) &&
          !KNOWN_LOWERCASE_TERMINALS.has(sym) &&
          Array.from(sym).every((ch) => singleCharTerminals.has(ch))
        ) {
          expanded.push(...Array.from(sym));
        } else {
          expanded.push(sym);
        }
      }
      p.rhs = expanded;
    }
  }

  if (productions.length === 0) {
    if (diagnostics.length === 0) {
      diagnostics.push({
        id: 'no-valid-prods',
        code: 'SYN_NO_PRODS',
        category: 'invalid-grammar',
        severity: 'error',
        title: 'No Valid Productions Parsed',
        location: 'Grammar Editor',
        violatedRule: 'At least one valid production rule is required.',
        explanation: 'None of the input lines could be parsed into a valid context-free production.',
        suggestion: 'Use format "E -> E + T | T" or "S -> A A".',
      });
    }
    return { grammar: null, diagnostics };
  }

  // Determine start symbol
  let startSymbol = explicitStartSymbol?.trim() || productions[0].lhs;
  if (explicitStartSymbol?.trim() && !lhsSet.has(startSymbol)) {
    diagnostics.push({
      id: 'invalid-start-symbol',
      code: 'SEM_START',
      category: 'invalid-grammar',
      severity: 'error',
      title: `Undefined Start Symbol "${startSymbol}"`,
      location: `Start Symbol Field`,
      violatedRule: 'The start symbol must appear on the left-hand side of at least one production.',
      explanation: `No production rule defines "${startSymbol}". Defined non-terminals are: ${Array.from(lhsSet).join(', ')}.`,
      suggestion: `Set the start symbol to "${productions[0].lhs}" or add a production rule for "${startSymbol}".`,
    });
    startSymbol = productions[0].lhs;
  }

  const nonTerminals = Array.from(lhsSet);
  const terminalSet = new Set<string>();
  const suspiciousUndefinedNTs: Array<{ sym: string; line: number; prod: Production }> = [];

  for (const p of productions) {
    for (const sym of p.rhs) {
      if (!lhsSet.has(sym)) {
        // Detect likely undefined uppercase non-terminal (e.g., B, X, T') while allowing standard
        // uppercase terminal token names like ID, NUM, INT, IF, AND, OR, NOT.
        if (
          /^[A-Z][A-Z0-9']*$/.test(sym) &&
          sym.length <= 3 &&
          !KNOWN_UPPERCASE_TERMINALS.has(sym)
        ) {
          suspiciousUndefinedNTs.push({ sym, line: p.rawLine, prod: p });
        }
        terminalSet.add(sym);
      }
    }
  }

  if (suspiciousUndefinedNTs.length > 0) {
    const seen = new Set<string>();
    for (const item of suspiciousUndefinedNTs) {
      if (seen.has(item.sym)) continue;
      seen.add(item.sym);
      diagnostics.push({
        id: `undef-nt-${item.sym}`,
        code: 'SEM_UNDEF_NT',
        category: 'invalid-grammar',
        severity: 'error',
        title: `Undefined Non-Terminal "${item.sym}"`,
        location: `Line ${item.line}: ${formatProduction(item.prod)}`,
        violatedRule: 'Every non-terminal symbol referenced on a right-hand side must have at least one defining production.',
        explanation: `Symbol "${item.sym}" uses uppercase non-terminal notation in "${formatProduction(item.prod)}", but has no production rule defining it.`,
        suggestion: `Add a production rule for "${item.sym}" (e.g. "${item.sym} -> id"), or use lowercase if "${item.sym}" is intended as a terminal token.`,
        correctedGrammar: `${rawText.trim()}\n${item.sym} -> id`,
      });
    }
  }

  return {
    grammar: {
      productions,
      startSymbol,
      nonTerminals,
      terminals: Array.from(terminalSet),
      rawText,
    },
    diagnostics,
  };
}

/**
 * Tokenizes an input string against the grammar's known terminals.
 * Supports space-separated tokens, glued inputs (`abab`, `(id+id)*id`),
 * optional trailing `$`, and explicit empty-string input (`ε` / `eps` / `$`).
 */
export function tokenizeInput(
  inputText: string,
  grammar: ParsedGrammar
): { tokens: string[]; diagnostics: ParserDiagnostic[] } {
  const diagnostics: ParserDiagnostic[] = [];
  const trimmed = inputText.trim();

  if (!trimmed) {
    diagnostics.push({
      id: 'empty-input',
      code: 'LEX_EMPTY',
      category: 'runtime-error',
      severity: 'error',
      title: 'Empty Input String',
      location: 'Input Expression Field',
      violatedRule: 'An input expression is required to execute parsing.',
      explanation: 'No input tokens were provided to parse.',
      suggestion: 'Enter a valid sequence of terminals from the grammar (or "ε" to test an empty string on a nullable grammar).',
    });
    return { tokens: [EOF_SYMBOL], diagnostics };
  }

  const terminalSet = new Set(grammar.terminals);
  const sortedTerminals = [...grammar.terminals].sort((a, b) => b.length - a.length);

  // Explicit empty string test via ε, eps, or bare $
  if ((isEpsilonSymbol(trimmed) || trimmed === EOF_SYMBOL) && !terminalSet.has(trimmed)) {
    return { tokens: [EOF_SYMBOL], diagnostics };
  }

  // Strip optional glued trailing `$` (e.g. `abab$` or `id+id$`) when `$` is not a grammar terminal
  const normalizedInput = !terminalSet.has(EOF_SYMBOL)
    ? trimmed.replace(/\s*\$+\s*$/, '').trim()
    : trimmed;

  if (!normalizedInput) {
    return { tokens: [EOF_SYMBOL], diagnostics };
  }

  // Split by whitespace first, then maximally munch each chunk against known terminals
  const rawChunks = normalizedInput.split(/\s+/).filter((c) => c && (terminalSet.has(c) || c !== EOF_SYMBOL));
  const tokens: string[] = [];
  const invalidTokens: Array<{ tok: string; pos: number }> = [];

  for (let chunkIdx = 0; chunkIdx < rawChunks.length; chunkIdx++) {
    const chunk = rawChunks[chunkIdx];
    if (terminalSet.has(chunk)) {
      tokens.push(chunk);
      continue;
    }

    // Attempt maximal munch on glued tokens like "(id+id)" or "abab"
    let pos = 0;
    const subTokens: string[] = [];
    let chunkHadError = false;
    while (pos < chunk.length) {
      let matched: string | null = null;
      for (const term of sortedTerminals) {
        if (term.length > 0 && chunk.startsWith(term, pos)) {
          matched = term;
          break;
        }
      }
      if (matched) {
        subTokens.push(matched);
        pos += matched.length;
      } else {
        // Consume the minimal unrecognized run (either an identifier word or single char)
        // so we can pinpoint the exact offending piece and also suggest fixes (e.g. `a+b` -> `id + id`)
        const rest = chunk.slice(pos);
        const identRun = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
        const badTok = identRun ? identRun[0] : chunk[pos];
        subTokens.push(badTok);
        invalidTokens.push({ tok: badTok, pos: tokens.length + subTokens.length });
        pos += badTok.length;
        chunkHadError = true;
      }
    }

    if (subTokens.length > 0) {
      tokens.push(...subTokens);
    } else if (!chunkHadError) {
      tokens.push(chunk);
      invalidTokens.push({ tok: chunk, pos: tokens.length });
    }
  }

  // Check unmatched parentheses before execution for crystal-clear guidance
  if (terminalSet.has('(') || terminalSet.has(')')) {
    let parenBalance = 0;
    let firstUnmatchedPos = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === '(') parenBalance++;
      else if (tokens[i] === ')') {
        parenBalance--;
        if (parenBalance < 0 && firstUnmatchedPos === -1) {
          firstUnmatchedPos = i + 1;
        }
      }
    }
    if (parenBalance !== 0 || firstUnmatchedPos !== -1) {
      diagnostics.push({
        id: 'unmatched-parens',
        code: 'SYN_PARENS',
        category: 'runtime-error',
        severity: 'error',
        title: 'Unmatched Parentheses in Input',
        location:
          firstUnmatchedPos !== -1
            ? `Token #${firstUnmatchedPos} (unexpected ")")`
            : `End of input (${parenBalance} unclosed "(")`,
        violatedRule: 'Every opening parenthesis "(" must be matched with a corresponding closing parenthesis ")".',
        explanation:
          parenBalance > 0
            ? `The input opens ${parenBalance} more "(" than it closes.`
            : 'A closing ")" appears without a matching opening "(".',
        suggestion:
          parenBalance > 0
            ? `Add ${parenBalance} closing ")" at the appropriate position in your input expression.`
            : 'Remove the extra ")" or insert a matching "(" earlier in the expression.',
        correctedInput:
          parenBalance > 0
            ? `${tokens.join(' ')} ${') '.repeat(parenBalance).trim()}`
            : tokens.filter((t, idx) => !(t === ')' && idx === firstUnmatchedPos - 1)).join(' '),
      });
    }
  }

  if (invalidTokens.length > 0) {
    const validList = grammar.terminals.length > 0 ? grammar.terminals.join(', ') : '(none)';
    const hasIdTerminal = terminalSet.has('id');
    const hasNumTerminal = terminalSet.has('num');

    // If the user wrote variable names like `a + b` or numbers like `2 + 3` for a grammar expecting `id` / `num`,
    // build a clean correctedInput preview!
    let autoMappedInput: string | undefined;
    if (hasIdTerminal || hasNumTerminal) {
      const mapped = tokens.map((t) => {
        if (terminalSet.has(t)) return t;
        if (hasIdTerminal && /^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) return 'id';
        if (hasNumTerminal && /^[0-9]+$/.test(t)) return 'num';
        return t;
      });
      if (mapped.every((t) => terminalSet.has(t))) {
        autoMappedInput = mapped.join(' ');
      }
    }

    for (const inv of invalidTokens) {
      const isIdentForId = hasIdTerminal && /^[A-Za-z_][A-Za-z0-9_]*$/.test(inv.tok);
      const isDigitsForNum = hasNumTerminal && /^[0-9]+$/.test(inv.tok);
      diagnostics.push({
        id: `invalid-token-${inv.pos}`,
        code: 'LEX_UNKNOWN_TOKEN',
        category: 'runtime-error',
        severity: 'error',
        title: `Invalid Input Token "${inv.tok}"`,
        location: `Input Token #${inv.pos}`,
        violatedRule: 'Every input token must belong to the grammar\'s terminal alphabet Σ.',
        explanation: isIdentForId
          ? `Token "${inv.tok}" is not a terminal in this grammar — this grammar represents identifiers with the literal terminal "id". Recognized terminals are: { ${validList} }.`
          : isDigitsForNum
          ? `Token "${inv.tok}" is not a terminal in this grammar — this grammar represents numbers with the literal terminal "num". Recognized terminals are: { ${validList} }.`
          : `Token "${inv.tok}" does not appear as a terminal in any grammar production. Recognized terminals are: { ${validList} }.`,
        suggestion: isIdentForId
          ? `Replace variable names like "${inv.tok}" with "id"${autoMappedInput ? ` (for example: "${autoMappedInput}")` : ''}.`
          : isDigitsForNum
          ? `Replace numeric literals like "${inv.tok}" with "num"${autoMappedInput ? ` (for example: "${autoMappedInput}")` : ''}.`
          : `Replace "${inv.tok}" with a valid terminal from { ${validList} }, or add "${inv.tok}" to your grammar productions.`,
        correctedInput: autoMappedInput,
      });
    }
  }

  tokens.push(EOF_SYMBOL);
  return { tokens, diagnostics };
}

/**
 * Computes FIRST sets for all non-terminals using standard least fixed-point iteration.
 */
export function computeFirstSets(grammar: ParsedGrammar): Record<string, string[]> {
  const first: Record<string, Set<string>> = {};
  const ntSet = new Set(grammar.nonTerminals);

  for (const nt of grammar.nonTerminals) {
    first[nt] = new Set<string>();
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < 200) {
    changed = false;
    guard++;

    for (const prod of grammar.productions) {
      const target = first[prod.lhs];
      if (prod.rhs.length === 0) {
        if (!target.has(EPSILON)) {
          target.add(EPSILON);
          changed = true;
        }
        continue;
      }

      let allNullable = true;
      for (const sym of prod.rhs) {
        if (!ntSet.has(sym)) {
          if (!target.has(sym)) {
            target.add(sym);
            changed = true;
          }
          allNullable = false;
          break;
        } else {
          for (const f of first[sym]) {
            if (f !== EPSILON && !target.has(f)) {
              target.add(f);
              changed = true;
            }
          }
          if (!first[sym].has(EPSILON)) {
            allNullable = false;
            break;
          }
        }
      }

      if (allNullable && !target.has(EPSILON)) {
        target.add(EPSILON);
        changed = true;
      }
    }
  }

  const out: Record<string, string[]> = {};
  for (const nt of grammar.nonTerminals) {
    out[nt] = Array.from(first[nt]);
  }
  return out;
}

/**
 * Computes FIRST(α) for an arbitrary sequence of grammar symbols.
 */
export function computeFirstOfSequence(
  sequence: string[],
  firstSets: Record<string, string[]>,
  nonTerminals: Set<string>
): string[] {
  if (sequence.length === 0) return [EPSILON];

  const result = new Set<string>();
  let allNullable = true;

  for (const sym of sequence) {
    if (sym === EOF_SYMBOL) {
      result.add(EOF_SYMBOL);
      allNullable = false;
      break;
    }
    if (!nonTerminals.has(sym)) {
      result.add(sym);
      allNullable = false;
      break;
    }
    const symFirst = firstSets[sym] || [];
    let hasEps = false;
    for (const f of symFirst) {
      if (f === EPSILON) hasEps = true;
      else result.add(f);
    }
    if (!hasEps) {
      allNullable = false;
      break;
    }
  }

  if (allNullable) result.add(EPSILON);
  return Array.from(result);
}

/**
 * Computes FOLLOW sets for all non-terminals using standard least fixed-point iteration.
 */
export function computeFollowSets(
  grammar: ParsedGrammar,
  firstSets: Record<string, string[]>
): Record<string, string[]> {
  const follow: Record<string, Set<string>> = {};
  const ntSet = new Set(grammar.nonTerminals);

  for (const nt of grammar.nonTerminals) {
    follow[nt] = new Set<string>();
  }
  follow[grammar.startSymbol].add(EOF_SYMBOL);

  let changed = true;
  let guard = 0;
  while (changed && guard < 200) {
    changed = false;
    guard++;

    for (const prod of grammar.productions) {
      const rhs = prod.rhs;
      for (let i = 0; i < rhs.length; i++) {
        const B = rhs[i];
        if (!ntSet.has(B)) continue;

        const beta = rhs.slice(i + 1);
        const firstBeta = computeFirstOfSequence(beta, firstSets, ntSet);

        for (const f of firstBeta) {
          if (f !== EPSILON && !follow[B].has(f)) {
            follow[B].add(f);
            changed = true;
          }
        }

        if (beta.length === 0 || firstBeta.includes(EPSILON)) {
          for (const f of follow[prod.lhs]) {
            if (!follow[B].has(f)) {
              follow[B].add(f);
              changed = true;
            }
          }
        }
      }
    }
  }

  const out: Record<string, string[]> = {};
  for (const nt of grammar.nonTerminals) {
    out[nt] = Array.from(follow[nt]);
  }
  return out;
}

/**
 * Generates a fresh primed non-terminal name not already in the grammar.
 */
function freshNonTerminal(base: string, existing: Set<string>): string {
  let candidate = `${base}'`;
  while (existing.has(candidate)) {
    candidate += "'";
  }
  existing.add(candidate);
  return candidate;
}

/**
 * Detects immediate and indirect left recursion, and generates a corrected grammar
 * using standard immediate left-recursion elimination where immediate left recursion exists.
 */
export function detectLeftRecursion(grammar: ParsedGrammar): {
  hasImmediate: boolean;
  hasIndirect: boolean;
  immediateNTs: string[];
  indirectCycle: string[] | null;
  correctedGrammar: string | null;
  diagnostics: ParserDiagnostic[];
} {
  const diagnostics: ParserDiagnostic[] = [];
  const ntSet = new Set(grammar.nonTerminals);
  const immediateNTs: string[] = [];

  for (const nt of grammar.nonTerminals) {
    const prods = grammar.productions.filter((p) => p.lhs === nt);
    if (prods.some((p) => p.rhs.length > 0 && p.rhs[0] === nt)) {
      immediateNTs.push(nt);
    }
  }

  // Build leftmost dependency graph for indirect left recursion
  const adj: Record<string, Set<string>> = {};
  const firstSets = computeFirstSets(grammar);
  for (const nt of grammar.nonTerminals) adj[nt] = new Set();

  for (const prod of grammar.productions) {
    for (const sym of prod.rhs) {
      if (ntSet.has(sym)) {
        adj[prod.lhs].add(sym);
        if (!firstSets[sym]?.includes(EPSILON)) break;
      } else {
        break;
      }
    }
  }

  const visited = new Set<string>();
  const stack: string[] = [];
  const inStack = new Set<string>();

  function dfs(u: string): string[] | null {
    visited.add(u);
    stack.push(u);
    inStack.add(u);
    for (const v of adj[u]) {
      if (v === u) continue; // immediate handled separately
      if (inStack.has(v)) {
        const idx = stack.indexOf(v);
        return [...stack.slice(idx), v];
      }
      if (!visited.has(v)) {
        const cyc = dfs(v);
        if (cyc) return cyc;
      }
    }
    stack.pop();
    inStack.delete(u);
    return null;
  }

  let indirectCycle: string[] | null = null;
  for (const nt of grammar.nonTerminals) {
    if (!visited.has(nt)) {
      const cyc = dfs(nt);
      if (cyc) {
        indirectCycle = cyc;
        break;
      }
    }
  }

  let correctedGrammar: string | null = null;
  if (immediateNTs.length > 0) {
    const existingNTs = new Set(grammar.nonTerminals);
    const rebuiltLines: string[] = [];

    for (const nt of grammar.nonTerminals) {
      const prods = grammar.productions.filter((p) => p.lhs === nt);
      const alphas = prods.filter((p) => p.rhs[0] === nt).map((p) => p.rhs.slice(1));
      const betas = prods.filter((p) => p.rhs[0] !== nt).map((p) => p.rhs);

      if (alphas.length > 0 && betas.length > 0) {
        const prime = freshNonTerminal(nt, existingNTs);
        const newMain = betas
          .map((b) => (b.length === 0 ? prime : `${b.join(' ')} ${prime}`))
          .join(' | ');
        const newPrime = [...alphas.map((a) => `${a.join(' ')} ${prime}`), EPSILON].join(' | ');
        rebuiltLines.push(`${nt} -> ${newMain}`);
        rebuiltLines.push(`${prime} -> ${newPrime}`);
      } else {
        const alts = prods.map((p) => (p.rhs.length === 0 ? EPSILON : p.rhs.join(' '))).join(' | ');
        rebuiltLines.push(`${nt} -> ${alts}`);
      }
    }
    correctedGrammar = rebuiltLines.join('\n');

    for (const nt of immediateNTs) {
      const recursiveRules = grammar.productions
        .filter((p) => p.lhs === nt && p.rhs[0] === nt)
        .map(formatProduction);
      const lineNum = grammar.productions.find((p) => p.lhs === nt && p.rhs[0] === nt)?.rawLine ?? 1;

      diagnostics.push({
        id: `left-rec-imm-${nt}`,
        code: 'LL1_LEFT_REC',
        category: 'unsupported-algorithm',
        severity: 'error',
        title: `Immediate Left Recursion on "${nt}"`,
        location: `Line ${lineNum}: ${recursiveRules.join(', ')}`,
        violatedRule: 'Top-down parsers (Recursive Descent and LL(1)) cannot contain left recursion (A ⇒+ Aα).',
        explanation: `Non-terminal "${nt}" appears as the very first symbol on its own right-hand side. A top-down parser would expand ${nt} → ${nt}... infinitely without consuming any input token.`,
        suggestion: `Transform "${nt} -> ${nt} α | β" into right-recursive form "${nt} -> β ${nt}'" and "${nt}' -> α ${nt}' | ε".`,
        correctedGrammar,
        noteUniqueness:
          'Left-recursion elimination produces an equivalent right-recursive grammar, which changes associativity of the parse tree; semantics can restore left-associativity during AST construction.',
      });
    }
  }

  if (indirectCycle) {
    diagnostics.push({
      id: `left-rec-ind-${indirectCycle.join('-')}`,
      code: 'LL1_INDIRECT_LEFT_REC',
      category: 'unsupported-algorithm',
      severity: 'error',
      title: `Indirect Left Recursion Cycle (${indirectCycle.join(' → ')})`,
      location: `Non-terminals: ${indirectCycle.join(', ')}`,
      violatedRule: 'Top-down parsers forbid any derivation cycle A ⇒+ Aα.',
      explanation: `Through leftmost derivations, ${indirectCycle.join(' → ')} derives itself without consuming input tokens.`,
      suggestion: 'Substitute productions to convert indirect recursion into immediate left recursion, then eliminate it using helper non-terminals.',
      noteUniqueness: 'Multiple valid substitution orderings exist depending on non-terminal ordering.',
    });
  }

  return {
    hasImmediate: immediateNTs.length > 0,
    hasIndirect: Boolean(indirectCycle),
    immediateNTs,
    indirectCycle,
    correctedGrammar,
    diagnostics,
  };
}

/**
 * Detects common prefixes in productions of the same non-terminal (Left Factoring needed)
 * and synthesizes a left-factored grammar preview.
 */
export function detectLeftFactoring(grammar: ParsedGrammar): {
  needsFactoring: boolean;
  affectedNTs: string[];
  correctedGrammar: string | null;
  diagnostics: ParserDiagnostic[];
} {
  const diagnostics: ParserDiagnostic[] = [];
  const affectedNTs: string[] = [];
  const existingNTs = new Set(grammar.nonTerminals);
  const rebuiltLines: string[] = [];

  for (const nt of grammar.nonTerminals) {
    const prods = grammar.productions.filter((p) => p.lhs === nt);
    // Group productions by their first RHS symbol
    const groups = new Map<string, Production[]>();
    for (const p of prods) {
      const key = p.rhs[0] ?? EPSILON;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }

    let ntFactored = false;
    const newMainAlts: string[] = [];
    const helperLines: string[] = [];

    for (const [firstSym, group] of groups.entries()) {
      if (firstSym !== EPSILON && group.length > 1) {
        ntFactored = true;
        // Find longest common prefix across the group
        let prefixLen = 1;
        while (true) {
          const candidate = group[0].rhs[prefixLen];
          if (!candidate) break;
          if (group.every((g) => g.rhs[prefixLen] === candidate)) {
            prefixLen++;
          } else {
            break;
          }
        }
        const prefix = group[0].rhs.slice(0, prefixLen);
        const prime = freshNonTerminal(nt, existingNTs);
        newMainAlts.push(`${prefix.join(' ')} ${prime}`);

        const suffixes = group.map((g) => {
          const rem = g.rhs.slice(prefixLen);
          return rem.length === 0 ? EPSILON : rem.join(' ');
        });
        helperLines.push(`${prime} -> ${suffixes.join(' | ')}`);

        if (!affectedNTs.includes(nt)) {
          affectedNTs.push(nt);
          diagnostics.push({
            id: `left-factor-${nt}`,
            code: 'LL1_LEFT_FACTOR',
            category: 'parsing-conflict',
            severity: 'warning',
            title: `Left Factoring Needed for "${nt}"`,
            location: `Line ${group[0].rawLine}: ${group.map(formatProduction).join(' | ')}`,
            violatedRule: 'LL(1) predictive parsing requires disjoint FIRST sets for alternative productions of the same non-terminal.',
            explanation: `Multiple productions of "${nt}" begin with the common prefix "${prefix.join(' ')}". With 1 token of lookahead, an LL(1) parser cannot decide which branch to pick.`,
            suggestion: `Factor out the common prefix "${prefix.join(' ')}" into a new non-terminal ${prime} holding the distinct suffixes.`,
          });
        }
      } else {
        for (const p of group) {
          newMainAlts.push(p.rhs.length === 0 ? EPSILON : p.rhs.join(' '));
        }
      }
    }

    rebuiltLines.push(`${nt} -> ${newMainAlts.join(' | ')}`);
    rebuiltLines.push(...helperLines);
    if (ntFactored) {
      // handled above
    }
  }

  const correctedGrammar = affectedNTs.length > 0 ? rebuiltLines.join('\n') : null;
  if (correctedGrammar) {
    for (const d of diagnostics) {
      d.correctedGrammar = correctedGrammar;
    }
  }

  return {
    needsFactoring: affectedNTs.length > 0,
    affectedNTs,
    correctedGrammar,
    diagnostics,
  };
}
