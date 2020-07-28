import { nextToken } from '../tokenizer/scanner';
import createParserState from './createParserState';

// typings
import * as ESTree from '../es-tree';
import { Token } from '../tokenizer/token';
import { consumeSemicolon, consumeOpt } from './utils';
import { IParserState } from './type';

// eslint-disable-next-line arrow-body-style
const wrapNode = <T extends any>(parser: IParserState, node: T): T => {
  return node;
};

const parseThisExpression = (parser: IParserState) => {
  nextToken(parser);
  return wrapNode(parser, {
    type: 'ThisExpression',
  });
};

const parsePrimitiveLiteral = (parser: IParserState) => {
  const { tokenValue } = parser;

  // Maybe a little mental burden
  const value = JSON.parse(tokenValue);

  nextToken(parser);
  return wrapNode(parser, {
    type: 'Literal',
    value,
  });
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
  /**
   * PrimaryExpression[Yield, Await]:
   *   this
   *   IdentifierReference[?Yield, ?Await]
   *   Literal
   *   ArrayLiteral[?Yield, ?Await]
   *   ObjectLiteral[?Yield, ?Await]
   *   FunctionExpression
   *   ClassExpression[?Yield, ?Await]
   *   GeneratorExpression
   *   AsyncFunctionExpression
   *   AsyncGeneratorExpression
   *   RegularExpressionLiteral
   *   TemplateLiteral[?Yield, ?Await, ~Tagged]
   *   CoverParenthesizedExpressionAndArrowParameterList[?Yield, ?Await]
   */

  if ((parser.token & Token.IsIdentifier) === Token.IsIdentifier) {
    return parseIdentifier(parser);
  }

  if ((parser.token & Token.IsStringOrNumber) === Token.IsStringOrNumber) {
    return parseLiteral(parser);
  }

  switch (parser.token) {
    case Token.ThisKeyword:
      return parseThisExpression(parser);
    case Token.TrueKeyword:
    case Token.FalseKeyword:
    case Token.NullKeyword:
      return parsePrimitiveLiteral(parser);
  }

  return '';
};

const parseExpressionStatement = (
  parser: IParserState,
  expression: ESTree.Expression,
): ESTree.ExpressionStatement => {
  consumeSemicolon(parser);
  return wrapNode(parser, {
    type: 'ExpressionStatement',
    expression,
  });
};

/**
 * https://tc39.es/ecma262/index.html#sec-ecmascript-language-expressions
 */
const parseExpression = (parser: IParserState): ESTree.ExpressionStatement => {
  const expression: ESTree.Expression = parsePrimaryExpression(parser);

  return parseExpressionStatement(parser, expression);
};

const parseAndClassifyIdentifier = (
  parser: IParserState,
): ESTree.Identifier => {
  nextToken(parser);

  return wrapNode(parser, {
    type: 'Identifier',
    name: parser.tokenValue,
  });
};

const parseBindingPattern = (parser: IParserState) => {
  if (parser.token & Token.IsIdentifier) {
    return parseAndClassifyIdentifier(parser);
  }
  return ('' as unknown) as ESTree.Identifier;
};

const parseVariableDeclaration = (
  parser: IParserState,
): ESTree.VariableDeclarator => {
  let init:
    | ESTree.Expression
    | ESTree.BindingPattern
    | ESTree.Identifier
    | null = null;

  const id = parseBindingPattern(parser);

  if (parser.token === Token.Assign) {
    nextToken(parser);
    init = parseExpression(parser);
  }

  return wrapNode(parser, {
    type: 'VariableDeclarator',
    id,
    init,
  });
};

const parseVariableDeclarationList = (parser: IParserState) => {
  let bindingCount = 1;
  const list: ESTree.VariableDeclarator[] = [parseVariableDeclaration(parser)];
  while (consumeOpt(parser, Token.Comma)) {
    bindingCount++;
    list.push(parseVariableDeclaration(parser));
  }

  if (bindingCount) {
  }

  return list;
};

// https://tc39.es/ecma262/#prod-VariableDeclaration
const parseVariableStatement = (
  parser: IParserState,
): ESTree.VariableDeclaration => {
  nextToken(parser);

  const declarations = parseVariableDeclarationList(parser);

  consumeSemicolon(parser);

  return wrapNode(parser, {
    type: 'VariableDeclaration',
    kind: 'var',
    declarations,
  });
};

const parseExpressionStatements = (parser: IParserState) => {
  const { token } = parser;
  let expr: ESTree.Expression;

  switch (token) {
    default:
      expr = parsePrimaryExpression(parser);
  }
  return parseExpressionStatement(parser, expr);
};

/**
 * https://tc39.es/ecma262/#sec-ecmascript-language-statements-and-declarations
 * */
const parseStatement = (parser: IParserState): ESTree.Statement => {
  // Statement
  //   BlockStatement
  //   VariableStatement
  //   EmptyStatement
  //   ExpressionStatement
  //   IfStatement
  //   BreakableStatement
  //      IterationStatement
  //      SwitchStatement
  //   ContinueStatement
  //   BreakStatement
  //   [+Return]ReturnStatement
  //   WithStatement
  //   LabelledStatement
  //   ThrowStatement
  //   TryStatement
  //   DebuggerStatement

  switch (parser.token) {
    case Token.VarKeyword: {
      return parseVariableStatement(parser);
    }
    default: {
      return parseExpressionStatements(parser);
    }
  }
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

  // Get the machine moving!
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
