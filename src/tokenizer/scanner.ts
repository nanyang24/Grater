import { IParserState } from '../parser/type';
import { scanIdentifier } from './identifier';
import { scanString } from './string';
import { scanNumber } from './numeric';
import { Token } from './token';
import { TokenPickUpFromASCII, forwardChar, isDecimalDigit } from './utils';
import { Chars } from './charClassifier';

export function scan(parser: IParserState): Token {
  const lastIsCR = false;

  // const { source } = parser;
  // scan the whole stream
  while (parser.index < parser.end) {
    parser.tokenPos = parser.index;
    parser.colPos = parser.column;
    parser.linePos = parser.line;

    const char = parser.currentChar;

    // before (del) 127 0177 0x7f
    if (char <= 0x7f) {
      const token = TokenPickUpFromASCII[char];

      switch (token) {
        case Token.Unknown:
        case Token.Semicolon:
        case Token.Comma:
        case Token.LeftBracket:
        case Token.RightBracket:
        case Token.LeftBrace:
        case Token.RightBrace:
        case Token.LeftParen:
        case Token.RightParen:
        case Token.Colon: {
          forwardChar(parser);
          return token;
        }

        // general white-space
        case Token.WhiteSpace: {
          forwardChar(parser);
          break;
        }

        // `=`, `==`, `===`, `=>`
        case Token.Assign: {
          forwardChar(parser);

          if (parser.index >= parser.end) return Token.Assign;
          const { currentChar } = parser;

          // `===`, `==`
          if (currentChar === Chars.EqualSign) {
            if (forwardChar(parser) === Chars.EqualSign) {
              forwardChar(parser);
              return Token.StrictEqual;
            }
            return Token.LooseEqual;
          }

          // `=>`
          if (currentChar === Chars.GreaterThan) {
            forwardChar(parser);
            return Token.Arrow;
          }

          return Token.Assign;
        }

        // `!`, `!=`, `!==`
        case Token.Negate: {
          if (forwardChar(parser) !== Chars.EqualSign) {
            return Token.Negate;
          }
          if (forwardChar(parser) !== Chars.EqualSign) {
            return Token.LooseNotEqual;
          }
          forwardChar(parser);
          return Token.StrictNotEqual;
        }

        // `+`, `++`, `+=`
        case Token.Add: {
          forwardChar(parser);

          const ch = parser.currentChar;

          if (ch === Chars.Plus) {
            forwardChar(parser);
            return Token.Increment;
          }

          if (ch === Chars.EqualSign) {
            forwardChar(parser);
            return Token.AddAssign;
          }

          return Token.Add;
        }

        // `-`, `--`, `-=`
        case Token.Subtract: {
          forwardChar(parser);
          if (parser.index >= parser.end) return Token.Subtract;
          const ch = parser.currentChar;

          if (ch === Chars.Hyphen) {
            forwardChar(parser);

            return Token.Decrement;
          }

          if (ch === Chars.EqualSign) {
            forwardChar(parser);
            return Token.SubtractAssign;
          }

          return Token.Subtract;
        }

        // `%`, `%=`
        case Token.Modulo: {
          if (forwardChar(parser) !== Chars.EqualSign) return Token.Modulo;
          forwardChar(parser);
          return Token.ModuloAssign;
        }

        // `*`, `**`, `*=`, `**=`
        case Token.Multiply: {
          forwardChar(parser);

          if (parser.index >= parser.end) return Token.Multiply;

          const ch = parser.currentChar;

          if (ch === Chars.EqualSign) {
            forwardChar(parser);
            return Token.MultiplyAssign;
          }

          if (ch !== Chars.Asterisk) return Token.Multiply;

          if (forwardChar(parser) !== Chars.EqualSign) {
            return Token.Exponentiate;
          }

          forwardChar(parser);

          return Token.ExponentiateAssign;
        }

        // `/`
        case Token.Divide: {
          forwardChar(parser);

          return Token.Divide;
        }

        // `^`, `^=`
        case Token.BitwiseXor:
          if (forwardChar(parser) !== Chars.EqualSign) return Token.BitwiseXor;
          forwardChar(parser);
          return Token.BitwiseXorAssign;

        // `&`, `&&`, `&=`
        case Token.BitwiseAnd: {
          forwardChar(parser);
          if (parser.index >= parser.end) return Token.BitwiseAnd;
          const ch = parser.currentChar;

          if (ch === Chars.Ampersand) {
            forwardChar(parser);
            return Token.LogicalAnd;
          }

          if (ch === Chars.EqualSign) {
            forwardChar(parser);
            return Token.BitwiseAndAssign;
          }

          return Token.BitwiseAnd;
        }

        // `|`, `||`, `|=`
        case Token.BitwiseOr: {
          forwardChar(parser);
          if (parser.index >= parser.end) return Token.BitwiseOr;
          const ch = parser.currentChar;

          if (ch === Chars.VerticalBar) {
            forwardChar(parser);
            return Token.LogicalOr;
          }
          if (ch === Chars.EqualSign) {
            forwardChar(parser);
            return Token.BitwiseOrAssign;
          }

          return Token.BitwiseOr;
        }

        // `>`, `>=`, `>>`, `>>>`, `>>=`, `>>>=`
        case Token.GreaterThan: {
          forwardChar(parser);

          if (parser.index >= parser.end) return Token.GreaterThan;

          const ch = parser.currentChar;

          if (ch === Chars.EqualSign) {
            forwardChar(parser);
            return Token.GreaterThanOrEqual;
          }

          if (ch !== Chars.GreaterThan) return Token.GreaterThan;

          forwardChar(parser);

          if (parser.index < parser.end) {
            // eslint-disable-next-line no-shadow
            const ch = parser.currentChar;

            if (ch === Chars.GreaterThan) {
              if (forwardChar(parser) === Chars.EqualSign) {
                forwardChar(parser);
                return Token.LogicalShiftRightAssign;
              }
              return Token.LogicalShiftRight;
            }
            if (ch === Chars.EqualSign) {
              forwardChar(parser);
              return Token.ShiftRightAssign;
            }
          }

          return Token.ShiftRight;
        }

        // `'string'`, `"string"`
        case Token.StringLiteral: {
          return scanString(parser, char);
        }

        // .123
        case Token.Period: {
          const nextChar = forwardChar(parser);
          if (isDecimalDigit(nextChar)) {
            return scanNumber(parser, true);
          }
          return Token.Period;
        }

        case Token.NumericLiteral: {
          return scanNumber(parser);
        }

        //  Keywords
        case Token.Keyword: {
          return scanIdentifier(parser);
        }

        //  `A`...`Z`, `_internal`, `$value`
        case Token.Identifier: {
          return scanIdentifier(parser);
        }

        case Token.LineFeed: {
          if (!lastIsCR) {
            parser.column = 0;
            parser.line++;
          }
          parser.currentChar = parser.source.charCodeAt(++parser.index);
          parser.lineTerminatorBeforeNextToken = true;

          break;
        }
      }
    } else {
      // do something
    }
  }
  return Token.EOF;
}

export function nextToken(parser: IParserState): void {
  parser.startPos = parser.index;
  parser.startColumn = parser.column;
  parser.startLine = parser.line;
  parser.lineTerminatorBeforeNextToken = false;
  parser.token = scan(parser);
}
