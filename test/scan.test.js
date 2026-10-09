import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanBraced } from '../envblock.js';

const scan = (source, open = 0, openCh) => scanBraced(source, open, openCh);

test('simple field: content and exact offsets', () => {
  assert.deepEqual(scan('x{ab}y', 1), {
    content: 'ab', contentOffset: 2, endOffset: 5,
  });
});

test('empty field is found, not missing', () => {
  assert.deepEqual(scan('{}'), { content: '', contentOffset: 1, endOffset: 2 });
});

test('nested braces stay inside the field', () => {
  assert.equal(scan('{a {b} c}').content, 'a {b} c');
});

test('deeply nested braces', () => {
  assert.equal(scan('{a {b {c} d} e}').content, 'a {b {c} d} e');
});

test('multiline content, offsets preserved', () => {
  const r = scan('{\n  a\n}');
  assert.equal(r.content, '\n  a\n');
  assert.equal(r.contentOffset, 1);
  assert.equal(r.endOffset, 7);
});

test('returns null when position is not an opening bracket', () => {
  assert.equal(scan('abc', 0), null);
  assert.equal(scan('{a}', 1), null);
});

test('returns null when unclosed', () => {
  assert.equal(scan('{abc'), null);
  assert.equal(scan('{a {b}'), null);
});

test('returns null on empty input or out-of-range offset', () => {
  assert.equal(scan('', 0), null);
  assert.equal(scan('{a}', 100), null);
});

test('escaped open bracket does not deepen', () => {
  assert.equal(scan('{\\{}').content, '\\{');
});

test('escaped close bracket does not close', () => {
  const r = scan('{\\}a}');
  assert.equal(r.content, '\\}a');
  assert.equal(r.endOffset, 5);
});

test('escaped open bracket is literal even at depth boundary', () => {
  assert.equal(scan('{\\{\\}}').content, '\\{\\}');
});

test('double backslash is a literal backslash, next close is real', () => {
  assert.equal(scan('{a\\\\}').content, 'a\\\\');
});

test('backslash at end of input stays unclosed', () => {
  assert.equal(scan('{abc\\'), null);
});

test('$...$ span: braces inside never touch depth', () => {
  assert.equal(scan('{$x {y}$ z}').content, '$x {y}$ z');
});

test('escaped close inside math: $\\}$ does not close the field', () => {
  assert.equal(scan('{$\\}$ x}').content, '$\\}$ x');
});

test('unbalanced braces inside math: $\\left\\{ x \\right.$ survives', () => {
  assert.equal(scan('{$\\left\\{ x \\right.$ y}').content, '$\\left\\{ x \\right.$ y');
});

test('stray $ with no closing fence is a price, not math', () => {
  assert.equal(scan('{costs $5 only}').content, 'costs $5 only');
});

test('a $ pair reads as a math span, dollars stay in content', () => {
  assert.equal(scan('{$5 and $10}').content, '$5 and $10');
});

test('a $ pair spanning a blank line is not math, braces count again', () => {
  assert.equal(scan('{$ \n\n {not nested} $}').content, '$ \n\n {not nested} $');
});

test('$$...$$ display math: braces inside never touch depth', () => {
  assert.equal(scan('{$$a {b}$$ tail}').content, '$$a {b}$$ tail');
});

test('unterminated $$ degrades to plain text', () => {
  assert.equal(scan('{$$ a }').content, '$$ a ');
  assert.equal(scan('{$$ a {b}'), null);
});

test('math span at end of input stays unclosed', () => {
  assert.equal(scan('{$x'), null);
});

test('bracket option: [ pairs with ]', () => {
  const r = scan('a [b [c] d]', 2, '[');
  assert.equal(r.content, 'b [c] d');
  assert.deepEqual([r.contentOffset, r.endOffset], [3, 11]);
});

test('bracket option: escaped and math braces keep working with [', () => {
  assert.equal(scan('[\\[x\\]]', 0, '[').content, '\\[x\\]');
  assert.equal(scan('[$x [y]$]', 0, '[').content, '$x [y]$');
});

test('bracket option: ( pairs with )', () => {
  assert.equal(scan('(a (b) c)', 0, '(').content, 'a (b) c');
});

test('unknown bracket char returns null, closing char is not an opener', () => {
  assert.equal(scan('<a>', 0, '<'), null);
  assert.equal(scan('}a{', 0, '}'), null);
});

test('mismatched bracket at cursor returns null', () => {
  assert.equal(scan('[a]', 0), null);
  assert.equal(scan('{a]', 0, '['), null);
});

test('a { inside a $ span is content, not a nested field', () => {
  assert.equal(scan('{$ \\{ \\} $}{next}', 0).content, '$ \\{ \\} $');
  assert.equal(scan('{$ \\{ \\} $}{next}', 11).content, 'next');
});
