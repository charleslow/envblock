import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFields, readCommandFields } from '../envblock.js';

const THEOREM = [
  { name: 'name' },
  { name: 'statement' },
  { name: 'proof', optional: true },
];

test('happy path: three fields, end offset after the last brace', () => {
  const src = '\\theorem{N}{S}{P}';
  const r = readFields(src, 8, THEOREM);
  assert.equal(r.end, 17);
  assert.equal(r.fields.name.content, 'N');
  assert.equal(r.fields.statement.content, 'S');
  assert.equal(r.fields.proof.content, 'P');
  assert.deepEqual(
    [r.fields.name.contentOffset, r.fields.name.endOffset], [9, 11]);
});

test('optional field absent: walk stops, result is not null', () => {
  const src = '\\theorem{N}{S}';
  const r = readFields(src, 8, THEOREM);
  assert.equal(r.end, 14);
  assert.equal(r.fields.proof, undefined);
});

test('required field missing: whole read fails', () => {
  assert.equal(readFields('\\theorem{N}', 8, THEOREM), null);
  assert.equal(readFields('\\theorem', 8, THEOREM), null);
});

test('unclosed required field fails', () => {
  assert.equal(readFields('\\theorem{N}{S{', 8, THEOREM), null);
});

test('unclosed optional field: keep earlier fields, do not fail', () => {
  const src = '\\theorem{N}{S}{P';
  const r = readFields(src, 8, THEOREM);
  assert.equal(r.end, 14);
  assert.equal(r.fields.proof, undefined);
});

test('whitespace between fields is skipped, inside is preserved', () => {
  const src = '\\theorem{ A }\n  { B }\t{ C }';
  const r = readFields(src, 8, THEOREM);
  assert.deepEqual(
    [r.fields.name.content, r.fields.statement.content, r.fields.proof.content],
    [' A ', ' B ', ' C ']);
  assert.equal(r.end, src.length);
});

test('empty braces count as a present field', () => {
  const src = '\\theorem{}{S}';
  const r = readFields(src, 8, THEOREM);
  assert.equal(r.fields.name.content, '');
  assert.equal(r.fields.statement.content, 'S');
});

test('malformed middle field fails the read even with optional tail', () => {
  assert.equal(readFields('\\theorem{N}{B', 8, THEOREM), null);
});

test('end offset points past the last field, trailing text is not consumed', () => {
  const src = '\\theorem{N}{S} junk';
  const r = readFields(src, 8, THEOREM);
  assert.equal(r.end, 14);
});

test('required field after an absent optional is never read', () => {
  const spec = [{ name: 'a' }, { name: 'b', optional: true }, { name: 'c' }];
  const r = readFields('{A}', 0, spec);
  assert.deepEqual(Object.keys(r.fields), ['a']);
  assert.equal(r.end, 3);
});

test('bracket option passes through to every field', () => {
  const src = '\\q[a] [b] [c]';
  const spec = [
    { name: 'a' }, { name: 'b' }, { name: 'c', optional: true },
  ];
  const r = readFields(src, 2, spec, '[');
  assert.deepEqual(
    [r.fields.a.content, r.fields.b.content, r.fields.c.content],
    ['a', 'b', 'c']);
  assert.equal(r.end, 13);
});

test('end-to-end: the proposal example parses with math and refs intact', () => {
  const src = '\\theorem{Pythagoras}{If $c = \\sqrt{a^2 + b^2}$ then the triangle is right}{See Appendix \\ref{app:proofs}.}';
  const r = readFields(src, 8, THEOREM);
  assert.equal(r.fields.name.content, 'Pythagoras');
  assert.equal(
    r.fields.statement.content,
    'If $c = \\sqrt{a^2 + b^2}$ then the triangle is right');
  assert.equal(r.fields.proof.content, 'See Appendix \\ref{app:proofs}.');
  assert.equal(r.end, src.length);
});

test('degrade-to-raw contract: any broken field yields null', () => {
  const broken = [
    '\\theorem{N',                    // name unclosed
    '\\theorem{N}{',                  // statement unclosed
    '\\theorem}{S}{P}',               // name not a brace
    '\\theorem N {S}{P}',             // name missing entirely
    '\\theorem{}{S{P}',               // unclosed inner brace swallows the rest
  ];
  for (const src of broken) {
    assert.equal(readFields(src, 8, THEOREM), null, src);
  }
});

test('readCommandFields starts right after the command', () => {
  const src = '\\theorem{N}{S}';
  const r = readCommandFields(src, '\\theorem', THEOREM);
  assert.equal(r.end, src.length);
  assert.equal(r.fields.name.content, 'N');
  assert.equal(r.fields.statement.content, 'S');
});

test('readCommandFields finds the command mid-document', () => {
  const src = 'text \\theorem{N}{S} tail';
  const r = readCommandFields(src, '\\theorem', THEOREM);
  assert.equal(r.end, 19);
  assert.equal(r.fields.statement.content, 'S');
});

test('readCommandFields: absent or extended command degrades to raw', () => {
  assert.equal(readCommandFields('\\lemma{N}{S}', '\\theorem', THEOREM), null);
  assert.equal(readCommandFields('\\theorems{N}{S}', '\\theorem', THEOREM), null);
});
