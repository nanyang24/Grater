import { IParserState } from './type';
import { Token } from '../tokenizer/token';

export default function createParserState(source: string): IParserState {
  return {
    source,
    index: 0,
    line: 1,
    column: 0,
    startPos: 0,
    end: source.length,
    startColumn: 0,
    colPos: 0,
    linePos: 0,
    startLine: 1,
    currentChar: source.charCodeAt(0),

    token: Token.EOF,
    tokenPos: 0,
    tokenRaw: '',
    tokenValue: '',
    tokenRegExp: undefined,
  };
}
