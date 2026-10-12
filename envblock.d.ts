export interface BracedField {
  content: string;
  contentOffset: number;
  endOffset: number;
}

export interface FieldSpec {
  name: string;
  optional?: boolean;
}

export interface ReadResult {
  fields: Record<string, BracedField>;
  end: number;
}

export type BracketChar = '{' | '[' | '(';

export declare function scanBraced(
  source: string,
  open: number,
  openCh?: BracketChar,
): BracedField | null;

export declare function readFields(
  source: string,
  cursor: number,
  spec: readonly FieldSpec[],
  openCh?: BracketChar,
): ReadResult | null;

export declare function readCommandFields(
  source: string,
  command: string,
  spec: readonly FieldSpec[],
  openCh?: BracketChar,
): ReadResult | null;
