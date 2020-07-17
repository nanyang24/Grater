import { IParserState } from '../parser/type';
import { Token } from './token';
import { forwardChar } from './utils';
import { CharTypes, CharSymbol, Chars } from './charClassifier';

const parseConsecutiveDecimal = (
  parser: IParserState,
  char: number,
): string => {
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
    return '';
  }

  return value + parser.source.substring(start, parser.index);
};

/*
 * https://tc39.es/ecma262/index.html#prod-NumericLiteral
 * https://tc39.es/ecma262/index.html#sec-additional-syntax-numeric-literals
 * NumericLiteral::
 *      DecimalLiteral
 *      DecimalBigIntegerLiteral
 *      NonDecimalIntegerLiteral    BigIntLiteralSuffix
 */
export const scanNumber = (parser: IParserState, isFloat?: boolean): Token => {
  let char = parser.currentChar;
  let value = '';

  if (!isFloat) {
    value = parseConsecutiveDecimal(parser, char);
    char = parser.currentChar;

    // Consume any decimal dot and fractional component.
    if (char === Chars.Period) {
      if (forwardChar(parser) === Chars.Underscore) {
        // error
      }
      value += '.' + parseConsecutiveDecimal(parser, parser.currentChar);
      char = parser.currentChar;
    }
  }

  if (isFloat) {
    value = '.' + parseConsecutiveDecimal(parser, char);
    char = parser.currentChar;
    // Syntax Error
    if (char === Chars.LowerN) {
      // error
    }
  }

  parser.tokenValue = parseFloat(value);

  return Token.NumericLiteral;
};
