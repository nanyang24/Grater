import { Token } from '../tokenizer/token';

/**
 * The Parser State.
 */
export interface IParserState {
  source: string;
  index: number;
  line: number;
  column: number;
  startPos: number;
  startColumn: number;
  startLine: number;
  colPos: number;
  linePos: number;
  end: number;
  currentChar: number;

  token: Token;
  tokenPos: number;
  tokenRaw: string;
  tokenValue: any;
  tokenRegExp: void | {
    pattern: string;
    flags: string;
  };

  lineTerminatorBeforeNextToken: boolean;
  assignable: boolean;
}

export const enum PropertyKind {
  None,
  Getter = 1 << 1,
  Setter = 1 << 2,
  Generator = 1 << 3,
}

export const PropertyKindMap = {
  [PropertyKind.Generator]: 'init',
  [PropertyKind.Setter]: 'set',
  [PropertyKind.Getter]: 'get',
};

export const enum Context {
  Empty = 1,
  SuperCall = 1 << 1,
  NewTarget = 1 << 2,
  Strict = 1 << 3,
  Global = 1 << 4,
}
