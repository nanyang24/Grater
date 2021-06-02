import { nextToken } from '../tokenizer/scanner';
import { Context, IParserState } from './type';
import { Token } from '../tokenizer/token';
import { KeywordTokenTable } from '../tokenizer/utils';
import { report, Errors } from '../error-handler';

export function consume(parser: IParserState, context: Context, t: Token): any {
  if (parser.token !== t) {
    report(parser, Errors.ExpectedToken, KeywordTokenTable[t & Token.Mask]);
  }

  nextToken(parser, context);
}

export function consumeOpt(
  parser: IParserState,
  context: Context,
  t: Token,
): boolean {
  if (parser.token !== t) return false;
  nextToken(parser, context);
  return true;
}

export function consumeSemicolon(parser: IParserState, context: Context): void {
  // https://tc39.es/ecma262/#sec-automatic-semicolon-insertion
  // https://tc39.es/ecma262/#sec-line-terminators

  if (
    (parser.token & Token.IsAutoSemicolon) !== Token.IsAutoSemicolon &&
    !parser.lineTerminatorBeforeNextToken
  ) {
    report(
      parser,
      Errors.UnexpectedToken,
      KeywordTokenTable[parser.token & Token.Mask],
    );
  }
  consumeOpt(parser, context, Token.Semicolon);
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
