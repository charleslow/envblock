# envblock

A javascript math-aware scanner for LaTeX-like braced environments. Just one file with no dependencies.

```js
import { scanBraced, readFields } from 'envblock';
```

## Motivation

We often need a state machine to parse custom brace-like syntax to render them in different ways. For example, a notebook app may have mechanisms like `\theorem{Pythagoras}{If $c = \sqrt{a^2 + b^2}$ then ...}` or `\definition{Policy Gradient Theorem}{...}` that have different rendering rules.

This small file provides the mechanism to parse these without importing a large library.

Some design choices:
- To support math rendering, braces inside `$...$` or `$$...$$` never touch depth
- Backslash escapes are literal
- A stray `$` with no closing fence is treated as a price, not math

## API

### scanBraced

```js
scanBraced(source, open, openCh = '{')
```

Scan the braced field starting at offset `open`. 

Returns `{ content, contentOffset, endOffset }`, or `null` when the field is unclosed or `source[open]` is not the opening bracket. `openCh` selects the pair: `{`, `[`, or `(`.

### `readFields(source, cursor, spec, openCh = '{')`

Read fields in declaration order from `cursor`. Each spec entry is
`{ name, optional? }`. Returns `{ fields, end }` where `fields` maps name to
the `scanBraced` shape and `end` is the offset just past the last consumed
field. A missing optional field stops the walk; a missing required field
returns `null` (the degrade-to-raw contract). Required fields must precede
optional ones.

```js
const spec = [
  { name: 'name' },
  { name: 'statement' },
  { name: 'proof', optional: true },
];
readFields('\\theorem{Pythagoras}{If $c = \\sqrt{a^2 + b^2}$ ...}', 8, spec);
```

## Install

```sh
npm install github:charleslow/envblock#v0.1.0
```

## Test

```sh
npm test
```

MIT
