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

const parseLiteral = (parser: IParserState) => {
  const { tokenValue } = parser;

  nextToken(parser);

  return wrapNode(parser, {
    type: 'Literal',
    name: tokenValue,
  });
};

const parseIdentifier = (parser: IParserState) => {
  const { tokenValue } = parser;

  nextToken(parser);

  return wrapNode(parser, {
    type: 'Identifier',
    name: tokenValue,
  });
};

const parseNormalExpression = (
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

// eslint-disable-next-line arrow-body-style
const parseStatement = (parser: IParserState): ESTree.Statement => {
  return parseNormalExpression(parser);
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
