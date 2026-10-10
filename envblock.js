// Math-aware scanner for LaTeX-like braced environments.
// Braces inside $...$ or $$...$$ never affect depth; escaped chars are literal.

const PAIRS = { '{': '}', '[': ']', '(': ')' };

function skipSpace(source, cursor) {
  while (cursor < source.length && /\s/.test(source[cursor])) cursor++;
  return cursor;
}

// Scan the braced field starting at `open`. Returns
// { content, contentOffset, endOffset } or null if unclosed or `open` is not
// the opening bracket. `openCh` selects the bracket pair ({ [ or (.
export function scanBraced(source, open, openCh = '{') {
  const closeCh = PAIRS[openCh];
  if (!closeCh || source[open] !== openCh) return null;
  let depth = 1;
  let state = 'TEXT';
  for (let i = open + 1; i < source.length; i++) {
    const ch = source[i];

    switch (state) {
      case 'MATH':
        if (ch === '\\') state = 'MATH_ESC';
        else if (ch === '$') state = 'TEXT';
        break;
      case 'MATH_ESC':
        state = 'MATH';
        break;
      case 'DISPLAY':
        if (ch === '\\') state = 'DISPLAY_ESC';
        else if (ch === '$' && source[i + 1] === '$') { state = 'TEXT'; i++; }
        break;
      case 'DISPLAY_ESC':
        state = 'DISPLAY';
        break;
      case 'ESC':
        state = 'TEXT';
        break;
      default:
        if (ch === '\\') state = 'ESC';
        else if (ch === openCh) depth++;
        else if (ch === closeCh) {
          if (--depth === 0) {
            return { content: source.slice(open + 1, i),
                     contentOffset: open + 1, endOffset: i + 1 };
          }
        } else if (ch === '$') {
          const fence = source[i + 1] === '$' ? '$$' : '$';
          const close = source.indexOf(fence, i + fence.length);
          const isMath = close !== -1 &&
            !(fence === '$' && /\n[ \t]*\n/.test(source.slice(i + fence.length, close)));
          if (!isMath) continue; // a stray $ is a price, not math
          if (fence === '$$') i++;
          state = fence === '$$' ? 'DISPLAY' : 'MATH';
        }
    }
  }
  return null; // unclosed
}

// Read fields in declaration order from `cursor`. A missing optional field
// stops the walk; a missing required field fails the whole read, which is the
// degrade-to-raw contract. Required fields must precede optional ones.
export function readFields(source, cursor, spec, openCh = '{') {
  const fields = {};
  let end = cursor;
  for (const field of spec) {
    cursor = skipSpace(source, cursor);
    const found = scanBraced(source, cursor, openCh);
    if (!found) {
      if (field.optional) break;
      return null;
    }
    fields[field.name] = found;
    end = found.endOffset;
    cursor = end;
  }
  return { fields, end };
}

// Read fields after the first occurrence of `command`, so callers pass the
// command instead of computing an offset. Same shape and degrade-to-raw
// contract as readFields; null when the command is absent.
export function readCommandFields(source, command, spec, openCh = '{') {
  const at = source.indexOf(command);
  if (at === -1) return null;
  return readFields(source, at + command.length, spec, openCh);
}
