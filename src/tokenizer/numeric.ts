import { IParserState } from '../parser/type';
import { Token } from './token';
import { forwardChar } from './utils';
import { CharTypes, CharSymbol } from './charClassifier';

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
  const start = parser.index;

  // Decimal Number
  while (CharTypes[char] & CharSymbol.Decimal) {
    char = forwardChar(parser);
  }

  value += parser.source.substring(start, parser.index);
  parser.tokenValue = +value;

  return Token.NumericLiteral;
};
