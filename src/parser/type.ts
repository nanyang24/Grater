/**
 * The parser state.
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
}
