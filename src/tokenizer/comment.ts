import { IParserState } from '../parser/type';
import { CharTypes, CharSymbol, Chars } from './charClassifier';
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

export function skipMultiLine(parser: IParserState) {
  while (parser.index < parser.end) {
    while (parser.currentChar === Chars.Asterisk) {
      forwardChar(parser);
    }
    if (parser.currentChar === Chars.Slash) {
      forwardChar(parser);
      parser.tokenPos = parser.index;
      parser.linePos = parser.line;
      parser.colPos = parser.column;
      return;
    }

    if (CharTypes[parser.currentChar] & CharSymbol.LineTerminator) {
      if (parser.currentChar === Chars.CarriageReturn) {
        jumpToNewlne(parser);
      } else {
        parser.currentChar = parser.source.charCodeAt(++parser.index);
        parser.lineTerminatorBeforeNextToken = true;
      }
    } else {
      forwardChar(parser);
    }
  }
}
