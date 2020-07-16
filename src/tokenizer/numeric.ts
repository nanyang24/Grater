import { IParserState } from '../parser/type';
import { Token } from './token';
import { forwardChar } from './utils';
import { CharTypes, CharSymbol, Chars } from './charClassifier';

/*
 * https://tc39.es/ecma262/index.html#prod-NumericLiteral
 * https://tc39.es/ecma262/index.html#sec-additional-syntax-numeric-literals
 * NumericLiteral::
 *      DecimalLiteral
 *      DecimalBigIntegerLiteral
 *      NonDecimalIntegerLiteral    BigIntLiteralSuffix
 */
export const scanNumber = (parser: IParserState): Token => {
  let char = parser.currentChar;
  let value = '';
  let start = parser.index;
  let underscoreError = false;

  // Decimal Number
  while (CharTypes[char] & (CharSymbol.Decimal | CharSymbol.Underscore)) {
    // Note: The first char won't be the '_'，Because it's a Identifier in that case.
    // This should be like '123', '1_23', '123_'
    // '_'
    if (char === Chars.Underscore) {
      // Save the character index before the underscore
      const { index: indexBeforeUnderscore } = parser;

      char = forwardChar(parser);
      // Cannot contain two consecutive underscores
      if (char === Chars.Underscore) {
        // error
      }
      underscoreError = true;
      // skip '_'
      value += parser.source.substring(start, indexBeforeUnderscore);
      start = parser.index;

      continue;
    }
    underscoreError = false;
    char = forwardChar(parser); // skip
  }

  if (underscoreError) {
    // error
    return -1;
  }

  parser.tokenValue = value + parser.source.substring(start, parser.index);

  return Token.NumericLiteral;
};
