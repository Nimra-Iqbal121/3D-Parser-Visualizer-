export type ParserId = 'rd' | 'll1' | 'opp' | 'lr0' | 'slr1' | 'clr1' | 'lalr1';

export type PageId =
  | 'landing'
  | 'dashboard'
  | 'hierarchy'
  | 'rd'
  | 'll1'
  | 'opp'
  | 'lr-overview'
  | 'lr0'
  | 'slr1'
  | 'clr1'
  | 'lalr1'
  | 'demos'
  | 'errors'
  | 'comparison'
  | 'theory'
  | 'about';

export const EPSILON = 'ε';
export const EOF_SYMBOL = '$';

export interface Production {
  id: number;
  lhs: string;
  rhs: string[]; // empty array or ['ε'] normalized to [] for epsilon
  rawLine: number;
}

export interface ParsedGrammar {
  productions: Production[];
  startSymbol: string;
  nonTerminals: string[];
  terminals: string[];
  rawText: string;
}

export type DiagnosticCategory =
  | 'invalid-grammar'
  | 'unsupported-algorithm'
  | 'parsing-conflict'
  | 'runtime-error';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface ParserDiagnostic {
  id: string;
  code: string;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  title: string;
  location: string;
  violatedRule: string;
  explanation: string;
  suggestion: string;
  correctedGrammar?: string;
  correctedInput?: string;
  noteUniqueness?: string;
}

export interface ParseTreeNode {
  id: string;
  symbol: string;
  isTerminal: boolean;
  children: ParseTreeNode[];
  status?: 'active' | 'matched' | 'reduced' | 'pending' | 'error';
  productionLabel?: string;
}

export type StepOperationType =
  | 'init'
  | 'match'
  | 'expand'
  | 'call'
  | 'return'
  | 'backtrack'
  | 'shift'
  | 'reduce'
  | 'accept'
  | 'error';

export interface ParseStep {
  stepNumber: number;
  operation: StepOperationType;
  stack: string[];
  stateStack?: number[];
  remainingInput: string[];
  currentToken: string;
  production?: string;
  actionLabel: string;
  explanation: string;
  precedenceRelation?: '<' | '=' | '>' | 'none';
  activeState?: number;
  fromState?: number;
  transitionSymbol?: string;
  callDepth?: number;
  callStack?: string[];
  derivation?: string;
  treeSnapshot: ParseTreeNode | null;
  highlightCount?: number; // number of stack top symbols involved in shift/reduce/pop
  status: 'running' | 'accepted' | 'rejected';
}

export interface LL1TableCell {
  entries: Production[];
  hasConflict: boolean;
  conflictType?: 'FIRST/FIRST' | 'FIRST/FOLLOW';
}

export interface LL1Result {
  grammar: ParsedGrammar | null;
  firstSets: Record<string, string[]>;
  followSets: Record<string, string[]>;
  table: Record<string, Record<string, LL1TableCell>>;
  diagnostics: ParserDiagnostic[];
  steps: ParseStep[];
  accepted: boolean;
  statusMessage: string;
}

export interface RDResult {
  grammar: ParsedGrammar | null;
  diagnostics: ParserDiagnostic[];
  steps: ParseStep[];
  accepted: boolean;
  statusMessage: string;
  generatedPseudocode: string;
}

export type PrecedenceRel = '<' | '=' | '>' | '' | 'conflict';

export interface OPPResult {
  grammar: ParsedGrammar | null;
  firstVT: Record<string, string[]>;
  lastVT: Record<string, string[]>;
  precedenceTable: Record<string, Record<string, PrecedenceRel>>;
  tableSymbols: string[];
  diagnostics: ParserDiagnostic[];
  steps: ParseStep[];
  accepted: boolean;
  statusMessage: string;
  isOperatorGrammar: boolean;
}

export interface LRItem {
  prodId: number;
  lhs: string;
  rhs: string[];
  dot: number;
  lookaheads: string[]; // empty for LR(0)/SLR(1), populated for CLR(1)/LALR(1)
}

export interface LRState {
  id: number;
  label: string; // e.g., "I0" or "I36"
  items: LRItem[];
  transitions: Record<string, number>;
  mergedFrom?: number[]; // populated for LALR(1)
}

export interface LRActionEntry {
  type: 'shift' | 'reduce' | 'accept';
  target: number; // state id for shift, production id for reduce
  label: string; // e.g. s4, r2, acc
}

export interface LRTableCell {
  actions: LRActionEntry[];
  hasConflict: boolean;
  conflictType?: 'Shift/Reduce' | 'Reduce/Reduce';
}

export interface LRResult {
  variant: 'lr0' | 'slr1' | 'clr1' | 'lalr1';
  grammar: ParsedGrammar | null;
  augmentedProductions: Production[];
  firstSets: Record<string, string[]>;
  followSets: Record<string, string[]>;
  states: LRState[];
  clrStateCount?: number; // for LALR(1) comparison
  mergeGroups?: Array<{ mergedId: number; originalIds: number[]; coreSignature: string }>;
  actionTable: Record<number, Record<string, LRTableCell>>;
  gotoTable: Record<number, Record<string, number>>;
  diagnostics: ParserDiagnostic[];
  steps: ParseStep[];
  accepted: boolean;
  statusMessage: string;
}

export interface DemoExample {
  id: string;
  parser: ParserId;
  title: string;
  category: 'Arithmetic' | 'Precedence' | 'Parentheses' | 'Simple Grammar' | 'Error Case' | 'Conflict Case';
  description: string;
  grammar: string;
  startSymbol?: string;
  input: string;
  expectedOutcome: 'accepted' | 'rejected' | 'conflict';
}
