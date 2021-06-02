import createParserState from './createParserState';
import { Token } from '../tokenizer/token';
import { nextToken } from '../tokenizer/scanner';
import { KeywordTokenTable } from '../tokenizer/utils';
import {
  consume,
  consumeOpt,
  consumeSemicolon,
  mapToAssignment,
} from './utils';
import { report, Errors } from '../error-handler';
import { wrapNode } from './common';

// typings
import * as ESTree from '../es-tree';
import {
  IParserState,
  PropertyKind,
  Context,
  Options,
  PropertyKindMap,
} from './type';

const parseThisExpression = (parser: IParserState, context: Context) => {
  const { linePos, colPos } = parser;

  nextToken(parser, context);
  parser.assignable = false;
  return wrapNode(
    parser,
    context,
    {
      type: 'ThisExpression',
    },
    {
      linePos,
      colPos,
    },
  );
};

const parsePrimitiveLiteral = (parser: IParserState, context: Context) => {
  const { tokenValue, linePos, colPos } = parser;

  // Maybe a little mental burden
  const value = JSON.parse(tokenValue);

  nextToken(parser, context);
  parser.assignable = false;
  return wrapNode(
    parser,
    context,
    {
      type: 'Literal',
      value,
    },
    {
      linePos,
      colPos,
    },
  );
};

const parseLiteral = (
  parser: IParserState,
  context: Context,
): ESTree.Literal => {
  const { tokenValue, linePos, colPos } = parser;

  nextToken(parser, context);

  parser.assignable = false;

  return wrapNode(
    parser,
    context,
    {
      type: 'Literal',
      value: tokenValue,
    },
    {
      linePos,
      colPos,
    },
  );
};

const parseIdentifier = (
  parser: IParserState,
  context: Context,
): ESTree.Identifier => {
  const { tokenValue, linePos, colPos } = parser;

  nextToken(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'Identifier',
      name: tokenValue,
    },
    {
      linePos,
      colPos,
    },
  );
};

export function parseComputedPropertyName(
  parser: IParserState,
  context: Context,
): ESTree.Expression {
  // ComputedPropertyName :
  //   [ AssignmentExpression ]
  nextToken(parser, context);
  const key = parseExpression(parser, context);
  consumeOpt(parser, context, Token.RightBracket);
  return key;
}

const parsePropertyDefinition = (
  parser: IParserState,
  context: Context,
): ESTree.Property => {
  let key;
  let value;
  let kind = PropertyKind.None;
  let computed = false;
  let shorthand = false;

  const { linePos, colPos } = parser;

  // LiteralPropertyName
  if (parser.token & (Token.IsIdentifier | Token.Keyword)) {
    key = parseIdentifier(parser, context);
    kind |= PropertyKind.Generator;

    // shortHand: `,` `}` `=`
    if (
      parser.token === Token.Comma ||
      parser.token === Token.RightBrace ||
      parser.token === Token.Assign
    ) {
      shorthand = true;
      value = { ...key };
    } else if (consumeOpt(parser, context, Token.Colon)) {
      value = parsePrimaryExpression(parser, context);
    }
  } else if (parser.token === Token.LeftBracket) {
    key = parseComputedPropertyName(parser, context);
    kind |= PropertyKind.Generator;
    computed = true;
    if (consumeOpt(parser, context, Token.Colon)) {
      value = parsePrimaryExpression(parser, context);
    }
  } else if (parser.token & Token.IsStringOrNumber) {
    key = parseLiteral(parser, context);
    if (consumeOpt(parser, context, Token.Colon)) {
      value = parsePrimaryExpression(parser, context);
    } else {
      throw Error;
    }
  } else {
    throw Error;
  }

  return wrapNode(
    parser,
    context,
    {
      type: 'Property',
      key,
      value,
      kind: PropertyKindMap[kind],
      computed,
      method: false,
      shorthand,
    },
    {
      linePos,
      colPos,
    },
  ) as ESTree.Property;
};

const parseObjectExpression = (
  parser: IParserState,
  context: Context,
): ESTree.ObjectExpression => {
  const { linePos, colPos } = parser;

  nextToken(parser, context);

  const properties: ESTree.Property[] = [];

  while (parser.token !== Token.RightBrace) {
    properties.push(parsePropertyDefinition(parser, context));

    if (parser.token !== Token.Comma) break;

    nextToken(parser, context);
  }

  consumeOpt(parser, context, Token.RightBrace);

  const node = wrapNode(
    parser,
    context,
    {
      type: 'ObjectExpression',
      properties,
    },
    {
      linePos,
      colPos,
    },
  ) as ESTree.ObjectExpression;

  if (parser.token & Token.IsAssignPart) {
    if (parser.token !== Token.Assign) {
      throw Error;
    }

    return parseAssignmentElement(parser, context, node);
  }
  return node;
};

const parseObjectLiteral = (parser: IParserState, context: Context) => {
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
  //    PropertyName[?Yield, ?Await] : AssignmentExpression
  //    MethodDefinition[?Yield, ?Await]
  //    ... AssignmentExpression
  // PropertyName[Yield, Await] :
  //    LiteralPropertyName
  //    ComputedPropertyName[?Yield, ?Await]
  // LiteralPropertyName :
  //    IdentifierName
  //    StringLiteral
  //    NumericLiteral
  // ComputedPropertyName[Yield, Await] :
  //    [ AssignmentExpression ]
  // CoverInitializedName[Yield, Await] :
  // https://stackoverflow.com/questions/57583695/what-is-coverinitializednameyield-in-ecma-2015-syntax-grammer
  //    IdentifierReference[?Yield, ?Await] Initializer
  // Initializer[In, Yield, Await] :
  //    = AssignmentExpression[?In, ?Yield, ?Await]
  return parseObjectExpression(parser, context);
};

export const parseAssignmentElement = (
  parser: IParserState,
  context: Context,
  left: ESTree.ArrayExpression | ESTree.ObjectExpression,
): any => {
  const { linePos, colPos } = parser;

  const operator = KeywordTokenTable[parser.token & Token.Mask];
  nextToken(parser, context);

  mapToAssignment(left);
  const right = parseExpression(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'AssignmentExpression',
      left,
      operator,
      right,
    },
    {
      linePos,
      colPos,
    },
  );
};

const parseArrayExpression = (
  parser: IParserState,
  context: Context,
): ESTree.ArrayExpression => {
  const { linePos, colPos } = parser;

  nextToken(parser, context);

  const elements: (
    | ESTree.Identifier
    | ESTree.AssignmentExpression
    | null
  )[] = [];

  while (parser.token !== Token.RightBracket) {
    let node: any;

    if (consumeOpt(parser, context, Token.Comma)) {
      elements.push(null);
      continue;
    } else {
      // TODO: Spread
      if (parser.token === Token.Ellipsis) {
      } else {
        node = parseExpression(parser, context);
      }
    }

    elements.push(node);

    if (consumeOpt(parser, context, Token.Comma)) {
      if (parser.token === Token.RightBracket) break;
    } else break;
  }

  consumeOpt(parser, context, Token.RightBracket);

  const node = wrapNode(
    parser,
    context,
    {
      type: 'ArrayExpression',
      elements,
    },
    {
      linePos,
      colPos,
    },
  ) as ESTree.ArrayExpression;

  if (parser.token & Token.IsAssignPart) {
    if (parser.token !== Token.Assign) {
      throw Error;
    }

    return parseAssignmentElement(parser, context, node);
  }

  return node;
};

const parseArrayLiteral = (parser: IParserState, context: Context) => {
  /**
    ArrayLiteral[Yield, Await] :
      [ Elisionopt ]
      [ ElementList[?Yield, ?Await] ]
      [ ElementList[?Yield, ?Await] , Elisionopt ]

    ElementList[Yield, Await] :
      Elisionopt AssignmentExpression
      Elisionopt SpreadElement[?Yield, ?Await]
      ElementList[?Yield, ?Await] , Elisionopt AssignmentExpression
      ElementList[?Yield, ?Await] , Elisionopt SpreadElement[?Yield, ?Await]

    Elision :
      ,
      Elision ,

    SpreadElement[Yield, Await] :
      ... AssignmentExpression
  */

  return parseArrayExpression(parser, context);
};

export const validateFunctionName = (parser: IParserState): any => {
  const { token } = parser;
  if (token & Token.Keyword) {
    report(
      parser,
      Errors.UnexpectedToken,
      KeywordTokenTable[parser.token & Token.Mask],
    );
  }
};

export const parseBindingElement = (
  parser: IParserState,
  context: Context,
): ESTree.Parameter => {
  const { linePos, colPos } = parser;

  let node;

  if (parser.token & Token.IsPatternStart) {
    node = parseBindingPattern(parser, context);
  } else {
    node = parseBindingIdentifier(parser, context);
    if (parser.token !== Token.Assign) return node;
  }

  if (consumeOpt(parser, context, Token.Assign)) {
    const right = parseExpression(parser, context);

    node = wrapNode(
      parser,
      context,
      {
        type: 'AssignmentPattern',
        left: node,
        right,
      },
      { linePos, colPos },
    );
  }

  return wrapNode(parser, context, node) as ESTree.Parameter;
};

const parseArguments = (parser: IParserState, context: Context) => {
  const args = [];
  consume(parser, context, Token.LeftParen);

  while (parser.token !== Token.RightParen) {
    args.push(parseExpression(parser, context));

    if (consumeOpt(parser, context, Token.Comma)) continue;
    if (parser.token === Token.RightParen) break;
  }

  consume(parser, context, Token.RightParen);

  return args;
};

export const parseFormalParameters = (
  parser: IParserState,
  context: Context,
): ESTree.Parameter[] => {
  // FormalParameters[Yield, Await]:
  //    [empty]
  //    FunctionRestParameter[?Yield, ?Await]
  //    FormalParameterList[?Yield, ?Await]
  //    FormalParameterList[?Yield, ?Await],
  //    FormalParameterList[?Yield, ?Await], FunctionRestParameter[?Yield, ?Await]
  // FormalParameterList[Yield, Await]:
  //    FormalParameter[?Yield, ?Await]
  //    FormalParameterList[?Yield, ?Await], FormalParameter[?Yield, ?Await]
  // FunctionRestParameter[Yield, Await]:
  //    BindingRestElement[?Yield, ?Await]
  // FormalParameter[Yield, Await]:
  //    BindingElement[?Yield, ?Await]
  // BindingElement[Yield, Await]:
  //    SingleNameBinding[?Yield, ?Await]
  //    BindingPattern[?Yield, ?Await]  Initializeropt

  const params: ESTree.Parameter[] = [];

  if (consumeOpt(parser, context, Token.LeftParen)) {
    if (consumeOpt(parser, context, Token.RightParen)) return params;

    while (parser.token !== Token.Comma) {
      params.push(parseBindingElement(parser, context));

      if (!consumeOpt(parser, context, Token.Comma)) break;
      if (parser.token === Token.RightParen) {
        break;
      }
    }

    consumeOpt(parser, context, Token.RightParen);
  }

  return params;
};

export function parseUniqueFormalParameters(
  parser: IParserState,
  context: Context,
): ESTree.Parameter[] {
  // UniqueFormalParameters:
  //    FormalParameters
  const parameters = parseFormalParameters(parser, context);

  // TODO
  // It is a Syntax Error if any element of the BoundNames of FormalParameters also occurs
  // in the LexicallyDeclaredNames of FunctionBody.
  return parameters;
}

export const parseFunctionBody = (
  parser: IParserState,
  context: Context,
): ESTree.FunctionBody => {
  const { linePos, colPos } = parser;

  consumeOpt(parser, context, Token.LeftBrace);

  const body: ESTree.Statement[] = [];

  context = (context | Context.Return) ^ Context.Global;

  while (parser.token !== Token.RightBrace) {
    body.push(parseStatementListItem(parser, context));
  }

  consumeOpt(parser, context, Token.RightBrace);

  return wrapNode(
    parser,
    context,
    {
      type: 'BlockStatement',
      body,
    },
    { linePos, colPos },
  );
};

const parseFunctionExpression = (parser: IParserState, context: Context) => {
  const { linePos, colPos } = parser;

  nextToken(parser, context);

  // TODO Async Function
  const isAsync = false;
  // TODO Generator Function
  const isGenerator = false;

  let id: ESTree.Identifier | null = null;

  if (parser.token & (Token.IsIdentifier | Token.IsKeyword)) {
    validateFunctionName(parser);

    id = parseIdentifier(parser, context);
  }

  context |= Context.NewTarget;

  const params = parseFormalParameters(parser, context);

  const body = parseFunctionBody(parser, context);

  parser.assignable = false;

  return wrapNode(
    parser,
    context,
    {
      type: 'FunctionExpression',
      id,
      params,
      body,
      async: isAsync,
      generator: isGenerator,
    },
    { linePos, colPos },
  );
};

const parseUnaryExpression = (parser: IParserState, context: Context) => {
  const { linePos, colPos } = parser;

  const operator = KeywordTokenTable[
    parser.token & Token.Mask
  ] as ESTree.UnaryOperator;
  nextToken(parser, context);
  const argument = parseLeftHandSideExpression(parser, context);

  // unary expressions on the LHS of **
  if (parser.token === Token.Exponentiate) {
    report(parser, Errors.InvalidExponentiationLHS);
  }

  if ((context & Context.Strict) === Context.Strict) {
    // Normal variables in JavaScript can't be deleted using the delete operator.
    // In strict mode, an attempt to delete a variable will throw an error and is not allowed.
    if (argument.type === 'Identifier') {
      report(parser, Errors.StrictDelete);
    }
  }

  parser.assignable = false;
  return wrapNode(
    parser,
    context,
    {
      type: 'UnaryExpression',
      operator,
      argument,
      prefix: true,
    },
    { linePos, colPos },
  );
};

// AdditiveExpression[Yield, Await]:
//    MultiplicativeExpression[?Yield, ?Await]
//    AdditiveExpression[?Yield, ?Await]+MultiplicativeExpression[?Yield, ?Await]
//    AdditiveExpression[?Yield, ?Await]-MultiplicativeExpression[?Yield, ?Await]
// MultiplicativeExpression[Yield, Await]:
//     ExponentiationExpression[?Yield, ?Await]
//     MultiplicativeExpression[?Yield, ?Await]MultiplicativeOperatorExponentiationExpression[?Yield, ?Await]

// ShiftExpression[Yield, Await]:
//     AdditiveExpression[?Yield, ?Await]
//     ShiftExpression[?Yield, ?Await]<<AdditiveExpression[?Yield, ?Await]
//     ShiftExpression[?Yield, ?Await]>>AdditiveExpression[?Yield, ?Await]
//     ShiftExpression[?Yield, ?Await]>>>AdditiveExpression[?Yield, ?Await]

// RelationalExpression[In, Yield, Await]:
//     ShiftExpression[?Yield, ?Await]
//     RelationalExpression[?In, ?Yield, ?Await]<ShiftExpression[?Yield, ?Await]
//     RelationalExpression[?In, ?Yield, ?Await]>ShiftExpression[?Yield, ?Await]
//     RelationalExpression[?In, ?Yield, ?Await]<=ShiftExpression[?Yield, ?Await]
//     RelationalExpression[?In, ?Yield, ?Await]>=ShiftExpression[?Yield, ?Await]
//     RelationalExpression[?In, ?Yield, ?Await]instanceofShiftExpression[?Yield, ?Await]
//     [+In]RelationalExpressioninShiftExpression[?Yield, ?Await]

// EqualityExpression[In, Yield, Await]:
//     RelationalExpression[?In, ?Yield, ?Await]
//     EqualityExpression[?In, ?Yield, ?Await]==RelationalExpression[?In, ?Yield, ?Await]
//     EqualityExpression[?In, ?Yield, ?Await]!=RelationalExpression[?In, ?Yield, ?Await]
//     EqualityExpression[?In, ?Yield, ?Await]===RelationalExpression[?In, ?Yield, ?Await]
//     EqualityExpression[?In, ?Yield, ?Await]!==RelationalExpression[?In, ?Yield, ?Await]

// BitwiseANDExpression[In, Yield, Await]:
//     EqualityExpression[?In, ?Yield, ?Await]
//     BitwiseANDExpression[?In, ?Yield, ?Await]&EqualityExpression[?In, ?Yield, ?Await]
// BitwiseXORExpression[In, Yield, Await]:
//     BitwiseANDExpression[?In, ?Yield, ?Await]
//     BitwiseXORExpression[?In, ?Yield, ?Await]^BitwiseANDExpression[?In, ?Yield, ?Await]
// BitwiseORExpression[In, Yield, Await]:
//     BitwiseXORExpression[?In, ?Yield, ?Await]
//     BitwiseORExpression[?In, ?Yield, ?Await]|BitwiseXORExpression[?In, ?Yield, ?Await]

// LogicalANDExpression[In, Yield, Await]:
//     BitwiseORExpression[?In, ?Yield, ?Await]
//     LogicalANDExpression[?In, ?Yield, ?Await]&&BitwiseORExpression[?In, ?Yield, ?Await]
// LogicalORExpression[In, Yield, Await]:
//     LogicalANDExpression[?In, ?Yield, ?Await]
//     LogicalORExpression[?In, ?Yield, ?Await]||LogicalANDExpression[?In, ?Yield, ?Await]
// CoalesceExpression[In, Yield, Await]:
//     CoalesceExpressionHead[?In, ?Yield, ?Await]??BitwiseORExpression[?In, ?Yield, ?Await]
//     CoalesceExpressionHead[In, Yield, Await]:
// CoalesceExpression[?In, ?Yield, ?Await]
//     BitwiseORExpression[?In, ?Yield, ?Await]
// ShortCircuitExpression[In, Yield, Await]:
//     LogicalORExpression[?In, ?Yield, ?Await]
//     CoalesceExpression[?In, ?Yield, ?Await]
const parseBinaryExpression = (
  parser: IParserState,
  context: Context,
  left: ESTree.BinaryExpression | ESTree.Expression,
  minPrec: number,
) => {
  const { linePos, colPos } = parser;

  let curToken: Token;
  let prec: number;

  while (parser.token & Token.IsBinaryOp) {
    curToken = parser.token;
    prec = curToken & Token.Precedence; // get current Prec

    // TODO:
    // 1. The exponentiation operator is right-associative in Binary Operater
    // 2. Some of the other boundary conditions

    // Precedence climbing method: https://en.wikipedia.org/wiki/Operator-precedence_parser#Precedence_climbing_method
    // If current precedence of operator less than previous operator, Return leaf node early.
    // And combine the nodes on either side of the high-priority operator to a BinaryExpression.
    if (prec <= minPrec) return left;

    nextToken(parser, context);

    left = wrapNode(
      parser,
      context,
      {
        type:
          (curToken & Token.IsLogical) === Token.IsLogical ||
          (curToken & Token.Nullish) === Token.Nullish
            ? 'LogicalExpression'
            : 'BinaryExpression',
        left,
        right: parseBinaryExpression(
          parser,
          context,
          parseLeftHandSideExpression(parser, context),
          prec,
        ),
        operator: KeywordTokenTable[curToken & Token.Mask],
      },
      { linePos, colPos },
    );

    parser.assignable = false;
  }

  return left;
};

const parsePrefixUpdateExpression = (
  parser: IParserState,
  context: Context,
): ESTree.UpdateExpression => {
  const { linePos, colPos } = parser;

  const operator = KeywordTokenTable[
    parser.token & Token.Mask
  ] as ESTree.UpdateOperator;

  nextToken(parser, context);

  const argument = parseLeftHandSideExpression(parser, context);

  if (!parser.assignable) {
    report(parser, Errors.InvalidLHSPreOp);
  }

  parser.assignable = false;

  return wrapNode(
    parser,
    context,
    {
      type: 'UpdateExpression',
      argument,
      operator,
      prefix: true,
    },
    { linePos, colPos },
  );
};

const parsePostfixUpdateExpression = (
  parser: IParserState,
  context: Context,
  operand: ESTree.Expression,
): ESTree.UpdateExpression => {
  if (parser.lineTerminatorBeforeNextToken) return operand;

  if (!parser.assignable) {
    report(parser, Errors.InvalidLHSPostOp);
  }

  const { linePos, colPos } = parser;

  parser.assignable = false;

  const operator = KeywordTokenTable[
    parser.token & Token.Mask
  ] as ESTree.UpdateOperator;

  nextToken(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'UpdateExpression',
      argument: operand,
      operator,
      prefix: false,
    },
    { linePos, colPos },
  );
};

const parseMetaProperty = (
  parser: IParserState,
  context: Context,
  meta: ESTree.Identifier,
) => {
  const { linePos, colPos } = parser;

  const property = parseIdentifier(parser, context);
  return wrapNode(
    parser,
    context,
    {
      type: 'MetaProperty',
      meta,
      property,
    },
    { linePos, colPos },
  );
};

const parseNewExpression = (parser: IParserState, context: Context) => {
  // NewExpression:
  //    MemberExpression
  //    newNewExpression
  // MetaProperty:
  //    NewTarget
  //    ImportMeta
  // NewTarget:
  //    new.target
  const { linePos, colPos } = parser;

  const meta = parseIdentifier(parser, context);

  // new.target
  if (consumeOpt(parser, context, Token.Period)) {
    if (context & Context.NewTarget && parser.token === Token.Target) {
      parser.assignable = false;
      return parseMetaProperty(parser, context, meta);
    }
    report(parser, Errors.InvalidNewTarget);
  }

  const callee = parseMemberExpression(
    parser,
    context,
    parsePrimaryExpression(parser, context),
  );
  const args =
    parser.token === Token.LeftParen ? parseArguments(parser, context) : [];
  parser.assignable = false;

  return wrapNode(
    parser,
    context,
    {
      type: 'NewExpression',
      callee,
      arguments: args,
    },
    { linePos, colPos },
  );
};

const parseSuperCallOrSuperProperty = (
  parser: IParserState,
  context: Context,
) => {
  const { linePos, colPos } = parser;

  nextToken(parser, context);

  switch (parser.token) {
    case Token.LeftParen: {
      if (!(context & Context.SuperCall)) report(parser, Errors.NoSuperCall);
      parser.assignable = false;
      break;
    }
    case Token.LeftBracket:
    case Token.Period: {
      parser.assignable = true;
      break;
    }
    default:
      report(parser, Errors.UnexpectedToken, 'super');
  }

  return wrapNode(parser, context, { type: 'Super' }, { linePos, colPos });
};

/**
 * https://tc39.es/ecma262/index.html#sec-primary-expression
 *
 * @param {IParserState} parser
 * @returns {(ESTree.Statement | ESTree.Expression)}
 */
const parsePrimaryExpression = (
  parser: IParserState,
  context: Context,
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
    parser.assignable = true;
    return parseIdentifier(parser, context);
  }

  switch (parser.token) {
    case Token.Decrement:
    case Token.Increment:
      return parsePrefixUpdateExpression(parser, context);

    case Token.TypeofKeyword:
    case Token.DeleteKeyword:
    case Token.VoidKeyword:
    case Token.Negate:
    case Token.Complement:
    case Token.Add:
    case Token.Subtract:
      return parseUnaryExpression(parser, context);

    case Token.ThisKeyword:
      return parseThisExpression(parser, context);
    case Token.TrueKeyword:
    case Token.FalseKeyword:
    case Token.NullKeyword:
      return parsePrimitiveLiteral(parser, context);
    case Token.NumericLiteral:
    case Token.StringLiteral: {
      return parseLiteral(parser, context);
    }
    // Array Initializer
    case Token.LeftBracket:
      return parseArrayLiteral(parser, context);
    // Object Initializer
    case Token.LeftBrace: {
      return parseObjectLiteral(parser, context);
    }
    case Token.NewKeyword: {
      return parseNewExpression(parser, context);
    }
    case Token.SuperKeyword:
      return parseSuperCallOrSuperProperty(parser, context);
    // FunctionExpression
    case Token.FunctionKeyword:
      return parseFunctionExpression(parser, context);

    default: {
      report(
        parser,
        Errors.UnexpectedToken,
        KeywordTokenTable[parser.token & Token.Mask],
      );
    }
  }
};

const parseExpressionStatement = (
  parser: IParserState,
  context: Context,
  expression: ESTree.Expression,
): ESTree.ExpressionStatement => {
  const { linePos, colPos } = parser;

  consumeSemicolon(parser, context);
  return wrapNode(
    parser,
    context,
    {
      type: 'ExpressionStatement',
      expression,
    },
    { linePos, colPos },
  );
};

const parseAssignmentExpression = (
  parser: IParserState,
  context: Context,
  left: ESTree.Expression,
  isPattern = false,
): ESTree.AssignmentExpression | ESTree.Expression => {
  const { linePos, colPos } = parser;

  if (parser.token & Token.IsAssignPart) {
    if (!parser.assignable) {
      report(parser, Errors.InvalidLHS);
    }
    parser.assignable = false;
    const operator = KeywordTokenTable[parser.token & Token.Mask];
    nextToken(parser, context);
    const right = parseExpression(parser, context);

    const AssignmentExpression = {
      type: 'AssignmentExpression',
      left,
      operator,
      right,
    };
    const AssignmentPattern = {
      type: 'AssignmentPattern',
      left,
      right,
    };
    return wrapNode(
      parser,
      context,
      isPattern ? AssignmentPattern : AssignmentExpression,
      { linePos, colPos },
    );
  }

  return parseConditionalExpression(parser, context, left);
};

const parseConditionalExpression = (
  parser: IParserState,
  context: Context,
  left: ESTree.Expression,
): ESTree.ConditionalExpression => {
  const { linePos, colPos } = parser;

  const node = parseBinaryExpression(parser, context, left, /* minPrec */ 4);

  if (parser.token !== Token.QuestionMark) return node;

  consume(parser, context, Token.QuestionMark);
  const consequent = parseExpression(parser, context);
  consume(parser, context, Token.Colon);
  const alternate = parseExpression(parser, context);
  parser.assignable = false;

  return wrapNode(
    parser,
    context,
    {
      type: 'ConditionalExpression',
      test: node,
      consequent,
      alternate,
    },
    { linePos, colPos },
  );
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
  context: Context,
  expr: ESTree.Expression,
): ESTree.Expression => {
  const { linePos, colPos } = parser;

  while (parser.token & Token.IsPropertyOrCallExpression) {
    switch (parser.token) {
      /* Update expression */
      // This is not part of the MemberExpression specification, but let's simplify the implementation here
      case Token.Decrement:
      case Token.Increment:
        return parsePostfixUpdateExpression(parser, context, expr);

      /* Property */
      case Token.Period:
        nextToken(parser, context);

        const property = parseIdentifier(parser, context);

        expr = wrapNode(
          parser,
          context,
          {
            type: 'MemberExpression',
            object: expr,
            computed: false,
            property,
          },
          { linePos, colPos },
        );
        break;

      /* Property */
      case Token.LeftBracket: {
        nextToken(parser, context);

        const property = parseExpression(parser, context);

        consume(parser, context, Token.RightBracket);

        parser.assignable = false;

        expr = wrapNode(
          parser,
          context,
          {
            type: 'MemberExpression',
            object: expr,
            computed: true,
            property,
          },
          { linePos, colPos },
        );
        break;
      }

      /* Call */
      case Token.LeftParen: {
        const args = parseArguments(parser, context);

        parser.assignable = false;

        expr = wrapNode(
          parser,
          context,
          {
            type: 'CallExpression',
            callee: expr,
            arguments: args,
          },
          { linePos, colPos },
        );
        break;
      }

      default: {
      }
    }
  }

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
  context: Context,
): ESTree.Expression => {
  let expr: ESTree.LeftHandSideExpression = parsePrimaryExpression(
    parser,
    context,
  );

  expr = parseMemberExpression(parser, context, expr);
  return expr;
};

/**
 * https://tc39.es/ecma262/index.html#sec-ecmascript-language-expressions
 */
const parseExpression = (
  parser: IParserState,
  context: Context,
): ESTree.Expression => {
  const expression: ESTree.Expression = parseLeftHandSideExpression(
    parser,
    context,
  );

  return parseAssignmentExpression(parser, context, expression);
};

export function parseSequenceExpression(
  parser: IParserState,
  context: Context,
): ESTree.SequenceExpression {
  const parseSequenceExpressions = (
    parser: IParserState,
    context: Context,
    expr: ESTree.ExpressionStatement,
  ) => {
    const { linePos, colPos } = parser;

    const expressions: ESTree.ExpressionStatement[] = [expr];
    while (consumeOpt(parser, context, Token.Comma)) {
      expressions.push(parseExpression(parser, context));
    }

    return wrapNode(
      parser,
      context,
      {
        type: 'SequenceExpression',
        expressions,
      },
      {
        linePos,
        colPos,
      },
    );
  };

  const expression = parseExpression(parser, context);
  return parser.token === Token.Comma
    ? parseSequenceExpressions(parser, context, expression)
    : expression;
}

const parseBindingIdentifier = (
  parser: IParserState,
  context: Context,
): ESTree.Identifier => {
  const {
    tokenValue, token, linePos, colPos,
  } = parser;

  // TODO
  // 2. let, const binding
  // 3. await
  // 4. yield

  if ((token & Token.IsKeyword) === Token.IsKeyword) {
    report(parser, Errors.ExpectedBindingIdent);
  }

  if ((token & (Token.IsIdentifier | Token.Keyword)) === 0) {
    report(parser, Errors.ExpectedBindingIdent);
  }

  if (context & Context.Strict && parser.token & Token.IsFutureReserved) {
    report(parser, Errors.UnexpectedStrictReserved);
  }

  nextToken(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'Identifier',
      name: tokenValue,
    },
    {
      linePos,
      colPos,
    },
  );
};

export const parseBindingProperty = (
  parser: IParserState,
  context: Context,
) => {
  // BindingProperty[Yield, Await]:
  //    SingleNameBinding[?Yield, ?Await]
  //    PropertyName[?Yield, ?Await]:BindingElement[?Yield, ?Await]
  // BindingElement[Yield, Await]:
  //    SingleNameBinding[?Yield, ?Await]
  //    BindingPattern[?Yield, ?Await]Initializeropt
  // SingleNameBinding[Yield, Await]:
  //    BindingIdentifier[?Yield, ?Await]Initializeropt
  const { linePos, colPos } = parser;

  let key;
  let value;
  let kind = PropertyKind.None;
  const computed = false;
  let shorthand = false;

  if (parser.token & (Token.IsIdentifier | Token.Keyword)) {
    key = parseIdentifier(parser, context);
    kind |= PropertyKind.Generator;

    // shortHand: `,` `}` `=`
    if (
      parser.token === Token.Comma ||
      parser.token === Token.RightBrace ||
      parser.token === Token.Assign
    ) {
      shorthand = true;
      value = parseAssignmentExpression(parser, context, key, true);
    } else if (consumeOpt(parser, context, Token.Colon)) {
      value = parseBindingElement(parser, context);
    }
  }

  return wrapNode(
    parser,
    context,
    {
      type: 'Property',
      key,
      value,
      kind: PropertyKindMap[kind],
      computed,
      method: false,
      shorthand,
    },
    { linePos, colPos },
  ) as ESTree.Property;
};

export const parseObjectBindingPattern = (
  parser: IParserState,
  context: Context,
) => {
  // ObjectBindingPattern[Yield, Await]:
  //    {}
  //    {BindingRestProperty[?Yield, ?Await]}
  //    {BindingPropertyList[?Yield, ?Await]}
  //    {BindingPropertyList[?Yield, ?Await],BindingRestProperty[?Yield, ?Await]opt}
  const { linePos, colPos } = parser;

  consume(parser, context, Token.LeftBrace);

  const properties: ESTree.Property[] = [];

  while (parser.token !== Token.RightBrace) {
    properties.push(parseBindingProperty(parser, context));

    if (parser.token !== Token.Comma) break;

    nextToken(parser, context);
  }

  consume(parser, context, Token.RightBrace);

  return wrapNode(
    parser,
    context,
    {
      type: 'ObjectPattern',
      properties,
    },
    { linePos, colPos },
  ) as ESTree.ObjectPattern;
};
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const parseArrayBindingPattern = () => {};

const parseBindingPattern = (
  parser: IParserState,
  context: Context,
): ESTree.ArrayPattern | ESTree.ObjectPattern => {
  if (parser.token === Token.LeftBrace) {
    return parseObjectBindingPattern(parser, context);
  }
  return parseArrayBindingPattern() as any;
};

export const parseBindingPatternOrIdentifier = (
  parser: IParserState,
  context: Context,
): ESTree.BindingPattern => {
  // BindingPattern:
  //   ObjectBindingPattern
  //   ArrayBindingPattern
  //
  // BindingIdentifier
  return parser.token & Token.IsPatternStart
    ? parseBindingPattern(parser, context)
    : parseBindingIdentifier(parser, context);
};

const parseVariableDeclaration = (
  parser: IParserState,
  context: Context,
): ESTree.VariableDeclarator => {
  const { linePos, colPos } = parser;

  let init:
    | ESTree.Expression
    | ESTree.BindingPattern
    | ESTree.Identifier
    | null = null;

  const id = parseBindingPatternOrIdentifier(parser, context);

  if (parser.token === Token.Assign) {
    nextToken(parser, context);
    init = parseExpression(parser, context);
  }

  return wrapNode(
    parser,
    context,
    {
      type: 'VariableDeclarator',
      id,
      init,
    },
    { linePos, colPos },
  );
};

const parseVariableDeclarationList = (
  parser: IParserState,
  context: Context,
) => {
  let bindingCount = 1;
  const list: ESTree.VariableDeclarator[] = [
    parseVariableDeclaration(parser, context),
  ];
  while (consumeOpt(parser, context, Token.Comma)) {
    bindingCount++;
    list.push(parseVariableDeclaration(parser, context));
  }

  if (bindingCount) {
  }

  return list;
};

const parseBlockStatement = (
  parser: IParserState,
  context: Context,
): ESTree.BlockStatement => {
  // BlockStatement:
  //    Block
  // Block:
  //    {StatementListopt}

  const { linePos, colPos } = parser;

  const body: ESTree.Statement[] = [];
  consumeOpt(parser, context, Token.LeftBrace);

  while (parser.token !== Token.RightBrace) {
    body.push(parseStatementListItem(parser, context));
  }

  consumeOpt(parser, context, Token.RightBrace);

  return wrapNode(
    parser,
    context,
    {
      type: 'BlockStatement',
      body,
    },
    { linePos, colPos },
  );
};

// https://tc39.es/ecma262/#prod-VariableDeclaration
const parseVariableStatement = (
  parser: IParserState,
  context: Context,
): ESTree.VariableDeclaration => {
  const { linePos, colPos } = parser;

  nextToken(parser, context);

  const declarations = parseVariableDeclarationList(parser, context);

  consumeSemicolon(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'VariableDeclaration',
      kind: 'var',
      declarations,
    },
    { linePos, colPos },
  );
};

export const parseReturnStatement = (
  parser: IParserState,
  context: Context,
): ESTree.ReturnStatement => {
  if (!(context & Context.Return)) {
    report(parser, Errors.IllegalReturn);
  }
  const { linePos, colPos } = parser;

  nextToken(parser, context);

  const noLineTerminatorHere =
    (parser.token & Token.IsAutoSemicolon) === Token.IsAutoSemicolon &&
    parser.lineTerminatorBeforeNextToken;

  const argument = noLineTerminatorHere
    ? null
    : parseExpression(parser, context);

  consumeSemicolon(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'ReturnStatement',
      argument,
    },
    { linePos, colPos },
  );
};

export const parseEmptyStatement = (
  parser: IParserState,
  context: Context,
): ESTree.EmptyStatement => {
  const { linePos, colPos } = parser;

  nextToken(parser, context);
  return wrapNode(
    parser,
    context,
    {
      type: 'EmptyStatement',
    },
    { linePos, colPos },
  );
};

export const parseThrowStatement = (
  parser: IParserState,
  context: Context,
): ESTree.ThrowStatement => {
  const { linePos, colPos } = parser;

  nextToken(parser, context);

  // Can't break the line
  if (parser.lineTerminatorBeforeNextToken) {
    report(parser, Errors.NewlineAfterThrow);
  }

  const argument: ESTree.Expression = parseExpression(parser, context);

  consumeSemicolon(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'ThrowStatement',
      argument,
    },
    { linePos, colPos },
  );
};

const parseDebuggerStatement = (
  parser: IParserState,
  context: Context,
): ESTree.DebuggerStatement => {
  const { linePos, colPos } = parser;

  nextToken(parser, context);
  consumeSemicolon(parser, context);
  return wrapNode(
    parser,
    context,
    {
      type: 'DebuggerStatement',
    },
    { linePos, colPos },
  );
};

const parseConsequentOrAlternative = (
  parser: IParserState,
  context: Context,
): ESTree.Statement => {
  // B.3.4 FunctionDeclarations in IfStatement Statement Clauses
  // This production only applies when parsing non-strict code
  // https://tc39.es/ecma262/#sec-functiondeclarations-in-ifstatement-statement-clauses

  const isParseStatment =
    context & (Context.OptionsDisableWebCompat | Context.Strict) ||
    parser.token !== Token.FunctionKeyword;

  return isParseStatment
    ? parseStatement(parser, context)
    : parseFunctionDeclaration(parser, context);
};

const parseIfStatement = (
  parser: IParserState,
  context: Context,
): ESTree.IfStatement => {
  // if (Expression) Statement else Statement;
  // if (Expression) Statement;
  const { linePos, colPos } = parser;

  nextToken(parser, context);

  consume(parser, context, Token.LeftParen);

  const expression = parseExpression(parser, context);

  consume(parser, context, Token.RightParen);

  const consequent = parseConsequentOrAlternative(parser, context);

  const alternate = consumeOpt(parser, context, Token.ElseKeyword)
    ? parseConsequentOrAlternative(parser, context)
    : null;

  return wrapNode(
    parser,
    context,
    {
      type: 'IfStatement',
      test: expression,
      consequent,
      alternate,
    },
    { linePos, colPos },
  );
};

const parseForStatement = (
  parser: IParserState,
  context: Context,
): ESTree.ForStatement | ESTree.ForInStatement | ESTree.ForOfStatement => {
  const { linePos, colPos } = parser;

  consume(parser, context, Token.ForKeyword);

  consume(parser, context, Token.LeftParen);

  let init: ESTree.Expression | null | any = null;
  let test: ESTree.Expression | null = null;
  let update: ESTree.Expression | null = null;

  if (parser.token !== Token.Semicolon) {
    if (
      parser.token === Token.VarKeyword ||
      parser.token === Token.LetKeyword ||
      parser.token === Token.ConstKeyword
    ) {
      // TODO: Let / Const

      if (parser.token === Token.VarKeyword) {
        const { linePos, colPos } = parser;

        nextToken(parser, context);

        init = wrapNode(
          parser,
          context,
          {
            type: 'VariableDeclaration',
            kind: 'var',
            declarations: parseVariableDeclarationList(parser, context),
          },
          { linePos, colPos },
        );

        parser.assignable = true;
      }
    } else if (parser.token & Token.IsPatternStart) {
      init = (parser.token === Token.LeftBrace
        ? parseObjectLiteral
        : parseArrayLiteral)(parser, context);

      init = parseMemberExpression(parser, context, init);
    } else {
      // Pass the 'Context.DisallowIn' bit so that 'in' isn't parsed in a 'BinaryExpression' as a
      // binary operator. 'in' makes it a for-in loop, 'not' an 'in' expression
      init = parseLeftHandSideExpression(parser, context);
    }
  }

  if (consumeOpt(parser, context, Token.InKeyword)) {
    if (!parser.assignable) {
      report(parser, Errors.CantAssignToForLoop, 'in');
    }

    mapToAssignment(init);

    const right = parseExpression(parser, context);
    consume(parser, context, Token.RightParen);

    return wrapNode(
      parser,
      context,
      {
        type: 'ForInStatement',
        left: init,
        right,
        body: parseStatement(parser, context | Context.InIteration),
      },
      { linePos, colPos },
    );
  }

  if (consumeOpt(parser, context, Token.OfKeyword)) {
    if (!parser.assignable) {
      report(parser, Errors.CantAssignToForLoop, 'of');
    }

    mapToAssignment(init);

    const right = parseExpression(parser, context);
    consume(parser, context, Token.RightParen);

    return wrapNode(
      parser,
      context,
      {
        type: 'ForOfStatement',
        left: init,
        right,
        body: parseStatement(parser, context | Context.InIteration),
        await: false,
      },
      { linePos, colPos },
    );
  }

  init = parseHigherExpression(parser, context, init);

  consume(parser, context, Token.Semicolon);

  // test
  if (parser.token !== Token.Semicolon) {
    test = parseSequenceExpression(parser, context);
  }

  consume(parser, context, Token.Semicolon);

  // update
  if (parser.token !== Token.RightParen) {
    update = parseSequenceExpression(parser, context);
  }

  consume(parser, context, Token.RightParen);

  return wrapNode(
    parser,
    context,
    {
      type: 'ForStatement',
      init,
      test,
      update,
      body: parseStatement(parser, context | Context.InIteration),
    },
    { linePos, colPos },
  );
};

const parseWhileStatement = (
  parser: IParserState,
  context: Context,
): ESTree.WhileStatement => {
  const { linePos, colPos } = parser;

  consume(parser, context, Token.WhileKeyword);
  consume(parser, context, Token.LeftParen);

  const test = parseSequenceExpression(parser, context);
  consume(parser, context, Token.RightParen);
  const body = parseStatement(parser, context | Context.InIteration);

  return wrapNode(
    parser,
    context,
    {
      type: 'WhileStatement',
      test,
      body,
    },
    { linePos, colPos },
  );
};

const parseDoWhileStatement = (
  parser: IParserState,
  context: Context,
): ESTree.DoWhileStatement => {
  const { linePos, colPos } = parser;

  consume(parser, context, Token.DoKeyword);
  const body = parseStatement(parser, context | Context.InIteration);
  consume(parser, context, Token.WhileKeyword);
  consume(parser, context, Token.LeftParen);
  const test = parseSequenceExpression(parser, context);
  consume(parser, context, Token.RightParen);
  consumeOpt(parser, context, Token.Semicolon);

  return wrapNode(
    parser,
    context,
    {
      type: 'DoWhileStatement',
      test,
      body,
    },
    { linePos, colPos },
  );
};

const parseClause = (
  parser: IParserState,
  context: Context,
  hasDefaultKey: {
    value: boolean;
  },
): ESTree.SwitchCase => {
  const { linePos, colPos } = parser;

  let test: ESTree.Expression | null = null;
  const consequent: ESTree.Statement[] = [];
  if (consumeOpt(parser, context, Token.CaseKeyword)) {
    test = parseSequenceExpression(parser, context);
  } else {
    consume(parser, context, Token.DefaultKeyword);
    if (hasDefaultKey.value) {
      report(parser, Errors.MultipleDefaultsInSwitch);
    }
    hasDefaultKey.value = true;
  }

  consume(parser, context, Token.Colon);

  while (
    parser.token !== Token.RightBrace &&
    parser.token !== Token.CaseKeyword &&
    parser.token !== Token.DefaultKeyword
  ) {
    consequent.push(parseStatementListItem(parser, context));
  }

  return wrapNode(
    parser,
    context,
    {
      type: 'SwitchCase',
      test,
      consequent,
    },
    { linePos, colPos },
  );
};

const parseCaseBlock = (
  parser: IParserState,
  context: Context,
): ESTree.SwitchCase[] => {
  const clause = [];
  const hasDefaultKey = { value: false };

  while (parser.token !== Token.RightBrace) {
    clause.push(parseClause(parser, context, hasDefaultKey));
  }

  return clause;
};

const parseSwitchStatement = (
  parser: IParserState,
  context: Context,
): ESTree.SwitchStatement => {
  // SwitchStatement:
  //    switch ( Expression ) CaseBlock
  // CaseBlock:
  //    { CaseClausesopt? }
  //    { CaseClausesopt? DefaultClause CaseClausesopt? }
  // CaseClauses:
  //    CaseClause
  //    CaseClauses CaseClause
  // CaseClause:
  //    case Expression : StatementList?
  // DefaultClause:
  //    default : StatementList?
  const { linePos, colPos } = parser;

  consume(parser, context, Token.SwitchKeyword);
  consume(parser, context, Token.LeftParen);
  const discriminant = parseSequenceExpression(parser, context);
  consume(parser, context, Token.RightParen);
  consume(parser, context, Token.LeftBrace);

  const cases = parseCaseBlock(parser, context);
  consume(parser, context, Token.RightBrace);

  return wrapNode(
    parser,
    context,
    {
      type: 'SwitchStatement',
      discriminant,
      cases,
    },
    { linePos, colPos },
  );
};

const parseContinueStatement = (
  parser: IParserState,
  context: Context,
): ESTree.ContinueStatement => {
  if (!(context & Context.InIteration)) report(parser, Errors.IllegalContinue);

  const { linePos, colPos } = parser;

  consume(parser, context, Token.ContinueKeyword);

  const label: ESTree.Identifier | null = null;

  // TODO: Label
  if (
    !parser.lineTerminatorBeforeNextToken &&
    parser.token & Token.IsIdentifier
  ) {
  }

  consumeSemicolon(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'ContinueStatement',
      label,
    },
    { linePos, colPos },
  );
};

const parseBreakStatement = (
  parser: IParserState,
  context: Context,
): ESTree.BreakStatement => {
  const { linePos, colPos } = parser;

  consume(parser, context, Token.BreakKeyword);

  const label: ESTree.Identifier | null = null;

  // TODO: Label
  if (
    !parser.lineTerminatorBeforeNextToken &&
    parser.token & Token.IsIdentifier
  ) {
  }

  consumeSemicolon(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'BreakStatement',
      label,
    },
    { linePos, colPos },
  );
};

const parseWithStatement = (
  parser: IParserState,
  context: Context,
): ESTree.WithStatement => {
  if (context & Context.Strict) {
    report(parser, Errors.StrictWith);
  }

  const { linePos, colPos } = parser;

  consume(parser, context, Token.WithKeyword);
  consume(parser, context, Token.LeftParen);
  const object = parseSequenceExpression(parser, context);
  consume(parser, context, Token.RightParen);

  const body = parseStatement(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'WithStatement',
      object,
      body,
    },
    { linePos, colPos },
  );
};

const parseCatchClause = (
  parser: IParserState,
  context: Context,
): ESTree.CatchClause => {
  const { linePos, colPos } = parser;

  let param: ESTree.Pattern | null = null;

  if (consumeOpt(parser, context, Token.LeftParen)) {
    param = parseBindingPatternOrIdentifier(parser, context);
    consume(parser, context, Token.RightParen);
  }

  const body = parseBlockStatement(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'CatchClause',
      param,
      body,
    },
    { linePos, colPos },
  );
};

const parseTryStatement = (
  parser: IParserState,
  context: Context,
): ESTree.TryStatement => {
  const { linePos, colPos } = parser;

  consume(parser, context, Token.TryKeyword);

  const block = parseBlockStatement(parser, context);
  const handler = consumeOpt(parser, context, Token.CatchKeyword)
    ? parseCatchClause(parser, context)
    : null;
  const finalizer = consumeOpt(parser, context, Token.FinallyKeyword)
    ? parseBlockStatement(parser, context)
    : null;

  return wrapNode(
    parser,
    context,
    {
      type: 'TryStatement',
      block,
      handler,
      finalizer,
    },
    { linePos, colPos },
  );
};

const parseHigherExpression = (
  parser: IParserState,
  context: Context,
  expression: ESTree.Expression,
): ESTree.Expression => {
  // `.foo`, `.[foo]`
  expression = parseMemberExpression(parser, context, expression);

  // `foo = bar`, `foo[foo] = bar`
  expression = parseAssignmentExpression(parser, context, expression);

  return expression;
};

const parseExpressionStatements = (parser: IParserState, context: Context) => {
  let expr: ESTree.Expression = parsePrimaryExpression(parser, context);

  expr = parseHigherExpression(parser, context, expr);

  return parseExpressionStatement(parser, context, expr);
};

/**
 * https://tc39.es/ecma262/#sec-ecmascript-language-statements-and-declarations
 * */
const parseStatement = (
  parser: IParserState,
  context: Context,
): ESTree.Statement => {
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
      return parseBlockStatement(parser, context);
    }
    case Token.VarKeyword: {
      return parseVariableStatement(parser, context);
    }
    case Token.ReturnKeyword: {
      return parseReturnStatement(parser, context);
    }
    case Token.DebuggerKeyword: {
      return parseDebuggerStatement(parser, context);
    }
    // Empty
    case Token.Semicolon: {
      return parseEmptyStatement(parser, context);
    }
    case Token.ThrowKeyword: {
      return parseThrowStatement(parser, context);
    }
    case Token.IfKeyword: {
      return parseIfStatement(parser, context);
    }
    case Token.ForKeyword: {
      return parseForStatement(parser, context);
    }
    case Token.WhileKeyword:
      return parseWhileStatement(parser, context);

    case Token.DoKeyword:
      return parseDoWhileStatement(parser, context);

    case Token.SwitchKeyword: {
      return parseSwitchStatement(parser, context);
    }

    case Token.ContinueKeyword: {
      return parseContinueStatement(parser, context);
    }

    case Token.BreakKeyword: {
      return parseBreakStatement(parser, context);
    }

    case Token.WithKeyword: {
      return parseWithStatement(parser, context);
    }

    case Token.TryKeyword:
      return parseTryStatement(parser, context);

    case Token.FunctionKeyword: {
      const specificError =
        context & Context.Strict
          ? Errors.StrictFunction
          : context & Context.OptionsDisableWebCompat
            ? Errors.WebCompatFunction
            : Errors.SloppyFunction;

      report(parser, specificError);
      return parseFunctionDeclaration(parser, context);
    }
    case Token.ClassKeyword: {
      report(parser, Errors.ClassForbiddenAsStatement);
      return parseClassDeclaration(parser, context);
    }

    default: {
      return parseExpressionStatements(parser, context);
    }
  }
};

// FunctionDeclaration
//    functionBindingIdentifier ( FormalParameters ){ FunctionBody }
//    [+Default] function ( FormalParameters ) { FunctionBody }
const parseFunctionDeclaration = (
  parser: IParserState,
  context: Context,
): ESTree.FunctionDeclaration => {
  const { linePos, colPos } = parser;

  nextToken(parser, context);

  // TODO Async Function
  const isAsync = false;
  // TODO Generator Function
  const isGenerator = false;

  let id: ESTree.Identifier | null = null;

  if (parser.token & (Token.IsIdentifier | Token.IsKeyword)) {
    validateFunctionName(parser);

    id = parseIdentifier(parser, context);
  } else {
    report(parser, Errors.MissingFunctionName);
  }

  context |= Context.NewTarget;

  const params = parseFormalParameters(parser, context);

  const body = parseFunctionBody(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'FunctionDeclaration',
      id,
      params,
      body,
      async: isAsync,
      generator: isGenerator,
    },
    { linePos, colPos },
  );
};

// MethodDefinition:
//    PropertyName ( UniqueFormalParameters ) { FunctionBody }
//    GeneratorMethod
//    AsyncMethod
//    AsyncGeneratorMethod
//    getPropertyName () { FunctionBody }
//    setPropertyName ( PropertySetParameterList ) { FunctionBody }
// PropertySetParameterList:
//     FormalParameter
const parseMethodDefinition = (
  parser: IParserState,
  context: Context,
): ESTree.FunctionExpression => {
  const { linePos, colPos } = parser;

  const params = parseUniqueFormalParameters(parser, context);
  const body = parseFunctionBody(parser, context);

  return wrapNode(
    parser,
    context,
    {
      type: 'FunctionExpression',
      params,
      body,
      async: false, // TODO
      generator: false,
      id: null,
    },
    { linePos, colPos },
  );
};

const parseClassElement = (
  parser: IParserState,
  context: Context,
): ESTree.MethodDefinition => {
  const { linePos, colPos } = parser;

  let kind = 'method';
  let computed = false;
  let key: ESTree.Expression | null = null;

  if (parser.token & (Token.IsIdentifier | Token.IsKeyword)) {
    key = parseIdentifier(parser, context);
  } else if (parser.token === Token.LeftBracket) {
    computed = true;
    key = parseComputedPropertyName(parser, context);
  }

  const value = parseMethodDefinition(parser, context);

  if (parser.tokenValue === 'constructor') {
    kind = 'constructor';
  }

  return wrapNode(
    parser,
    context,
    {
      type: 'MethodDefinition',
      kind,
      static: false,
      computed,
      key,
      value,
    },
    { linePos, colPos },
  ) as ESTree.MethodDefinition;
};

const parseClassBody = (
  parser: IParserState,
  context: Context,
): ESTree.ClassBody => {
  const { linePos, colPos } = parser;

  const classElementList: ESTree.MethodDefinition[] = [];

  if (consumeOpt(parser, context, Token.LeftBrace)) {
    while (parser.token !== Token.RightBrace) {
      if (parser.token === Token.RightBrace) break;
      classElementList.push(parseClassElement(parser, context));
      consumeOpt(parser, context, Token.Comma);
    }
    consume(parser, context, Token.RightBrace);
  }

  return wrapNode(
    parser,
    context,
    {
      type: 'ClassBody',
      body: classElementList,
    },
    {
      linePos,
      colPos,
    },
  );
};

// https://tc39.es/ecma262/#prod-ClassDeclaration
// ClassDeclaration:
//   class BindingIdentifier ClassTail
//   [+Default] `class` ClassTail
//
// ClassTail: ClassHeritage(opt) { ClassBody(opt) }
// ClassHeritage: extends LeftHandSideExpression
// ClassBody: ClassElementList
const parseClassDeclaration = (
  parser: IParserState,
  context: Context,
): ESTree.ClassDeclaration => {
  const { linePos, colPos } = parser;

  consume(parser, context, Token.ClassKeyword);

  let id: ESTree.Expression | null = null;
  let superClass: ESTree.Expression | null = null;

  context |= Context.Strict;

  if (parser.token & Token.IsIdentifier) {
    id = parseBindingIdentifier(parser, context);
    // eslint-disable-next-line no-constant-condition
  } else if (true) {
    // TODO: context: Export Default
    report(parser, Errors.MissingClassName);
  }

  if (consumeOpt(parser, context, Token.ExtendsKeyword)) {
    superClass = parseLeftHandSideExpression(parser, context);
    context |= Context.SuperCall;
  } else {
    // reset
    context = (context | Context.SuperCall) ^ Context.SuperCall;
  }

  const body = parseClassBody(parser, context);

  parser.assignable = false;

  return wrapNode(
    parser,
    context,
    {
      type: 'ClassDeclaration',
      id,
      superClass,
      body,
    },
    {
      linePos,
      colPos,
    },
  );
};

const parseStatementListItem = (
  parser: IParserState,
  context: Context,
): ESTree.Statement => {
  // StatementListItem:
  //    Statement
  //    Declaration

  switch (parser.token) {
    // Declaration
    case Token.FunctionKeyword:
    case Token.AsyncKeyword:
      return parseFunctionDeclaration(parser, context);
    case Token.ClassKeyword:
      return parseClassDeclaration(parser, context);

    // Statement
    default: {
      return parseStatement(parser, context);
    }
  }
};

const parseStatementList = (parser: IParserState, context: Context) => {
  // Initialize token
  nextToken(parser, context);

  const statements: ESTree.Statement[] = [];

  // Get the machine moving!
  while (parser.token !== Token.EOF) {
    statements.push(parseStatementListItem(parser, context));
  }
  return statements;
};

const parserMachine = (
  source: string,
  context: Context,
  options?: Options,
): ESTree.Program => {
  if (options != null) {
    // Add to Context
    if (options.loc) context |= Context.OptionsLoc;
    if (options.impliedStrict) context |= Context.Strict;
    if (options.disableWebCompat) context |= Context.OptionsDisableWebCompat;
  }

  // Initialize parser state
  const parserState: IParserState = createParserState(source);
  const sourceType: ESTree.SourceType = 'script';

  let body: any[] = [];

  body = parseStatementList(parserState, context);

  const nodeTree: ESTree.Program = {
    type: 'Program',
    sourceType,
    body,
  };

  if (context & Context.OptionsLoc) {
    nodeTree.loc = {
      start: { line: 1, column: 0 },
      end: { line: parserState.line, column: parserState.column },
    };
  }

  return nodeTree;
};

export default parserMachine;

/**

`const name = NanYang`

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
         'name'            'NanYang'

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
