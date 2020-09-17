import { IParserState } from '../parser/type';
import { Token, mapKeywordTable } from './token';
import { forwardChar } from './utils';
import { isIdentifierPart } from './charClassifier';

export function scanIdentifier(parser: IParserState): Token {
  // Get the full identifier
  while (isIdentifierPart(forwardChar(parser))) {}

  // get one identifier
  parser.tokenValue = parser.source.slice(parser.tokenPos, parser.index);

  // Determine if it is a keyword
  return mapKeywordTable[parser.tokenValue] || Token.Identifier;
}
