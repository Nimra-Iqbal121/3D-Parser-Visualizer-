import { PageId, ParserId } from './types';

export interface ParserMeta {
  id: ParserId;
  pageId: PageId;
  name: string;
  shortName: string;
  family: 'Top-Down' | 'Bottom-Up';
  parentNode: string;
  direction: string;
  derivation: string;
  grammarRequirements: string;
  strategy: string;
  dataStructures: string;
  conflictHandling: string;
  timeComplexity: string;
  powerRank: number;
  advantages: string[];
  limitations: string[];
  summary: string;
  restrictionsNote: string;
}

export const PARSER_METADATA: Record<ParserId, ParserMeta> = {
  rd: {
    id: 'rd',
    pageId: 'rd',
    name: 'Recursive Descent Parser',
    shortName: 'Recursive Descent',
    family: 'Top-Down',
    parentNode: 'Top-Down Parser',
    direction: 'Top-Down (Root → Leaves)',
    derivation: 'Leftmost derivation',
    grammarRequirements: 'No left recursion (immediate or indirect). Ordered alternatives should list longer prefixes first when backtracking.',
    strategy: 'One recursive procedure per non-terminal; matches terminals or tries alternatives with optional backtracking.',
    dataStructures: 'Implicit/explicit function call stack, input cursor, recursive parse tree nodes.',
    conflictHandling: 'Backtracks across failed branches; loops infinitely on left recursion unless prevented.',
    timeComplexity: 'O(n) predictive; up to exponential with unconstrained backtracking.',
    powerRank: 1,
    advantages: [
      'Direct, intuitive mapping from grammar rules to readable code.',
      'Easy to attach custom semantic actions and detailed syntax error messages.',
      'No external parser generator table required.',
    ],
    limitations: [
      'Cannot handle immediate or indirect left recursion.',
      'Backtracking can be slow on deeply nested ambiguous prefixes.',
      'Harder to maintain for large expression grammars compared to LR generators.',
    ],
    summary: 'Constructs a parse tree top-down by invoking a mutually recursive procedure for each non-terminal.',
    restrictionsNote: 'Grammar must be free of immediate and indirect left recursion. Place longer matching alternatives before shorter prefixes (e.g. T + E | T).',
  },
  ll1: {
    id: 'll1',
    pageId: 'll1',
    name: 'LL(1) Predictive Parser',
    shortName: 'LL(1)',
    family: 'Top-Down',
    parentNode: 'Top-Down Parser',
    direction: 'Top-Down (Left-to-right scan, Leftmost derivation)',
    derivation: 'Leftmost derivation (1 token lookahead)',
    grammarRequirements: 'Must be unambiguous, free of left recursion, left-factored, and have disjoint FIRST/FOLLOW table entries.',
    strategy: 'Non-recursive table-driven stack machine consulting M[NonTerminal, Lookahead] with zero backtracking.',
    dataStructures: 'Explicit symbol stack, FIRST & FOLLOW sets, 2D predictive parsing table M[A, a].',
    conflictHandling: 'Detects FIRST/FIRST and FIRST/FOLLOW multi-entry table cells at construction time.',
    timeComplexity: 'O(n) linear time in input length.',
    powerRank: 2,
    advantages: [
      'Guaranteed linear-time O(n) execution with zero backtracking.',
      'Clear, human-readable predictive table directly derived from FIRST and FOLLOW sets.',
      'Detects syntax errors at the earliest possible input token.',
    ],
    limitations: [
      'Strict grammar class: requires eliminating left recursion and left factoring.',
      'Cannot directly express natural left-associative arithmetic rules without refactoring.',
      'Strictly less expressive than SLR(1), LALR(1), and CLR(1).',
    ],
    summary: 'Uses FIRST and FOLLOW sets to build a deterministic predictive table M[A, a] that drives a symbol stack without backtracking.',
    restrictionsNote: 'Requires no left recursion, left-factored prefixes, and single-entry M[A, a] cells (no FIRST/FIRST or FIRST/FOLLOW conflicts).',
  },
  opp: {
    id: 'opp',
    pageId: 'opp',
    name: 'Operator Precedence Parser',
    shortName: 'OPP',
    family: 'Bottom-Up',
    parentNode: 'Bottom-Up Parser',
    direction: 'Bottom-Up (Leaves → Root)',
    derivation: 'Reverse rightmost derivation (handle reduction)',
    grammarRequirements: 'Must be an Operator Grammar: no ε-productions and no two adjacent non-terminals on any RHS.',
    strategy: 'Compares top stack terminal against next input token via <, =, > relations to decide Shift vs Reduce.',
    dataStructures: 'Symbol stack, FIRSTVT & LASTVT sets, terminal-by-terminal precedence matrix.',
    conflictHandling: 'Flags multi-relation cells; resolves standard binary operator ambiguity using algebraic precedence & associativity.',
    timeComplexity: 'O(n) linear time.',
    powerRank: 2,
    advantages: [
      'Handles natural ambiguous arithmetic grammars (E → E + E | E * E) effortlessly.',
      'Very compact precedence matrix indexed only by terminals.',
      'Fast and simple to implement for expression sub-languages.',
    ],
    limitations: [
      'Restricted strictly to operator grammars (no ε, no adjacent non-terminals).',
      'Handles unary vs binary operators with the same token (e.g. unary minus) awkwardly.',
      'Cannot parse general programming language statements.',
    ],
    summary: 'A bottom-up shift-reduce parser specialized for expressions using FIRSTVT/LASTVT precedence relations (<, =, >).',
    restrictionsNote: 'Must be an Operator Grammar: strictly forbids ε-productions and two adjacent non-terminals (e.g. A B) on any right-hand side.',
  },
  lr0: {
    id: 'lr0',
    pageId: 'lr0',
    name: 'LR(0) Parser',
    shortName: 'LR(0)',
    family: 'Bottom-Up',
    parentNode: 'LR Parser',
    direction: 'Bottom-Up (Left-to-right scan, Rightmost derivation in reverse)',
    derivation: 'Reverse rightmost derivation (0 lookahead)',
    grammarRequirements: 'No state may contain both a shift item and a complete reduce item, or two distinct complete items.',
    strategy: 'Builds canonical LR(0) DFA using Closure and GOTO; places Reduce across every terminal column indiscriminately.',
    dataStructures: 'State & symbol stack, LR(0) item sets, DFA graph, ACTION & GOTO tables.',
    conflictHandling: 'Reports Shift/Reduce and Reduce/Reduce conflicts whenever a complete item coexists with another action.',
    timeComplexity: 'O(n) linear time.',
    powerRank: 3,
    advantages: [
      'Smallest possible LR automaton foundation; conceptually cleanest LR construction.',
      'Handles left recursion naturally without grammar rewriting.',
      'Linear O(n) shift-reduce execution.',
    ],
    limitations: [
      'Too weak for most practical grammars (even standard E → E + T | T causes Shift/Reduce conflicts).',
      'Ignores lookahead completely when deciding when to reduce.',
    ],
    summary: 'The foundational shift-reduce automaton using LR(0) items without lookahead—educational stepping stone to SLR(1) and LALR(1).',
    restrictionsNote: 'Because LR(0) places reduce actions in every terminal column, any state with both a shift and a completed item triggers a Shift/Reduce conflict.',
  },
  slr1: {
    id: 'slr1',
    pageId: 'slr1',
    name: 'SLR(1) Parser',
    shortName: 'SLR(1)',
    family: 'Bottom-Up',
    parentNode: 'LR Parser',
    direction: 'Bottom-Up (Left-to-right scan, Rightmost derivation in reverse)',
    derivation: 'Reverse rightmost derivation (1-token FOLLOW lookahead)',
    grammarRequirements: 'Uses LR(0) states; valid when FOLLOW sets resolve all Shift/Reduce and Reduce/Reduce ambiguities.',
    strategy: 'Same DFA states as LR(0), but places Reduce(A → α) only in columns belonging to FOLLOW(A).',
    dataStructures: 'State & symbol stack, LR(0) item sets, FIRST & FOLLOW sets, ACTION & GOTO tables.',
    conflictHandling: 'Eliminates many LR(0) conflicts via FOLLOW(A), but still fails when global FOLLOW is too coarse for local context.',
    timeComplexity: 'O(n) linear time.',
    powerRank: 4,
    advantages: [
      'Same compact state count as LR(0) while parsing full left-recursive arithmetic grammars cleanly.',
      'Fast and easy to construct using FOLLOW sets.',
      'Directly supports left-associative expression grammars.',
    ],
    limitations: [
      'Uses global FOLLOW(A) instead of exact state-specific lookaheads.',
      'Fails on context-sensitive constructs like pointer assignments (S → L = R | R).',
    ],
    summary: 'Simple LR(1) upgrades LR(0) by restricting reductions of A → α strictly to lookahead tokens inside FOLLOW(A).',
    restrictionsNote: 'Uses global FOLLOW(A) sets across all states; if a terminal appears in FOLLOW(A) globally even when invalid in a specific state, a conflict occurs.',
  },
  clr1: {
    id: 'clr1',
    pageId: 'clr1',
    name: 'CLR(1) Parser',
    shortName: 'CLR(1)',
    family: 'Bottom-Up',
    parentNode: 'LR Parser',
    direction: 'Bottom-Up (Left-to-right scan, Rightmost derivation in reverse)',
    derivation: 'Reverse rightmost derivation (1-token context-specific lookahead)',
    grammarRequirements: 'Recognizes the entire class of deterministic LR(1) context-free languages.',
    strategy: 'Tracks explicit lookahead symbols inside every LR(1) item [A → α · β, a] during Closure and GOTO.',
    dataStructures: 'State & symbol stack, LR(1) canonical item sets, larger DFA graph, ACTION & GOTO tables.',
    conflictHandling: 'Most powerful 1-token LR conflict avoidance; conflicts here generally imply genuine grammar ambiguity.',
    timeComplexity: 'O(n) linear time (larger table footprint).',
    powerRank: 6,
    advantages: [
      'Maximum expressive power among all 1-token lookahead parsers (LL(1) ⊂ SLR(1) ⊂ LALR(1) ⊂ CLR(1)).',
      'Exact per-state lookaheads eliminate spurious SLR(1) and LALR(1) conflicts.',
      'Detects syntax errors immediately before performing invalid reductions.',
    ],
    limitations: [
      'Can generate significantly more DFA states than SLR(1) and LALR(1).',
      'Larger ACTION/GOTO tables increase memory footprint for huge languages.',
    ],
    summary: 'Canonical LR(1) attaches exact lookahead terminals to every item, achieving the full theoretical power of LR(1) parsing.',
    restrictionsNote: 'Recognizes all deterministic LR(1) grammars; produces more states when identical LR(0) cores appear with different lookahead contexts.',
  },
  lalr1: {
    id: 'lalr1',
    pageId: 'lalr1',
    name: 'LALR(1) Parser',
    shortName: 'LALR(1)',
    family: 'Bottom-Up',
    parentNode: 'LR Parser',
    direction: 'Bottom-Up (Left-to-right scan, Rightmost derivation in reverse)',
    derivation: 'Reverse rightmost derivation (merged LR(1) lookaheads)',
    grammarRequirements: 'Valid when merging CLR(1) states with identical LR(0) cores introduces no Reduce/Reduce conflicts.',
    strategy: 'Builds CLR(1) collection, identifies states with identical LR(0) cores, merges them, and unions their lookaheads.',
    dataStructures: 'State & symbol stack, merged LR(1) item sets, compact DFA (same state count as LR(0)/SLR(1)), ACTION & GOTO tables.',
    conflictHandling: 'Never introduces new Shift/Reduce conflicts over CLR(1), but can occasionally introduce Reduce/Reduce conflicts.',
    timeComplexity: 'O(n) linear time with compact tables.',
    powerRank: 5,
    advantages: [
      'Industry standard (used by Yacc, Bison, Menhir): combines SLR(1) table size with near-CLR(1) power.',
      'Solves classic SLR(1) failures (like pointer assignments) with far fewer states than CLR(1).',
      'Guarantees no new Shift/Reduce conflicts are introduced during state merging.',
    ],
    limitations: [
      'Merging identical cores can rarely introduce a Reduce/Reduce conflict absent in CLR(1).',
      'May perform extra reductions before reporting an error compared to pure CLR(1).',
    ],
    summary: 'Look-Ahead LR(1) merges CLR(1) states sharing the same LR(0) core—delivering compact tables with near-full LR(1) power.',
    restrictionsNote: 'Merging identical cores never introduces Shift/Reduce conflicts, but can occasionally cause Reduce/Reduce conflicts if two reductions share merged lookaheads.',
  },
};

export interface PresetComparison {
  id: string;
  label: string;
  left: ParserId;
  right: ParserId;
  keyTakeaway: string;
}

export const PRESET_COMPARISONS: PresetComparison[] = [
  {
    id: 'td-vs-bu',
    label: 'LL(1) vs SLR(1) (Top-Down vs Bottom-Up)',
    left: 'll1',
    right: 'slr1',
    keyTakeaway: 'Top-Down builds leftmost derivations and rejects left recursion; Bottom-Up builds reverse rightmost derivations and embraces left-recursive rules naturally.',
  },
  {
    id: 'rd-vs-ll1',
    label: 'Recursive Descent vs LL(1)',
    left: 'rd',
    right: 'll1',
    keyTakeaway: 'Recursive Descent encodes rules as functions (and can backtrack), whereas LL(1) drives a non-recursive stack strictly in O(n) via FIRST/FOLLOW tables.',
  },
  {
    id: 'opp-vs-lr',
    label: 'OPP vs SLR(1) (OPP vs LR)',
    left: 'opp',
    right: 'slr1',
    keyTakeaway: 'OPP requires an operator grammar and only compares terminals (<, =, >), whereas LR parsers track full viable prefixes across states for arbitrary CFGs.',
  },
  {
    id: 'lr0-vs-slr1',
    label: 'LR(0) vs SLR(1)',
    left: 'lr0',
    right: 'slr1',
    keyTakeaway: 'Both share the exact same DFA states, but SLR(1) restricts reductions to FOLLOW(A), eliminating Shift/Reduce conflicts on arithmetic expressions.',
  },
  {
    id: 'slr1-vs-clr1',
    label: 'SLR(1) vs CLR(1)',
    left: 'slr1',
    right: 'clr1',
    keyTakeaway: 'SLR(1) uses global FOLLOW sets; CLR(1) carries exact state-specific lookaheads inside every item, resolving context-sensitive conflicts at the cost of more states.',
  },
  {
    id: 'clr1-vs-lalr1',
    label: 'CLR(1) vs LALR(1)',
    left: 'clr1',
    right: 'lalr1',
    keyTakeaway: 'LALR(1) merges CLR(1) states that share identical LR(0) cores, shrinking state count back to SLR(1) size while preserving almost all CLR(1) parsing power.',
  },
];

export interface TheoryTopic {
  id: string;
  title: string;
  category: 'Foundations' | 'Top-Down' | 'Bottom-Up' | 'Core Algorithms';
  summary: string;
  keyPoints: string[];
  formula?: string;
  example?: string;
  relatedParser?: ParserId;
}

export const THEORY_TOPICS: TheoryTopic[] = [
  {
    id: 'what-is-parser',
    title: 'What Is a Parser & Role in Compiler Design?',
    category: 'Foundations',
    summary:
      'A parser (syntax analyzer) is the second phase of a compiler front-end. It receives a linear stream of tokens from the lexical analyzer and checks whether the sequence obeys the Context-Free Grammar (CFG) of the language, constructing a parse tree or abstract syntax tree (AST).',
    keyPoints: [
      'Input: Stream of terminals (tokens) produced by the lexer, terminated by end-marker $.',
      'Output: Structured parse tree / derivation verifying syntactic validity, or pinpoint syntax errors.',
      'Context-Free Grammar G = (V, T, P, S): Non-terminals V, Terminals T, Productions P, Start symbol S.',
    ],
    formula: 'Source Code → [Lexer] → Tokens → [Parser] → Parse Tree / AST → [Semantic Analyzer]',
    example: 'Tokens "id + id * id" are grouped hierarchically as (id + (id * id)) rather than ((id + id) * id).',
  },
  {
    id: 'top-down-vs-bottom-up',
    title: 'Top-Down vs. Bottom-Up Parsing',
    category: 'Foundations',
    summary:
      'Every parser builds the parse tree between the start symbol (root) and the input tokens (leaves), differing in construction direction and derivation order.',
    keyPoints: [
      'Top-Down (RD, LL(1)): Starts from the root start symbol S and expands non-terminals toward the leaves using a Leftmost Derivation.',
      'Bottom-Up (OPP, LR family): Starts from the input tokens and repeatedly identifies handles to reduce back up to S using a Reverse Rightmost Derivation.',
      'Bottom-Up LR parsers accept a strictly larger set of grammars than Top-Down LL(1) parsers and allow left recursion.',
    ],
    formula: 'Top-Down: S ⇒lm* w      |      Bottom-Up: w ⇐rm* S',
  },
  {
    id: 'recursive-descent-theory',
    title: 'Recursive Descent Parsing',
    category: 'Top-Down',
    summary:
      'Implements each non-terminal A as a dedicated recursive function parse_A(). When expanding A → X1 X2 ... Xk, terminals are matched against the input cursor and non-terminals trigger recursive calls.',
    keyPoints: [
      'Natural correspondence between grammar structure and call-stack frames.',
      'Left recursion (E → E + T) causes immediate infinite recursion without advancing input.',
      'Backtracking allows trying multiple alternatives, though predictive 1-token selection is faster.',
    ],
    example: 'E -> T + E | T  |  T -> id   on   "id + id"   calls E() → T() → match("+") → E() → T().',
    relatedParser: 'rd',
  },
  {
    id: 'first-and-follow',
    title: 'FIRST and FOLLOW Sets',
    category: 'Core Algorithms',
    summary:
      'FIRST(α) is the set of terminals that can begin strings derived from α (plus ε if α ⇒* ε). FOLLOW(A) is the set of terminals (including $) that can appear immediately to the right of A in some sentential form.',
    keyPoints: [
      'Rule 1 (FIRST): If X is terminal, FIRST(X) = {X}. If X → ε, add ε to FIRST(X).',
      'Rule 2 (FIRST): For X → Y1 Y2 ... Yk, add FIRST(Yi) \\ {ε} until a non-nullable Yi stops propagation.',
      'Rule 3 (FOLLOW): Add $ to FOLLOW(S). For A → α B β, add FIRST(β) \\ {ε} to FOLLOW(B); if β ⇒* ε, add FOLLOW(A) to FOLLOW(B).',
    ],
    formula: 'M[A, a] = A → α  for a ∈ FIRST(α);  if ε ∈ FIRST(α), M[A, b] = A → α  for b ∈ FOLLOW(A)',
    relatedParser: 'll1',
  },
  {
    id: 'll1-theory',
    title: 'LL(1) Predictive Parsing',
    category: 'Top-Down',
    summary:
      'LL(1) scans Left-to-right, produces a Leftmost derivation, and uses 1 lookahead token to select a unique production from table M[A, a].',
    keyPoints: [
      'Eliminate Left Recursion: Transform A → Aα | β into A → βA\' and A\' → αA\' | ε.',
      'Left Factoring: Transform A → αβ1 | αβ2 into A → αA\' and A\' → β1 | β2.',
      'Stack pushes RHS symbols in reverse order so the leftmost symbol sits on top.',
    ],
    example: "E -> T E', E' -> + T E' | ε, T -> F T', T' -> * F T' | ε, F -> ( E ) | id",
    relatedParser: 'll1',
  },
  {
    id: 'opp-theory',
    title: 'Operator Precedence Parsing (OPP)',
    category: 'Bottom-Up',
    summary:
      'Parses operator grammars directly using three precedence relations between the top stack terminal (a) and incoming lookahead token (b):',
    keyPoints: [
      'a < b (Yields precedence): Shift b onto the stack — b binds tighter and belongs deeper in the tree.',
      'a = b (Equal precedence): Shift b onto the stack — matched delimiters such as "(" and ")".',
      'a > b (Takes precedence): Reduce the handle on top of the stack before shifting b.',
      'FIRSTVT(P) and LASTVT(P) find the leading and trailing terminals reachable from each non-terminal.',
    ],
    formula: 'a < b ⇒ Shift   |   a = b ⇒ Shift   |   a > b ⇒ Reduce Handle',
    example: 'On "id + id * id": + < * forces shifting *, then * > $ reduces id * id before +.',
    relatedParser: 'opp',
  },
  {
    id: 'closure-and-goto',
    title: 'LR Items, Closure & GOTO',
    category: 'Core Algorithms',
    summary:
      'An LR item A → α · β marks how much of a production has already been seen (α on the stack) and what is still expected (β in the input).',
    keyPoints: [
      'Augmented Grammar: Add S\' → S so acceptance is uniquely triggered when reducing S\' → S · on $.',
      'Closure(I): Whenever A → α · B β is in I and B is a non-terminal, add B → · γ for all productions of B.',
      'GOTO(I, X): Advance the dot past symbol X for all items A → α · X β in I, then take Closure.',
    ],
    formula: 'GOTO(I, X) = Closure({ [A → α X · β] | [A → α · X β] ∈ I })',
    relatedParser: 'lr0',
  },
  {
    id: 'shift-reduce-conflicts',
    title: 'Shift/Reduce Operations & Parsing Conflicts',
    category: 'Bottom-Up',
    summary:
      'Bottom-up LR parsers operate via four actions: Shift (push input token & next state), Reduce (pop handle & follow GOTO), Accept, and Error.',
    keyPoints: [
      'Shift/Reduce Conflict: A state can either shift the lookahead token or reduce a completed item on the same terminal.',
      'Reduce/Reduce Conflict: Two different completed items in the same state both apply on the same lookahead terminal.',
      'Hierarchy of Power: LR(0) ⊂ SLR(1) ⊂ LALR(1) ⊂ CLR(1).',
    ],
    formula: 'LR(0) (no lookahead) → SLR(1) (FOLLOW) → LALR(1) (merged LR(1)) → CLR(1) (exact LR(1))',
    relatedParser: 'slr1',
  },
];
