import { IParserState } from '../parser/type';
import { CharTypes, CharSymbol } from './charClassifier';
import { jumpToNewlne, forwardChar } from './utils';

export function skipSingleLine(parser: IParserState) {
  while (parser.index < parser.end) {
    if (CharTypes[parser.currentChar] & CharSymbol.LineTerminator) {
      jumpToNewlne(parser);

      break;
    }

    forwardChar(parser);

    parser.tokenPos = parser.index;
    parser.linePos = parser.line;
    parser.colPos = parser.column;
  }
}
