import { IParserState } from '../parser/type';
import { Token } from './token';
import { forwardChar, toHex, letterCaseInsensitive } from './utils';
import { CharTypes, CharSymbol, Chars } from './charClassifier';

/**
 * Support for Numeric Separators
 * Spec: https://github.com/tc39/proposal-numeric-separator
 * This feature enables developers to make their numeric literals more readable
 * @param {IParserState} parser
 * @param {number} char
 * @returns {string} value
 */
const parseDecimalWithSeparator = (
  parser: IParserState,
  char: number,
): string => {
  let value = '';
  let start = parser.index;
  let separatorError = false;
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
        throw Error;
      }
      separatorError = true;
      // skip '_'
      value += parser.source.substring(start, indexBeforeUnderscore);
      start = parser.index;

      continue;
    }
    separatorError = false;
    char = forwardChar(parser); // skip
  }

  if (separatorError) {
    throw Error;
  }

  return value + parser.source.substring(start, parser.index);
};

export const enum NumberKind {
  Decimal = 1 << 0,
  Binary = 1 << 1,
  Octal = 1 << 2,
  Hex = 1 << 3,
  ImplicitOctal = 1 << 4,
  NonOctalDecimal = 1 << 5,
  Float = 1 << 6,
  ValidBigIntKind = 1 << 7,
  DecimalNumberKind = Decimal | NonOctalDecimal,
}

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
  let value: any = 0;
  let allowSeparator = false;
  let digits = 0; // Different types of limiting digits
  let type = NumberKind.Decimal;

  if (!isFloat) {
    // "0" is a sign, scan for a hexadecimal, binary, octal or implicit octal
    if (char === Chars.Zero) {
      char = forwardChar(parser);

      // Hex
      // It behaves just like parseInt('0x123', 16)
      if (letterCaseInsensitive(char) === Chars.LowerX) {
        char = forwardChar(parser);

        while (CharTypes[char] & (CharSymbol.Hex | CharSymbol.Underscore)) {
          if (char === Chars.Underscore) {
            if (!allowSeparator) {
              throw Error;
            }
            allowSeparator = false;
            char = forwardChar(parser);
            continue;
          }

          allowSeparator = true;
          value = value * 0x10 + toHex(char);
          char = forwardChar(parser);
          digits++;
        }
        if (digits < 1 || !allowSeparator) {
          throw Error;
        }
      }

      // Binary literals
      // ES2015 added support for binary literals by using the '0b' prefix followed by a sequence of binary numbers
      if (letterCaseInsensitive(char) === Chars.LowerB) {
        char = forwardChar(parser);

        while (CharTypes[char] & (CharSymbol.Binary | CharSymbol.Underscore)) {
          if (char === Chars.Underscore) {
            if (!allowSeparator) {
              throw Error;
            }
            allowSeparator = false;
            char = forwardChar(parser);
            continue;
          }

          allowSeparator = true;
          value = value * 2 + (char - Chars.Zero);
          char = forwardChar(parser);
          digits++;
        }
        if (digits < 1 || !allowSeparator) {
          throw Error;
        }
      }

      // Octal literals
      // ES2015 allows to specify the octal literal by using the prefix '0o' followed by a sequence of octal digits
      if (letterCaseInsensitive(char) === Chars.LowerO) {
        char = forwardChar(parser);

        while (CharTypes[char] & (CharSymbol.Octal | CharSymbol.Underscore)) {
          if (char === Chars.Underscore) {
            if (!allowSeparator) {
              throw Error;
            }
            allowSeparator = false;
            char = forwardChar(parser);
            continue;
          }

          allowSeparator = true;
          value = value * 8 + (char - Chars.Zero);
          char = forwardChar(parser);
          digits++;
        }
        if (digits < 1 || !allowSeparator) {
          throw Error;
        }
      }

      // 1. Implicit Octal Literal
      //     in ES5, to represent an octal literal, use the zero prefix (0) followed by a sequence of octal digits
      //     '0123' --> '83'
      // 2. If the octal literal contains a number that is out of range,
      //     JavaScript ignores the leading 0 and treats the octal literal as a decimal
      //     '098' --> '98'
      if (CharTypes[char] & CharSymbol.Octal) {
        // if strict, error
        type = NumberKind.ImplicitOctal;
        while (CharTypes[char] & CharSymbol.Octal) {
          value = value * 8 + (char - Chars.Zero);
          char = forwardChar(parser);
          digits++;
        }
      }
    }

    value += parseDecimalWithSeparator(parser, char);
    char = parser.currentChar;

    // Only decimal Numbers are allowed to have decimals
    if (type & NumberKind.DecimalNumberKind) {
      if (char === Chars.Period) {
        if (forwardChar(parser) === Chars.Underscore) {
          throw Error;
        }
        value += '.' + parseDecimalWithSeparator(parser, parser.currentChar);
        char = parser.currentChar;
      }
    }
  }

  if (isFloat) {
    value = '.' + parseDecimalWithSeparator(parser, char);
    char = parser.currentChar;
    // Syntax Error
    if (char === Chars.LowerN) {
      throw Error;
    }
  }

  if (letterCaseInsensitive(char) === Chars.LowerE) {
    const end = parser.index;
    char = forwardChar(parser);

    if (CharTypes[char] & CharSymbol.Exponent) char = forwardChar(parser);

    const { index } = parser;

    if ((CharTypes[char] & CharSymbol.Decimal) < 1) {
      throw Error;
    }

    value +=
      parser.source.substring(end, index) +
      parseDecimalWithSeparator(parser, char);
  }

  parser.tokenValue = parseFloat(value);

  return Token.NumericLiteral;
};
