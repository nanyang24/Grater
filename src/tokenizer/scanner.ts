import { IParserState } from '../parser/type';
import { scanIdentifier } from './identifier';
import { scanString } from './string';
import { scanNumber } from './numeric';
import { Token } from './token';
import { TokenPickUpFromASCII, forwardChar, isDecimalDigit } from './utils';

export function scan(parser: IParserState): Token {
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
        case Token.Unknown: {
          forwardChar(parser);
          return token;
        }

        // general white-space
        case Token.WhiteSpace: {
          forwardChar(parser);
          break;
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

        //  `A`...`Z`, `_internal`, `$value`
        case Token.Identifier: {
          return scanIdentifier(parser);
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
  parser.token = scan(parser);
}
