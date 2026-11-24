import { runLL1Parser } from './ll1';
import { runLRParser } from './lr';
import { runOPPParser } from './opp';
import { runRecursiveDescent } from './recursiveDescent';
import { ParserDiagnostic, ParserId } from './types';

export interface ParserCompatibilitySummary {
  parserId: ParserId;
  label: string;
  compatible: boolean;
  accepted: boolean;
  status: string;
  errorCount: number;
  conflictCount: number;
}

export interface DiagnosticAnalysisReport {
  selectedParser: ParserId;
  diagnostics: ParserDiagnostic[];
  accepted: boolean;
  statusMessage: string;
  compatibilityMatrix: ParserCompatibilitySummary[];
}

const PARSER_LABELS: Record<ParserId, string> = {
  rd: 'Recursive Descent',
  ll1: 'LL(1)',
  opp: 'Operator Precedence',
  lr0: 'LR(0)',
  slr1: 'SLR(1)',
  clr1: 'CLR(1)',
  lalr1: 'LALR(1)',
};

export function runAnyParserDiagnostics(
  parser: ParserId,
  grammarText: string,
  inputText: string,
  startSymbol?: string
): { diagnostics: ParserDiagnostic[]; accepted: boolean; statusMessage: string } {
  switch (parser) {
    case 'rd': {
      const r = runRecursiveDescent(grammarText, inputText, startSymbol);
      return { diagnostics: r.diagnostics, accepted: r.accepted, statusMessage: r.statusMessage };
    }
    case 'll1': {
      const r = runLL1Parser(grammarText, inputText, startSymbol);
      return { diagnostics: r.diagnostics, accepted: r.accepted, statusMessage: r.statusMessage };
    }
    case 'opp': {
      const r = runOPPParser(grammarText, inputText, startSymbol);
      return { diagnostics: r.diagnostics, accepted: r.accepted, statusMessage: r.statusMessage };
    }
    case 'lr0':
    case 'slr1':
    case 'clr1':
    case 'lalr1': {
      const r = runLRParser(parser, grammarText, inputText, startSymbol);
      return { diagnostics: r.diagnostics, accepted: r.accepted, statusMessage: r.statusMessage };
    }
  }
}

/**
 * Evaluates a grammar + input across the selected parser and summarizes compatibility across
 * all 7 parsers so students can distinguish invalid syntax vs algorithm restrictions vs conflicts.
 */
export function analyzeGrammarAndInput(
  selectedParser: ParserId,
  grammarText: string,
  inputText: string,
  startSymbol?: string
): DiagnosticAnalysisReport {
  const allParsers: ParserId[] = ['rd', 'll1', 'opp', 'lr0', 'slr1', 'lalr1', 'clr1'];
  let primaryDiagnostics: ParserDiagnostic[] = [];
  let primaryAccepted = false;
  let primaryStatus = '';

  const compatibilityMatrix: ParserCompatibilitySummary[] = allParsers.map((pid) => {
    const res = runAnyParserDiagnostics(pid, grammarText, inputText, startSymbol);
    if (pid === selectedParser) {
      primaryDiagnostics = res.diagnostics;
      primaryAccepted = res.accepted;
      primaryStatus = res.statusMessage;
    }

    const errors = res.diagnostics.filter((d) => d.severity === 'error');
    const conflicts = errors.filter((d) => d.category === 'parsing-conflict');
    const unsupported = errors.filter(
      (d) => d.category === 'invalid-grammar' || d.category === 'unsupported-algorithm'
    );

    return {
      parserId: pid,
      label: PARSER_LABELS[pid],
      compatible: unsupported.length === 0 && conflicts.length === 0,
      accepted: res.accepted,
      status: res.accepted
        ? 'Accepted'
        : unsupported.length > 0
        ? unsupported[0].category === 'invalid-grammar'
          ? 'Invalid Grammar'
          : 'Unsupported'
        : conflicts.length > 0
        ? 'Conflict'
        : 'Input Rejected',
      errorCount: errors.length,
      conflictCount: conflicts.length,
    };
  });

  return {
    selectedParser,
    diagnostics: primaryDiagnostics,
    accepted: primaryAccepted,
    statusMessage: primaryStatus,
    compatibilityMatrix,
  };
}
