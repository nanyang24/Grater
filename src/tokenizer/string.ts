import { IParserState } from '../parser/type';
import { Token } from './token';
import { forwardChar, betterFromCharCode, toHex } from './utils';
import { CharTypes, CharSymbol, Chars } from './charClassifier';

const transformEscape = (parser: IParserState, char: number): number => {
  switch (char) {
    // SingleEscapeCharacter::one of ' " \ b f n r t v
    // https://tc39.es/ecma262/#prod-SingleEscapeCharacter
    case Chars.LowerB:
      return Chars.Backspace;
    case Chars.LowerF:
      return Chars.FormFeed;
    case Chars.LowerN:
      return Chars.LineFeed;
    case Chars.LowerR:
      return Chars.CarriageReturn;
    case Chars.LowerT:
      return Chars.Tab;
    case Chars.LowerV:
      return Chars.VerticalTab;

    // Octal escape sequences
    case Chars.Zero:
    case Chars.One:
    case Chars.Two:
    case Chars.Three:
    case Chars.Four:
    case Chars.Five:
    case Chars.Six:
    case Chars.Seven: {
      let code = char - Chars.Zero; // decimal to hex:: decimal - hex = hex
      let nextIndex = parser.index + 1;
      let nextColumn = parser.column + 1;

      // TODO: if(strict) return error

      // An Octal number beginning with 0/1/2/3, It will be composed of 3 significant numbers
      // e.g: '\123', '\231', '\321'
      if (
        char === Chars.Zero ||
        char === Chars.One ||
        char === Chars.Two ||
        char === Chars.Three
      ) {
        if (nextIndex < parser.end) {
          const nextChar = parser.source.charCodeAt(nextIndex);

          // If the next character is octal
          if (CharTypes[nextChar] & CharSymbol.Octal) {
            parser.currentChar = nextChar;
            code = (code << 3) | (nextChar - Chars.Zero);

            nextIndex++;
            nextColumn++;
            if (nextIndex < parser.end) {
              // eslint-disable-next-line no-shadow
              const nextChar = parser.source.charCodeAt(nextIndex);

              if (CharTypes[nextChar] & CharSymbol.Octal) {
                parser.currentChar = nextChar;
                code = (code << 3) | (nextChar - Chars.Zero);

                nextIndex++;
                nextColumn++;
              }
            }

            parser.index = nextIndex - 1;
            parser.column = nextColumn - 1;
          }
        }
      }

      // An Octal number beginning with 4/5/6/7, It will be composed of 2 significant numbers
      // e.g: '\456', '\567'
      if (
        char === Chars.Four ||
        char === Chars.Five ||
        char === Chars.Six ||
        char === Chars.Seven
      ) {
        if (nextIndex < parser.end) {
          const nextChar = parser.source.charCodeAt(nextIndex);
          if (CharTypes[nextChar] & CharSymbol.Octal) {
            parser.currentChar = nextChar;
            code = (code << 3) | (nextChar - Chars.Zero);
            parser.index = nextIndex;
            parser.column = nextColumn;
          }
        }
      }

      return code;
    }

    // invalid escapes `8`, `9`
    case Chars.Eight:
    case Chars.Nine:
      return -1;

    // HexEscapeSequence
    // \x HexDigit HexDigit
    case Chars.LowerX: {
      const ch1 = forwardChar(parser);
      if ((CharTypes[ch1] & CharSymbol.Hex) === 0) return -1;
      const hi = toHex(ch1);
      const ch2 = forwardChar(parser);
      if ((CharTypes[ch2] & CharSymbol.Hex) === 0) return -1;
      const lo = toHex(ch2);

      return (hi << 4) | lo;
    }

    // UnicodeEscapeSequence
    // \u HexDigit HexDigit HexDigit HexDigit
    // \u { HexDigit HexDigit HexDigit ... }
    case Chars.LowerU: {
      const ch = forwardChar(parser);

      if (parser.currentChar === Chars.LeftBrace) {
        let code = 0;
        while ((CharTypes[forwardChar(parser)] & CharSymbol.Hex) !== 0) {
          code = (code << 4) | toHex(parser.currentChar);
          if (code > Chars.NonBMPMax) return -1;
        }

        if (
          parser.currentChar < 1 ||
          (parser.currentChar as number) !== Chars.RightBrace
        ) {
          return -1;
        }
        return code;
      } else {
        if ((CharTypes[ch] & CharSymbol.Hex) === 0) return -1;
        const ch2 = parser.source.charCodeAt(parser.index + 1);
        if ((CharTypes[ch2] & CharSymbol.Hex) === 0) return -1;
        const ch3 = parser.source.charCodeAt(parser.index + 2);
        if ((CharTypes[ch3] & CharSymbol.Hex) === 0) return -1;
        const ch4 = parser.source.charCodeAt(parser.index + 3);
        if ((CharTypes[ch4] & CharSymbol.Hex) === 0) return -1;

        parser.index += 3;
        parser.column += 3;

        parser.currentChar = parser.source.charCodeAt(parser.index);

        return (
          (toHex(ch) << 12) | (toHex(ch2) << 8) | (toHex(ch3) << 4) | toHex(ch4)
        );
      }
    }

    default:
      // by default, would not to escape
      return char;
  }
};

export /**
 * @param {IParserState} parser
 * @param {number} quote
 * @returns {*}
 */
const scanString = (parser: IParserState, quote: number): any => {
  let curChar = forwardChar(parser);
  let sumString = '';
  let starSign = parser.index;

  // LineTerminator: a special character or sequence of characters signifying the end of a line of text
  while ((CharTypes[curChar] & CharSymbol.LineTerminator) === 0) {
    // If the character equal to "quote"
    if (curChar === quote) {
      // get full string value
      sumString += parser.source.substring(starSign, parser.index);

      forwardChar(parser); // skip closing quote
      parser.tokenValue = sumString;
      return Token.StringLiteral;
    }

    // if the character equal to "\". in ECMAScript, number will be equal to ascii, eg: 92 === 0x5C
    // Escape character
    if (curChar === Chars.Backslash) {
      sumString += parser.source.substring(starSign, parser.index);
      // skip the Escape character
      curChar = forwardChar(parser);

      if (curChar > 0x7e) {
        sumString += betterFromCharCode(curChar);
      } else {
        const code = transformEscape(parser, curChar);

        if (code >= 0) sumString += betterFromCharCode(code);
      }

      starSign = parser.index + 1;
    }

    curChar = forwardChar(parser);
  }

  return undefined;
};
