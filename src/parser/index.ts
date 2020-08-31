import { nextToken } from '../tokenizer/scanner';
import createParserState from './createParserState';

// typings
import * as ESTree from '../es-tree';
import { Token } from '../tokenizer/token';
import { KeywordTokenTable } from '../tokenizer/utils';
import { consumeSemicolon, consumeOpt, mapToAssignment } from './utils';
import { IParserState, PropertyKind, PropertyKindMap } from './type';

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

export function parseComputedPropertyName(
  parser: IParserState,
): ESTree.Expression {
  // ComputedPropertyName :
  //   [ AssignmentExpression ]
  nextToken(parser);
  const key = parseExpression(parser);
  consumeOpt(parser, Token.RightBracket);
  return key;
}

const parsePropertyDefinition = (parser: IParserState): ESTree.Property => {
  let key;
  let value;
  let kind = PropertyKind.None;
  let computed = false;
  let shorthand = false;

  // LiteralPropertyName
  if (parser.token & (Token.IsIdentifier | Token.Keyword)) {
    key = parseIdentifier(parser);
    kind |= PropertyKind.Generator;

    // shortHand: `,` `}` `=`
    if (
      parser.token === Token.Comma ||
      parser.token === Token.RightBrace ||
      parser.token === Token.Assign
    ) {
      shorthand = true;
      value = { ...key };
    } else if (consumeOpt(parser, Token.Colon)) {
      value = parsePrimaryExpression(parser);
    }
  } else if (parser.token === Token.LeftBracket) {
    key = parseComputedPropertyName(parser);
    kind |= PropertyKind.Generator;
    computed = true;
    if (consumeOpt(parser, Token.Colon)) {
      value = parsePrimaryExpression(parser);
    }
  } else if (parser.token & Token.IsStringOrNumber) {
    key = parseLiteral(parser);
    if (consumeOpt(parser, Token.Colon)) {
      value = parsePrimaryExpression(parser);
    } else {
      throw Error;
    }
  } else {
    throw Error;
  }

  return wrapNode(parser, {
    type: 'Property',
    key,
    value,
    kind: PropertyKindMap[kind],
    computed,
    method: false,
    shorthand,
  }) as ESTree.Property;
};

const parseObjectExpression = (
  parser: IParserState,
): ESTree.ObjectExpression => {
  nextToken(parser);

  const properties: ESTree.Property[] = [];

  while (parser.token !== Token.RightBrace) {
    properties.push(parsePropertyDefinition(parser));

    if (parser.token !== Token.Comma) break;

    nextToken(parser);
  }

  consumeOpt(parser, Token.RightBrace);

  const node = wrapNode(parser, {
    type: 'ObjectExpression',
    properties,
  }) as ESTree.ObjectExpression;

  if (parser.token & Token.IsAssignPart) {
    if (parser.token !== Token.Assign) {
      throw Error;
    }

    return parseAssignmentElement(parser, node);
  }
  return node;
};

// eslint-disable-next-line arrow-body-style
const parseObjectLiteral = (parser: IParserState) => {
  // ObjectLiteral[Yield, Await] :
  //    { }
  //    { PropertyDefinitionList[?Yield, ?Await] }
  //    { PropertyDefinitionList[?Yield, ?Await] , }
  //
  // PropertyDefinitionList[Yield, Await] :
  //    PropertyDefinition[?Yield, ?Await]
  //    PropertyDefinitionList[?Yield, ?Await] , PropertyDefinition[?Yield, ?Await]
  // PropertyDefinition[Yield, Await] :
  //    IdentifierReference[?Yield, ?Await]
  //    CoverInitializedName[?Yield, ?Await]
  //    PropertyName[?Yield, ?Await] : AssignmentExpression[+In, ?Yield, ?Await]
  //    MethodDefinition[?Yield, ?Await]
  //    ... AssignmentExpression[+In, ?Yield, ?Await]
  // PropertyName[Yield, Await] :
  //    LiteralPropertyName
  //    ComputedPropertyName[?Yield, ?Await]
  // LiteralPropertyName :
  //    IdentifierName
  //    StringLiteral
  //    NumericLiteral
  // ComputedPropertyName[Yield, Await] :
  //    [ AssignmentExpression[+In, ?Yield, ?Await] ]
  // CoverInitializedName[Yield, Await] :
  // https://stackoverflow.com/questions/57583695/what-is-coverinitializednameyield-in-ecma-2015-syntax-grammer
  //    IdentifierReference[?Yield, ?Await] Initializer[+In, ?Yield, ?Await]
  // Initializer[In, Yield, Await] :
  //    = AssignmentExpression[?In, ?Yield, ?Await]
  return parseObjectExpression(parser);
};

export const parseAssignmentElement = (
  parser: IParserState,
  left: ESTree.ArrayExpression | ESTree.ObjectExpression,
): any => {
  const operator = KeywordTokenTable[parser.token & Token.Musk];
  nextToken(parser);

  mapToAssignment(left);
  const right = parseExpression(parser);

  return wrapNode(parser, {
    type: 'AssignmentExpression',
    left,
    operator,
    right,
  });
};

const parseArrayExpression = (parser: IParserState): ESTree.ArrayExpression => {
  nextToken(parser);

  const elements: (
    | ESTree.Identifier
    | ESTree.AssignmentExpression
    | null
  )[] = [];

  while (parser.token !== Token.RightBracket) {
    let node: any;

    if (consumeOpt(parser, Token.Comma)) {
      elements.push(null);
      continue;
    } else {
      // TODO: Spread
      if (parser.token === Token.Ellipsis) {
      } else {
        node = parseExpression(parser);
      }
    }

    elements.push(node);

    if (consumeOpt(parser, Token.Comma)) {
      if (parser.token === Token.RightBracket) break;
    } else break;
  }

  consumeOpt(parser, Token.RightBracket);

  const node = wrapNode(parser, {
    type: 'ArrayExpression',
    elements,
  }) as ESTree.ArrayExpression;

  if (parser.token & Token.IsAssignPart) {
    if (parser.token !== Token.Assign) {
      throw Error;
    }

    return parseAssignmentElement(parser, node);
  }

  return node;
};

// eslint-disable-next-line arrow-body-style
const parseArrayLiteral = (parser: IParserState) => {
  /**
    ArrayLiteral[Yield, Await] :
      [ Elisionopt ]
      [ ElementList[?Yield, ?Await] ]
      [ ElementList[?Yield, ?Await] , Elisionopt ]

    ElementList[Yield, Await] :
      Elisionopt AssignmentExpression[+In, ?Yield, ?Await]
      Elisionopt SpreadElement[?Yield, ?Await]
      ElementList[?Yield, ?Await] , Elisionopt AssignmentExpression[+In, ?Yield, ?Await]
      ElementList[?Yield, ?Await] , Elisionopt SpreadElement[?Yield, ?Await]

    Elision :
      ,
      Elision ,

    SpreadElement[Yield, Await] :
      ... AssignmentExpression[+In, ?Yield, ?Await]
  */

  return parseArrayExpression(parser);
};

export const validateFunctionName = (parser: IParserState): any => {
  const { token } = parser;
  if ((token & Token.Keyword) === Token.Keyword) {
    throw Error;
  }
};

export const parseParameters = (parser: IParserState): ESTree.Parameter[] => {
  const params: ESTree.Parameter[] = [];

  if (consumeOpt(parser, Token.LeftParen)) {
    // TODO

    consumeOpt(parser, Token.RightParen);
  }

  return params;
};

export const parseFunctionBody = (
  parser: IParserState,
): ESTree.FunctionBody => {
  consumeOpt(parser, Token.LeftBrace);

  const body: ESTree.Statement[] = [];

  while (parser.token !== Token.RightBrace) {
    body.push(parseStatementItem(parser));
  }

  consumeOpt(parser, Token.RightBrace);

  return wrapNode(parser, {
    type: 'BlockStatement',
    body,
  });
};

const parseFunctionExpression = (parser: IParserState) => {
  nextToken(parser);

  // TODO Async Function
  const isAsync = false;
  // TODO Generator Function
  const isGenerator = false;

  let id: ESTree.Identifier | null = null;

  if (parser.token & (Token.IsIdentifier | Token.IsKeyword)) {
    validateFunctionName(parser);

    id = parseIdentifier(parser);
  }

  const params = parseParameters(parser);

  const body = parseFunctionBody(parser);

  return wrapNode(parser, {
    type: 'FunctionExpression',
    id,
    params,
    body,
    async: isAsync,
    generator: isGenerator,
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
   *   Function Defining Expressions:
   *      FunctionExpression
   *      ClassExpression[?Yield, ?Await]
   *      GeneratorExpression
   *      AsyncFunctionExpression
   *      AsyncGeneratorExpression
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
    // Array Initializer
    case Token.LeftBracket:
      return parseArrayLiteral(parser);
    // Object Initializer
    case Token.LeftBrace: {
      return parseObjectLiteral(parser);
    }
    // FunctionExpression
    case Token.FunctionKeyword:
      return parseFunctionExpression(parser);
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

const parseAssignmentExpression = (
  parser: IParserState,
  expression: ESTree.Expression,
): ESTree.AssignmentExpression | ESTree.Expression => {
  if (parser.token & Token.IsAssignPart) {
    const operator = KeywordTokenTable[parser.token & Token.Musk];
    nextToken(parser);
    const right = parseExpression(parser);

    // TODO: AssignmentPattern
    return wrapNode(parser, {
      type: 'AssignmentExpression',
      left: expression,
      operator,
      right,
    });
  }

  return expression;
};

/**
 * https://tc39.es/ecma262/#prod-MemberExpression
 *
 * @param {IParserState} parser
 * @param {ESTree.Expression} expr
 * @returns {ESTree.Expression}
 */
const parseMemberExpression = (
  parser: IParserState,
  expr: ESTree.Expression,
  // eslint-disable-next-line arrow-body-style
): ESTree.Expression => {
  // TODO

  return expr;
};

/**
 * https://tc39.es/ecma262/#sec-left-hand-side-expressions
 *
 * @param {IParserState} parser
 * @returns {ESTree.Expression}
 */
const parseLeftHandSideExpression = (
  parser: IParserState,
): ESTree.Expression => {
  let expr: ESTree.LeftHandSideExpression = parsePrimaryExpression(parser);

  expr = parseMemberExpression(parser, expr);
  return expr;
};

/**
 * https://tc39.es/ecma262/index.html#sec-ecmascript-language-expressions
 */
const parseExpression = (parser: IParserState): ESTree.ExpressionStatement => {
  const expression: ESTree.Expression = parseLeftHandSideExpression(parser);

  return parseAssignmentExpression(parser, expression);
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

const parseBlockStatement = (parser: IParserState): ESTree.BlockStatement => {
  // BlockStatement[Yield, Await, Return]:
  //    Block[?Yield, ?Await, ?Return]
  // Block[Yield, Await, Return]:
  //    {StatementList[?Yield, ?Await, ?Return]opt}

  const body: ESTree.Statement[] = [];
  consumeOpt(parser, Token.LeftBrace);

  while (parser.token !== Token.RightBrace) {
    body.push(parseStatementItem(parser));
  }

  consumeOpt(parser, Token.RightBrace);

  return wrapNode(parser, {
    type: 'BlockStatement',
    body,
  });
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
    case Token.LeftBrace: {
      return parseBlockStatement(parser);
    }
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

/**

`const ny = 24`

            Script
               |
          ScriptBody
               |
         StatementList
               |
       StatementListItem
               |
          Declaration
               |
      LexicalDeclaration
     /         |        \
LetOrConst BindingList  ';'
    |           |
 'const'   LexicalBinding
             /          \
     BindingIdentifier  Initializer
            |                |
         Identifier    AssignmentExpression
            |                  |
       IdentifierName         ...
            |                  |
          'ny'               '24'

`ny = 24`
                     Statement
                         |
               ExpressionStatement
                     /        \
                   Expression ';'
                        |
              AssignmentExpression
             /          |         \
LeftHandSideExpression '=' AssignmentExpression
         |                         |
    NewExpression                ...
         |                         |
   MemberExpression              '24'
         |
   PrimaryExpression
         |
IdentifierReference
         |
     Identifier
         |
   IdentifierName
         |
       'ny'

*/
