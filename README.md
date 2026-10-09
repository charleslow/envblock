# envblock

A math-aware scanner for LaTeX-like braced environments. Two functions, no
dependencies, one file.

```js
import { scanBraced, readFields } from 'envblock';
```

## Why

LaTeX puts unbalanced braces inside math, so a naive brace counter breaks on
input like `\theorem{Pythagoras}{If $c = \sqrt{a^2 + b^2}$ then ...}`. The
scanner here is an explicit state machine: braces inside `$...$` or `$$...$$`
never touch depth, backslash escapes are literal, and a stray `$` with no
closing fence is treated as a price, not math.

## API

### `scanBraced(source, open, openCh = '{')`

Scan the braced field starting at offset `open`. Returns
`{ content, contentOffset, endOffset }`, or `null` when the field is unclosed
or `source[open]` is not the opening bracket. `openCh` selects the pair:
`{`, `[`, or `(`.

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
