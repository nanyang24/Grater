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
}
