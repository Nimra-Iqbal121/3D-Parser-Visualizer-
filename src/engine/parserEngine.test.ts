import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFirstSets,
  computeFollowSets,
  detectLeftFactoring,
  detectLeftRecursion,
  parseGrammarText,
} from './grammar';
import { runRecursiveDescent } from './recursiveDescent';
import { runLL1Parser } from './ll1';
import { computeFirstVT, computeLastVT, runOPPParser } from './opp';
import { runLRParser } from './lr';
import { analyzeGrammarAndInput } from './diagnostics';

test('Recursive Descent accepts prompt demo E -> T + E | T, T -> id on "id + id"', () => {
  const res = runRecursiveDescent('E -> T + E | T\nT -> id', 'id + id');
  assert.equal(res.accepted, true);
  assert.ok(res.steps.length > 5);
  assert.equal(res.steps[res.steps.length - 1].status, 'accepted');
  assert.ok(res.steps[res.steps.length - 1].treeSnapshot);
});

test('Recursive Descent rejects immediate left recursion with correction preview', () => {
  const res = runRecursiveDescent('E -> E + T | T\nT -> id', 'id + id');
  assert.equal(res.accepted, false);
  const lrDiag = res.diagnostics.find((d) => d.code === 'LL1_LEFT_REC');
  assert.ok(lrDiag, 'Expected left recursion diagnostic');
  assert.ok(lrDiag.correctedGrammar?.includes("E'"));
});

test('FIRST & FOLLOW sets compute accurately for classic LL(1) expression grammar', () => {
  const grammarText = "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id";
  const { grammar } = parseGrammarText(grammarText);
  assert.ok(grammar);
  const first = computeFirstSets(grammar);
  const follow = computeFollowSets(grammar, first);

  assert.deepEqual(new Set(first['E']), new Set(['(', 'id']));
  assert.deepEqual(new Set(first["E'"]), new Set(['+', 'ε']));
  assert.deepEqual(new Set(first["T'"]), new Set(['*', 'ε']));
  assert.deepEqual(new Set(follow['E']), new Set(['$', ')']));
  assert.deepEqual(new Set(follow['T']), new Set(['+', '$', ')']));
  assert.deepEqual(new Set(follow['F']), new Set(['*', '+', '$', ')']));
});

test('LL(1) accepts prompt demo "id + id * id" and rejects unmatched parentheses', () => {
  const grammarText = "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id";
  const ok = runLL1Parser(grammarText, 'id + id * id');
  assert.equal(ok.accepted, true);
  assert.equal(ok.diagnostics.filter((d) => d.severity === 'error').length, 0);

  const bad = runLL1Parser(grammarText, '( id + id * id');
  assert.equal(bad.accepted, false);
  assert.ok(bad.diagnostics.some((d) => d.code === 'SYN_PARENS'));
});

test('Left factoring detection produces valid factored grammar', () => {
  const { grammar } = parseGrammarText('S -> if E then S else S | if E then S | id\nE -> id');
  assert.ok(grammar);
  const lf = detectLeftFactoring(grammar);
  assert.equal(lf.needsFactoring, true);
  assert.ok(lf.correctedGrammar?.includes("S'"));
});

test('Left recursion elimination fixes E -> E + T | T so LL(1) accepts "id + id"', () => {
  const { grammar } = parseGrammarText('E -> E + T | T\nT -> id');
  assert.ok(grammar);
  const lr = detectLeftRecursion(grammar);
  assert.equal(lr.hasImmediate, true);
  assert.ok(lr.correctedGrammar);
  const ll1Fixed = runLL1Parser(lr.correctedGrammar!, 'id + id');
  assert.equal(ll1Fixed.accepted, true);
});

test('OPP computes FIRSTVT, LASTVT, precedence table and parses "id + id * id"', () => {
  const grammarText = 'E -> E + E\nE -> E * E\nE -> ( E )\nE -> id';
  const { grammar } = parseGrammarText(grammarText);
  assert.ok(grammar);
  const fvt = computeFirstVT(grammar);
  const lvt = computeLastVT(grammar);
  assert.deepEqual(new Set(fvt['E']), new Set(['+', '*', '(', 'id']));
  assert.deepEqual(new Set(lvt['E']), new Set(['+', '*', ')', 'id']));

  const res = runOPPParser(grammarText, 'id + id * id');
  assert.equal(res.isOperatorGrammar, true);
  assert.equal(res.precedenceTable['+']['*'], '<');
  assert.equal(res.precedenceTable['*']['+'], '>');
  assert.equal(res.precedenceTable['('][')'], '=');
  assert.equal(res.accepted, true);
});

test('OPP rejects non-operator grammar with adjacent non-terminals', () => {
  const res = runOPPParser('E -> E A E | id\nA -> + | *', 'id + id');
  assert.equal(res.isOperatorGrammar, false);
  assert.equal(res.accepted, false);
  assert.ok(res.diagnostics.some((d) => d.code === 'OPP_ADJACENT_NT'));
});

test('LR(0) accepts clean LR(0) grammar and flags Shift/Reduce conflict on arithmetic grammar', () => {
  const ok = runLRParser('lr0', 'S -> A A\nA -> a A | b', 'a b a b');
  assert.equal(ok.accepted, true);
  assert.ok(ok.states.length >= 6);

  const conflict = runLRParser('lr0', 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id', 'id + id * id');
  assert.equal(conflict.accepted, false);
  assert.ok(conflict.diagnostics.some((d) => d.code === 'LR_SR_CONFLICT'));
});

test('SLR(1) resolves arithmetic expression grammar (12 states) and flags pointer assignment conflict', () => {
  const arith = runLRParser('slr1', 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id', 'id + id * id');
  assert.equal(arith.accepted, true);
  assert.equal(arith.states.length, 12);

  const ptr = runLRParser('slr1', 'S -> L = R | R\nL -> * R | id\nR -> L', '* id = id');
  assert.equal(ptr.accepted, false);
  assert.ok(ptr.diagnostics.some((d) => d.code === 'LR_SR_CONFLICT'));
});

test('CLR(1) and LALR(1) solve pointer assignment grammar; LALR(1) merges CLR(1) states on S -> C C', () => {
  const ptrClr = runLRParser('clr1', 'S -> L = R | R\nL -> * R | id\nR -> L', '* id = id');
  assert.equal(ptrClr.accepted, true);

  const ptrLalr = runLRParser('lalr1', 'S -> L = R | R\nL -> * R | id\nR -> L', '* id = id');
  assert.equal(ptrLalr.accepted, true);
  assert.ok(ptrLalr.states.length < ptrClr.states.length, 'LALR(1) should have fewer states than CLR(1)');

  const ccClr = runLRParser('clr1', 'S -> C C\nC -> c C | d', 'c d c d');
  const ccLalr = runLRParser('lalr1', 'S -> C C\nC -> c C | d', 'c d c d');
  assert.equal(ccClr.accepted, true);
  assert.equal(ccLalr.accepted, true);
  assert.equal(ccClr.states.length, 10);
  assert.equal(ccLalr.states.length, 7);
  assert.ok((ccLalr.mergeGroups?.length ?? 0) >= 3);
});

test('CLR(1)-only grammar succeeds in CLR(1) and triggers Reduce/Reduce conflict in LALR(1)', () => {
  const g = 'S -> a E c | a F d | b F c | b E d\nE -> e\nF -> e';
  const clr = runLRParser('clr1', g, 'a e c');
  const lalr = runLRParser('lalr1', g, 'a e c');
  assert.equal(clr.accepted, true);
  assert.equal(lalr.accepted, false);
  assert.ok(lalr.diagnostics.some((d) => d.code === 'LR_RR_CONFLICT'));
});

test('Cross-parser diagnostic analysis accurately separates invalid syntax vs algorithm support', () => {
  const report = analyzeGrammarAndInput('ll1', 'E -> E + T | T\nT -> id', 'id + id');
  assert.equal(report.accepted, false);
  const slrSummary = report.compatibilityMatrix.find((c) => c.parserId === 'slr1');
  const ll1Summary = report.compatibilityMatrix.find((c) => c.parserId === 'll1');
  assert.equal(ll1Summary?.compatible, false);
  assert.equal(slrSummary?.accepted, true);
});

test('Compact unspaced textbook grammar S -> AA / A -> aA | b works across LR, LL(1), and RD', () => {
  const compactGrammar = 'S -> AA\nA -> aA | b';
  assert.equal(runLRParser('lr0', compactGrammar, 'abab').accepted, true);
  assert.equal(runLRParser('lr0', compactGrammar, 'abab$').accepted, true);
  assert.equal(runLRParser('slr1', compactGrammar, 'aabb').accepted, true);
  assert.equal(runLRParser('clr1', compactGrammar, 'bb').accepted, true);
  assert.equal(runLRParser('lalr1', compactGrammar, 'aabaaab').accepted, true);
  assert.equal(runLL1Parser(compactGrammar, 'abab').accepted, true);
  assert.equal(runRecursiveDescent(compactGrammar, 'abab').accepted, true);

  // Extra trailing input ("ababab") gives clear completed-prefix explanation + 1-click fix "a b a b"
  const lrExtra = runLRParser('lr0', compactGrammar, 'ababab');
  assert.equal(lrExtra.accepted, false);
  assert.equal(lrExtra.diagnostics[0]?.correctedInput, 'a b a b');
  assert.match(lrExtra.diagnostics[0]?.explanation ?? '', /a b a b/);

  const ll1Extra = runLL1Parser(compactGrammar, 'ababab');
  assert.equal(ll1Extra.accepted, false);
  assert.equal(ll1Extra.diagnostics[0]?.correctedInput, 'a b a b');

  const rdExtra = runRecursiveDescent(compactGrammar, 'ababab');
  assert.equal(rdExtra.accepted, false);
  assert.equal(rdExtra.diagnostics[0]?.correctedInput, 'a b a b');
});

test('Compact unspaced expression grammars & inputs work in LL(1), SLR(1), LALR(1), CLR(1), OPP, and RD', () => {
  const compactLR = 'E -> E+T | T\nT -> T*F | F\nF -> (E) | id';
  assert.equal(runLRParser('slr1', compactLR, '(id+id)*id').accepted, true);
  assert.equal(runLRParser('lalr1', compactLR, '(id+id)*id$').accepted, true);
  assert.equal(runLRParser('clr1', compactLR, 'id+id*id').accepted, true);
  assert.equal(runOPPParser('E -> E+E | E*E | (E) | id', '(id+id)*id').accepted, true);

  const compactLL1 = "E -> TE'\nE' -> +TE' | ε\nT -> FT'\nT' -> *FT' | ε\nF -> (E) | id";
  assert.equal(runLL1Parser(compactLL1, 'id+id*id$').accepted, true);
  assert.equal(runRecursiveDescent(compactLL1, '(id+id)*id').accepted, true);
});

test('Compact S -> aSb | ab and nullable S -> aSb | ε handle glued inputs and explicit ε/$', () => {
  const g1 = 'S -> aSb | ab';
  assert.equal(runLRParser('slr1', g1, 'aabb').accepted, true);
  assert.equal(runLRParser('slr1', g1, 'aaabbb').accepted, true);
  assert.equal(runRecursiveDescent(g1, 'aabb').accepted, true);

  const g2 = 'S -> aSb | ε';
  assert.equal(runLRParser('slr1', g2, 'aabb').accepted, true);
  assert.equal(runLRParser('slr1', g2, 'ε').accepted, true);
  assert.equal(runLL1Parser(g2, '$').accepted, true);
  assert.equal(runRecursiveDescent(g2, 'aabb').accepted, true);
});

test('Recursive Descent continuation-passing backtracking handles nested prefix & epsilon-first rules', () => {
  assert.equal(runRecursiveDescent('S -> A b\nA -> a | a a', 'aab').accepted, true);
  assert.equal(runRecursiveDescent("E -> T E'\nE' -> ε | + T E'\nT -> id", 'id+id').accepted, true);
  assert.equal(runRecursiveDescent('S -> E\nE -> T | T + E\nT -> id', 'id + id').accepted, true);
});

test('Uppercase terminals like ID/NUM work and variable names for id-grammar suggest id replacement', () => {
  const upperRes = runLRParser('slr1', 'E -> E + T | T\nT -> ID | NUM', 'ID + NUM');
  assert.equal(upperRes.accepted, true);

  const varErr = runLRParser('slr1', 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id', 'a + b * c');
  assert.equal(varErr.accepted, false);
  const lexDiag = varErr.diagnostics.find((d) => d.code === 'LEX_UNKNOWN_TOKEN');
  assert.equal(lexDiag?.correctedInput, 'id + id * id');
});

