import { IParserState } from '../parser/type';
// import { Token } from './token';
import { forwardChar } from './utils';
import { CharTypes, CharSymbol, Chars } from './charClassifier';
import { Token } from './token';

/*
 * @param parser -> Parser state
 * @param quote -> cosing quite: ' or "
 */
export const scanString = (parser: IParserState, quote: number): any => {
  let curChar = forwardChar(parser);
  let sumString = '';
  const sign = parser.index;

  // LineTerminator: a special character or sequence of characters signifying the end of a line of text
  while ((CharTypes[curChar] & CharSymbol.LineTerminator) === 0) {
    // If the character equal to "quote"
    if (curChar === quote) {
      // get full string value
      sumString += parser.source.slice(sign, parser.index);

      forwardChar(parser); // skip closing quote
      parser.tokenValue = sumString;
      return Token.StringLiteral;
    }

    // if the character equal to "\"
    if (curChar === Chars.Backslash) {
    }

    curChar = forwardChar(parser);
  }

  return undefined;
};
