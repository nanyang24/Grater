import { nextToken } from '../tokenizer/scanner';
import { IParserState } from './type';
import { Token } from '../tokenizer/token';

export function consume(parser: IParserState, t: Token): any {
  if (parser.token !== t) {
    throw Error;
  }

  nextToken(parser);
}

export function consumeOpt(parser: IParserState, t: Token): boolean {
  if (parser.token !== t) return false;
  nextToken(parser);
  return true;
}

export function consumeSemicolon(parser: IParserState): void {
  // https://tc39.es/ecma262/#sec-automatic-semicolon-insertion

  if ((parser.token & Token.IsAutoSemicolon) !== Token.IsAutoSemicolon) {
    throw Error;
  }
  consumeOpt(parser, Token.Semicolon);
}

export function mapToAssignment(node: any): void {
  switch (node.type) {
    case 'ArrayExpression': {
      node.type = 'ArrayPattern';
      const { elements } = node;
      let i = elements.length;
      while (i--) {
        mapToAssignment(elements[i]);
      }
      return undefined;
    }
    case 'ObjectExpression': {
      node.type = 'ObjectPattern';
      const { properties } = node;
      let i = properties.length;
      while (i--) {
        mapToAssignment(properties[i]);
      }
      return undefined;
    }
  }
}
