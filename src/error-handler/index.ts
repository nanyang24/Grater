import { ParseError } from './parseError';
import { Errors } from './type';
import { IParserState } from '../parser/type';

export function report(
  parser: IParserState,
  type: Errors,
  ...params: string[]
) {
  throw new ParseError(
    parser.index,
    parser.line,
    parser.column,
    type,
    ...params,
  );
}

export function reportWithPosition(
  index: number,
  line: number,
  column: number,
  type: Errors,
): never {
  throw new ParseError(index, line, column, type);
}

export * from './errorMessage';
export * from './type';
