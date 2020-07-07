import { IParserState } from '../parser/type';
import { Token, mapKeywordTable } from './token';
import { forwardChar } from './utils';
import { isIdentifierPart } from './charClassifier';

export function scanIdentifier(parser: IParserState): Token {
  while (isIdentifierPart(forwardChar(parser))) {}

  parser.tokenValue = parser.source.slice(parser.tokenPos, parser.index);

  return mapKeywordTable[parser.tokenValue] || Token.Identifier;
}
