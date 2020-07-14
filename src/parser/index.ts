import { nextToken } from '../tokenizer/scanner';
import createParserState from './createParserState';

// typings
import * as ESTree from '../es-tree';
import { Token } from '../tokenizer/token';
import { IParserState } from './type';

// eslint-disable-next-line arrow-body-style
const wrapNode = <T extends any>(parser: IParserState, node: T): T => {
  return node;
};

const parseLiteral = (parser: IParserState): ESTree.Literal => {
  const { tokenValue } = parser;

  nextToken(parser);

  return wrapNode(parser, {
    type: 'Literal',
    value: tokenValue,
  });
};

const parseIdentifier = (parser: IParserState): ESTree.Identifier => {
  const { tokenValue } = parser;

  nextToken(parser);

  return wrapNode(parser, {
    type: 'Identifier',
    name: tokenValue,
  });
};

/**
 * https://tc39.es/ecma262/index.html#sec-primary-expression
 *
 * @param {IParserState} parser
 * @returns {(ESTree.Statement | ESTree.Expression)}
 */
const parsePrimaryExpression = (
  parser: IParserState,
): ESTree.Statement | ESTree.Expression => {
  let expression;
  if ((parser.token & Token.IsIdentifier) === Token.IsIdentifier) {
    expression = parseIdentifier(parser);
  }

  if ((parser.token & Token.IsStringOrNumber) === Token.IsStringOrNumber) {
    expression = parseLiteral(parser);
  }

  return expression;
};

export function parseExpressionStatement(
  parser: IParserState,
  expression: ESTree.Expression,
): ESTree.ExpressionStatement {
  return wrapNode(parser, {
    type: 'ExpressionStatement',
    expression,
  });
}

/**
 * https://tc39.es/ecma262/index.html#sec-ecmascript-language-expressions
 */
const parseExpression = (parser: IParserState): ESTree.ExpressionStatement => {
  const expression: ESTree.Expression = parsePrimaryExpression(parser);

  return parseExpressionStatement(parser, expression);
};

// eslint-disable-next-line arrow-body-style
const parseStatement = (parser: IParserState): ESTree.Statement => {
  return parseExpression(parser);
};

const parseStatementItem = (parser: IParserState): ESTree.Statement => {
  switch (parser.token) {
    default: {
      return parseStatement(parser);
    }
  }
};

const parseStatementsList = (parser: IParserState) => {
  // Initialize token
  nextToken(parser);

  const statements: ESTree.Statement[] = [];

  while (parser.token !== Token.EOF) {
    statements.push(parseStatementItem(parser));
  }
  return statements;
};

const parserMachine = (source: string): ESTree.Program => {
  // Initialize parser state
  const parserState: IParserState = createParserState(source);
  const sourceType: ESTree.SourceType = 'script';

  let body: any[] = [];

  body = parseStatementsList(parserState);

  const nodeTree: ESTree.Program = {
    type: 'Program',
    sourceType,
    body,
  };

  return nodeTree;
};

export { parserMachine };
