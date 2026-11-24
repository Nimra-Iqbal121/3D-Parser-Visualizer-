import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeInputTape,
  computeStackDiff,
  getOperationMeta,
  layoutLRAutomaton2D,
} from './visualizerHelpers';
import { runLRParser } from './lr';
import { getDefaultDemoForParser } from './demos';

test('computeInputTape marks consumed, active lookahead, and upcoming tokens accurately', () => {
  const initial = ['id', '+', 'id', '*', 'id', '$'];
  const tapeStart = computeInputTape(initial, ['id', '+', 'id', '*', 'id', '$']);
  assert.equal(tapeStart.length, 6);
  assert.equal(tapeStart[0].status, 'current');
  assert.equal(tapeStart[1].status, 'upcoming');

  const tapeMid = computeInputTape(initial, ['+', 'id', '*', 'id', '$']);
  assert.equal(tapeMid[0].status, 'matched');
  assert.equal(tapeMid[0].token, 'id');
  assert.equal(tapeMid[1].status, 'current');
  assert.equal(tapeMid[1].token, '+');
  assert.equal(tapeMid[2].status, 'upcoming');

  const tapeDone = computeInputTape(initial, ['$']);
  assert.equal(tapeDone.filter((t) => t.status === 'matched').length, 5);
  assert.equal(tapeDone[5].status, 'current');
  assert.equal(tapeDone[5].token, '$');
});

test('computeStackDiff detects popped and pushed symbols cleanly', () => {
  const diff1 = computeStackDiff(['$', 'E'], ['$', "E'", 'T']);
  assert.equal(diff1.commonPrefixLength, 1);
  assert.deepEqual(diff1.popped, ['E']);
  assert.deepEqual(diff1.pushed, ["E'", 'T']);

  const diff2 = computeStackDiff(['$', "E'", "T'", 'id'], ['$', "E'", "T'"]);
  assert.equal(diff2.commonPrefixLength, 3);
  assert.deepEqual(diff2.popped, ['id']);
  assert.deepEqual(diff2.pushed, []);
});

test('layoutLRAutomaton2D lays out all LR(0) states in non-overlapping BFS layers', () => {
  const demo = getDefaultDemoForParser('lr0');
  const lr = runLRParser('lr0', demo.grammar, demo.input);
  const layout = layoutLRAutomaton2D(lr.states);

  assert.equal(layout.nodes.length, lr.states.length);
  const startNode = layout.nodes.find((n) => n.isStart);
  assert.ok(startNode);
  assert.equal(startNode.layer, 0);
  assert.ok(layout.edges.length > 0);

  // Verify no two nodes share identical coordinates
  const coords = new Set(layout.nodes.map((n) => `${n.x},${n.y}`));
  assert.equal(coords.size, layout.nodes.length);
});

test('getOperationMeta returns distinct labels for shift, reduce, match, and accept', () => {
  assert.equal(getOperationMeta('shift').badge, 'SHIFT');
  assert.equal(getOperationMeta('reduce').badge, 'REDUCE');
  assert.equal(getOperationMeta('match').badge, 'MATCH');
  assert.equal(getOperationMeta('accept').badge, 'ACCEPTED');
});
