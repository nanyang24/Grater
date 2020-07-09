import { IParserState } from '../parser/type';
// import { Token } from './token';
import { forwardChar } from './utils';
import { CharTypes, CharSymbol } from './charClassifier';

/*
 * @param parser -> Parser state
 * @param quote -> cosing quite: ' or "
 */
export const scanString = (
  parser: IParserState,
  quote: number,
): any => {
  let curChar = forwardChar(parser);
  while ((CharTypes[curChar] & CharSymbol.LineTerminator) === 0) {
    // If the character equal to "quote"
    if (curChar === quote) {
    }

    curChar = forwardChar(parser);
  }
};
