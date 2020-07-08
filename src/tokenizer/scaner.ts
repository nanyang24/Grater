import { IParserState } from '../parser/type';
import { scanIdentifier } from './identifier';
import { Token } from './token';
import { TokenPickUpFromASCII, forwardChar } from './utils';

export function scan(parser: IParserState): Token {
  // const { source } = parser;
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
