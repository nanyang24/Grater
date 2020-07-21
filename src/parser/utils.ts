import { nextToken } from '../tokenizer/scanner';
import { IParserState } from './type';
import { Token } from '../tokenizer/token';

export function consumeOpt(parser: IParserState, t: Token): boolean {
  if (parser.token !== t) return false;
  nextToken(parser);
  return true;
}

export function consumeSemicolon(parser: IParserState): void {
  if ((parser.token & Token.EOF) !== Token.EOF) {
    throw Error;
  }
  consumeOpt(parser, Token.Semicolon);
}
