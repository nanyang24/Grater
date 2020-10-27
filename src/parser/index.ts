import createParserState from './createParserState';
import { Token } from '../tokenizer/token';
import { nextToken } from '../tokenizer/scanner';
import { KeywordTokenTable } from '../tokenizer/utils';
import {
  consumeSemicolon,
  consumeOpt,
  mapToAssignment,
  consume,
} from './utils';

// typings
import * as ESTree from '../es-tree';
import {
  IParserState, PropertyKind, Context, PropertyKindMap,
} from './type';

const wrapNode = <T extends any>(
  parser: IParserState,
  context: Context,
  node: T,
): T => {
  return node;
};

const parseThisExpression = (parser: IParserState, context: Context) => {
  nextToken(parser);
  parser.assignable = false;
  return wrapNode(parser, context, {
    type: 'ThisExpression',
  });
};

const parsePrimitiveLiteral = (parser: IParserState, context: Context) => {
  const { tokenValue } = parser;

  // Maybe a little mental burden
  const value = JSON.parse(tokenValue);

  nextToken(parser);
  parser.assignable = false;
  return wrapNode(parser, context, {
    type: 'Literal',
    value,
  });
};

const parseLiteral = (
  parser: IParserState,
  context: Context,
): ESTree.Literal => {
  const { tokenValue } = parser;

  nextToken(parser);

  parser.assignable = false;

  return wrapNode(parser, context, {
    type: 'Literal',
    value: tokenValue,
  });
};

const parseIdentifier = (
  parser: IParserState,
  context: Context,
): ESTree.Identifier => {
  const { tokenValue } = parser;

  nextToken(parser);

  return wrapNode(parser, context, {
    type: 'Identifier',
    name: tokenValue,
  });
};

export function parseComputedPropertyName(
  parser: IParserState,
  context: Context,
): ESTree.Expression {
  // ComputedPropertyName :
  //   [ AssignmentExpression ]
  nextToken(parser);
  const key = parseExpression(parser, context);
  consumeOpt(parser, Token.RightBracket);
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
    } else if (consumeOpt(parser, Token.Colon)) {
      value = parsePrimaryExpression(parser, context);
    }
  } else if (parser.token === Token.LeftBracket) {
    key = parseComputedPropertyName(parser, context);
    kind |= PropertyKind.Generator;
    computed = true;
    if (consumeOpt(parser, Token.Colon)) {
      value = parsePrimaryExpression(parser, context);
    }
  } else if (parser.token & Token.IsStringOrNumber) {
    key = parseLiteral(parser, context);
    if (consumeOpt(parser, Token.Colon)) {
      value = parsePrimaryExpression(parser, context);
    } else {
      throw Error;
    }
  } else {
    throw Error;
  }

  return wrapNode(parser, context, {
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
  context: Context,
): ESTree.ObjectExpression => {
  nextToken(parser);

  const properties: ESTree.Property[] = [];

  while (parser.token !== Token.RightBrace) {
    properties.push(parsePropertyDefinition(parser, context));

    if (parser.token !== Token.Comma) break;

    nextToken(parser);
  }

  consumeOpt(parser, Token.RightBrace);

  const node = wrapNode(parser, context, {
    type: 'ObjectExpression',
    properties,
  }) as ESTree.ObjectExpression;

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
  return parseObjectExpression(parser, context);
};

export const parseAssignmentElement = (
  parser: IParserState,
  context: Context,
  left: ESTree.ArrayExpression | ESTree.ObjectExpression,
): any => {
  const operator = KeywordTokenTable[parser.token & Token.Musk];
  nextToken(parser);

  mapToAssignment(left);
  const right = parseExpression(parser, context);

  return wrapNode(parser, context, {
    type: 'AssignmentExpression',
    left,
    operator,
    right,
  });
};

const parseArrayExpression = (
  parser: IParserState,
  context: Context,
): ESTree.ArrayExpression => {
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
        node = parseExpression(parser, context);
      }
    }

    elements.push(node);

    if (consumeOpt(parser, Token.Comma)) {
      if (parser.token === Token.RightBracket) break;
    } else break;
  }

  consumeOpt(parser, Token.RightBracket);

  const node = wrapNode(parser, context, {
    type: 'ArrayExpression',
    elements,
  }) as ESTree.ArrayExpression;

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

  return parseArrayExpression(parser, context);
};

export const validateFunctionName = (parser: IParserState): any => {
  const { token } = parser;
  if ((token & Token.Keyword) === Token.Keyword) {
    throw Error;
  }
};

export const parseBindingElement = (
  parser: IParserState,
  context: Context,
): ESTree.Parameter => {
  let node;

  if (parser.token & Token.IsPatternStart) {
    node = parseBindingPattern(parser, context);
  } else {
    node = parseBindingIdentifier(parser, context);
    if (parser.token !== Token.Assign) return node;
  }

  if (consumeOpt(parser, Token.Assign)) {
    const right = parseExpression(parser, context);

    node = wrapNode(parser, context, {
      type: 'AssignmentPattern',
      left: node,
      right,
    });
  }

  return wrapNode(parser, context, node) as ESTree.Parameter;
};

const parseArguments = (parser: IParserState, context: Context) => {
  const args = [];
  consume(parser, Token.LeftParen);

  while (parser.token !== Token.RightParen) {
    args.push(parseExpression(parser, context));

    if (consumeOpt(parser, Token.Comma)) continue;
    if (parser.token === Token.RightParen) break;
  }

  consume(parser, Token.RightParen);

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
  //    BindingPattern[?Yield, ?Await]  Initializer[+In, ?Yield, ?Await]opt

  const params: ESTree.Parameter[] = [];

  if (consumeOpt(parser, Token.LeftParen)) {
    if (consumeOpt(parser, Token.RightParen)) return params;

    while (parser.token !== Token.Comma) {
      params.push(parseBindingElement(parser, context));

      if (!consumeOpt(parser, Token.Comma)) break;
      if (parser.token === Token.RightParen) {
        break;
      }
    }

    consumeOpt(parser, Token.RightParen);
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
  consumeOpt(parser, Token.LeftBrace);

  const body: ESTree.Statement[] = [];

  while (parser.token !== Token.RightBrace) {
    body.push(parseStatementListItem(parser, context));
  }

  consumeOpt(parser, Token.RightBrace);

  return wrapNode(parser, context, {
    type: 'BlockStatement',
    body,
  });
};

const parseFunctionExpression = (parser: IParserState, context: Context) => {
  nextToken(parser);

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

  return wrapNode(parser, context, {
    type: 'FunctionExpression',
    id,
    params,
    body,
    async: isAsync,
    generator: isGenerator,
  });
};

const parseUnaryExpression = (parser: IParserState, context: Context) => {
  const operator = KeywordTokenTable[
    parser.token & Token.Musk
  ] as ESTree.UnaryOperator;
  nextToken(parser);
  const argument = parseLeftHandSideExpression(parser, context);

  parser.assignable = false;
  return wrapNode(parser, context, {
    type: 'UnaryExpression',
    operator,
    argument,
    prefix: true,
  });
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
//     [+In]RelationalExpression[+In, ?Yield, ?Await]inShiftExpression[?Yield, ?Await]

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

    nextToken(parser);

    left = wrapNode(parser, context, {
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
      operator: KeywordTokenTable[curToken & Token.Musk],
    });

    parser.assignable = false;
  }

  return left;
};

const parsePrefixUpdateExpression = (
  parser: IParserState,
  context: Context,
): ESTree.UpdateExpression => {
  const operator = KeywordTokenTable[
    parser.token & Token.Musk
  ] as ESTree.UpdateOperator;

  nextToken(parser);

  const argument = parseLeftHandSideExpression(parser, context);

  if (!parser.assignable) {
    throw Error('lhs');
  }

  parser.assignable = false;

  return wrapNode(parser, context, {
    type: 'UpdateExpression',
    argument,
    operator,
    prefix: true,
  });
};

const parseSuffixUpdateExpression = (
  parser: IParserState,
  context: Context,
  operand: ESTree.Expression,
): ESTree.UpdateExpression => {
  if (parser.lineTerminatorBeforeNextToken) return operand;

  if (!parser.assignable) {
    throw Error('lhs');
  }

  parser.assignable = false;

  const operator = KeywordTokenTable[
    parser.token & Token.Musk
  ] as ESTree.UpdateOperator;

  nextToken(parser);

  return wrapNode(parser, context, {
    type: 'UpdateExpression',
    argument: operand,
    operator,
    prefix: false,
  });
};

const parseMetaProperty = (
  parser: IParserState,
  context: Context,
  meta: ESTree.Identifier,
) => {
  const property = parseIdentifier(parser, context);
  return wrapNode(parser, context, {
    type: 'MetaProperty',
    meta,
    property,
  });
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

  const meta = parseIdentifier(parser, context);

  // new.target
  if (consumeOpt(parser, Token.Period)) {
    if (context & Context.NewTarget && parser.token === Token.Target) {
      parser.assignable = false;
      return parseMetaProperty(parser, context, meta);
    }
    throw 'Invalid New Target';
  }

  const callee = parseMemberExpression(
    parser,
    context,
    parsePrimaryExpression(parser, context),
  );
  const args =
    parser.token === Token.LeftParen ? parseArguments(parser, context) : [];
  parser.assignable = false;

  return wrapNode(parser, context, {
    type: 'NewExpression',
    callee,
    arguments: args,
  });
};

const parseSuperCallOrSuperProperty = (
  parser: IParserState,
  context: Context,
) => {
  nextToken(parser);

  switch (parser.token) {
    case Token.LeftParen: {
      if (!(context & Context.SuperCall)) throw 'no superclass';
      parser.assignable = false;
      break;
    }
    case Token.LeftBracket:
    case Token.Period: {
      parser.assignable = true;
      break;
    }
    default:
  }

  return wrapNode(parser, context, { type: 'Super' });
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
      throw KeywordTokenTable[parser.token & Token.Musk];
    }
  }
};

const parseExpressionStatement = (
  parser: IParserState,
  context: Context,
  expression: ESTree.Expression,
): ESTree.ExpressionStatement => {
  consumeSemicolon(parser);
  return wrapNode(parser, context, {
    type: 'ExpressionStatement',
    expression,
  });
};

const parseAssignmentExpression = (
  parser: IParserState,
  context: Context,
  left: ESTree.Expression,
  isPattern = false,
): ESTree.AssignmentExpression | ESTree.Expression => {
  if (parser.token & Token.IsAssignPart) {
    if (!parser.assignable) {
      throw Error('lhs');
    }
    parser.assignable = false;
    const operator = KeywordTokenTable[parser.token & Token.Musk];
    nextToken(parser);
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
    );
  }

  return parseConditionalExpression(parser, context, left);
};

const parseConditionalExpression = (
  parser: IParserState,
  context: Context,
  left: ESTree.Expression,
) => {
  const node = parseBinaryExpression(parser, context, left, /* minPrec */ 4);

  if (parser.token !== Token.QuestionMark) return node;

  // TODO

  return left;
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
  while (parser.token & Token.IsPropertyOrCallExpression) {
    switch (parser.token) {
      /* Update expression */
      // This is not part of the MemberExpression specification, but let's simplify the implementation here
      case Token.Decrement:
      case Token.Increment:
        return parseSuffixUpdateExpression(parser, context, expr);

      /* Property */
      case Token.Period:
        nextToken(parser);

        const property = parseIdentifier(parser, context);

        expr = wrapNode(parser, context, {
          type: 'MemberExpression',
          object: expr,
          computed: false,
          property,
        });
        break;

      /* Property */
      case Token.LeftBracket: {
        nextToken(parser);

        const property = parseExpression(parser, context);

        consume(parser, Token.RightBracket);

        parser.assignable = false;

        expr = wrapNode(parser, context, {
          type: 'MemberExpression',
          object: expr,
          computed: true,
          property,
        });
        break;
      }

      /* Call */
      case Token.LeftParen: {
        const args = parseArguments(parser, context);

        parser.assignable = false;

        expr = wrapNode(parser, context, {
          type: 'CallExpression',
          callee: expr,
          arguments: args,
        });
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
): ESTree.ExpressionStatement => {
  const expression: ESTree.Expression = parseLeftHandSideExpression(
    parser,
    context,
  );

  return parseAssignmentExpression(parser, context, expression);
};

const parseBindingIdentifier = (
  parser: IParserState,
  context: Context,
): ESTree.Identifier => {
  const { tokenValue, token } = parser;

  // TODO
  // 1. Strict Mode behavior
  // 2. let, const binding
  // 3. await
  // 4. yield

  if ((token & Token.IsKeyword) === Token.IsKeyword) {
    throw Error();
  }

  if ((token & (Token.IsIdentifier | Token.Keyword)) === 0) {
    throw Error();
  }

  nextToken(parser);

  return wrapNode(parser, context, {
    type: 'Identifier',
    name: tokenValue,
  });
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
  //    BindingPattern[?Yield, ?Await]Initializer[+In, ?Yield, ?Await]opt
  // SingleNameBinding[Yield, Await]:
  //    BindingIdentifier[?Yield, ?Await]Initializer[+In, ?Yield, ?Await]opt

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
    } else if (consumeOpt(parser, Token.Colon)) {
      value = parseBindingElement(parser, context);
    }
  }

  return wrapNode(parser, context, {
    type: 'Property',
    key,
    value,
    kind: PropertyKindMap[kind],
    computed,
    method: false,
    shorthand,
  }) as ESTree.Property;
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

  consume(parser, Token.LeftBrace);

  const properties: ESTree.Property[] = [];

  while (parser.token !== Token.RightBrace) {
    properties.push(parseBindingProperty(parser, context));

    if (parser.token !== Token.Comma) break;

    nextToken(parser);
  }

  consume(parser, Token.RightBrace);

  return wrapNode(parser, context, {
    type: 'ObjectPattern',
    properties,
  }) as ESTree.ObjectPattern;
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
  let init:
    | ESTree.Expression
    | ESTree.BindingPattern
    | ESTree.Identifier
    | null = null;

  const id = parseBindingPatternOrIdentifier(parser, context);

  if (parser.token === Token.Assign) {
    nextToken(parser);
    init = parseExpression(parser, context);
  }

  return wrapNode(parser, context, {
    type: 'VariableDeclarator',
    id,
    init,
  });
};

const parseVariableDeclarationList = (
  parser: IParserState,
  context: Context,
) => {
  let bindingCount = 1;
  const list: ESTree.VariableDeclarator[] = [
    parseVariableDeclaration(parser, context),
  ];
  while (consumeOpt(parser, Token.Comma)) {
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
  // BlockStatement[Yield, Await, Return]:
  //    Block[?Yield, ?Await, ?Return]
  // Block[Yield, Await, Return]:
  //    {StatementList[?Yield, ?Await, ?Return]opt}

  const body: ESTree.Statement[] = [];
  consumeOpt(parser, Token.LeftBrace);

  while (parser.token !== Token.RightBrace) {
    body.push(parseStatementListItem(parser, context));
  }

  consumeOpt(parser, Token.RightBrace);

  return wrapNode(parser, context, {
    type: 'BlockStatement',
    body,
  });
};

// https://tc39.es/ecma262/#prod-VariableDeclaration
const parseVariableStatement = (
  parser: IParserState,
  context: Context,
): ESTree.VariableDeclaration => {
  nextToken(parser);

  const declarations = parseVariableDeclarationList(parser, context);

  consumeSemicolon(parser);

  return wrapNode(parser, context, {
    type: 'VariableDeclaration',
    kind: 'var',
    declarations,
  });
};

export const parseReturnStatement = (
  parser: IParserState,
  context: Context,
): ESTree.ReturnStatement => {
  // TODO Global return error

  nextToken(parser);

  const noLineTerminatorHere =
    (parser.token & Token.IsAutoSemicolon) === Token.IsAutoSemicolon &&
    parser.lineTerminatorBeforeNextToken;

  const argument = noLineTerminatorHere
    ? null
    : parseExpression(parser, context);

  consumeSemicolon(parser);

  return wrapNode(parser, context, {
    type: 'ReturnStatement',
    argument,
  });
};

export const parseEmptyStatement = (
  parser: IParserState,
  context: Context,
): ESTree.EmptyStatement => {
  nextToken(parser);
  return wrapNode(parser, context, {
    type: 'EmptyStatement',
  });
};

export const parseThrowStatement = (
  parser: IParserState,
  context: Context,
): ESTree.ThrowStatement => {
  nextToken(parser);

  // Can't break the line
  if (parser.lineTerminatorBeforeNextToken) {
    throw Error;
  }

  const argument: ESTree.Expression = parseExpression(parser, context);

  consumeSemicolon(parser);

  return wrapNode(parser, context, {
    type: 'ThrowStatement',
    argument,
  });
};

const parseDebuggerStatement = (
  parser: IParserState,
  context: Context,
): ESTree.DebuggerStatement => {
  nextToken(parser);
  consumeSemicolon(parser);
  return wrapNode(parser, context, {
    type: 'DebuggerStatement',
  });
};

const parseConsequentOrAlternative = (
  parser: IParserState,
  context: Context,
): ESTree.Statement => {
  // TODO:
  // FunctionDeclarations in IfStatement Statement Clauses
  // https://tc39.es/ecma262/#sec-functiondeclarations-in-ifstatement-statement-clauses

  return parseStatement(parser, context);
};

const parseIfStatement = (
  parser: IParserState,
  context: Context,
): ESTree.IfStatement => {
  // if (Expression) Statement else Statement;
  // if (Expression) Statement;

  nextToken(parser);

  consume(parser, Token.LeftParen);

  const expression = parseExpression(parser, context);

  consume(parser, Token.RightParen);

  const consequent = parseConsequentOrAlternative(parser, context);

  const alternate = consumeOpt(parser, Token.ElseKeyword)
    ? parseConsequentOrAlternative(parser, context)
    : null;

  return wrapNode(parser, context, {
    type: 'IfStatement',
    test: expression,
    consequent,
    alternate,
  });
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

    case Token.FunctionKeyword:
    case Token.ClassKeyword: {
      throw Error;
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
  nextToken(parser);

  // TODO Async Function
  const isAsync = false;
  // TODO Generator Function
  const isGenerator = false;

  let id: ESTree.Identifier | null = null;

  if (parser.token & (Token.IsIdentifier | Token.IsKeyword)) {
    validateFunctionName(parser);

    id = parseIdentifier(parser, context);
  } else {
    throw Error('Missing Name of Function');
  }

  context |= Context.NewTarget;

  const params = parseFormalParameters(parser, context);

  const body = parseFunctionBody(parser, context);

  return wrapNode(parser, context, {
    type: 'FunctionDeclaration',
    id,
    params,
    body,
    async: isAsync,
    generator: isGenerator,
  });
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
  const params = parseUniqueFormalParameters(parser, context);
  const body = parseFunctionBody(parser, context);

  return wrapNode(parser, context, {
    type: 'FunctionExpression',
    params,
    body,
    async: false, // TODO
    generator: false,
    id: null,
  });
};

const parseClassElement = (
  parser: IParserState,
  context: Context,
): ESTree.MethodDefinition => {
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

  return wrapNode(parser, context, {
    type: 'MethodDefinition',
    kind,
    static: false,
    computed,
    key,
    value,
  }) as ESTree.MethodDefinition;
};

const parseClassBody = (
  parser: IParserState,
  context: Context,
): ESTree.ClassBody => {
  const classElementList: ESTree.MethodDefinition[] = [];

  if (consumeOpt(parser, Token.LeftBrace)) {
    while (parser.token !== Token.RightBrace) {
      if (parser.token === Token.RightBrace) break;
      classElementList.push(parseClassElement(parser, context));
      consumeOpt(parser, Token.Comma);
    }
    consume(parser, Token.RightBrace);
  }

  return wrapNode(parser, context, {
    type: 'ClassBody',
    body: classElementList,
  });
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
  consume(parser, Token.ClassKeyword);

  let id: ESTree.Expression | null = null;
  let superClass: ESTree.Expression | null = null;

  if (parser.token & Token.IsIdentifier) {
    id = parseBindingIdentifier(parser, context);
    // eslint-disable-next-line no-constant-condition
  } else if (true) {
    // TODO: context: Export Default
    throw Error('missingClassName');
  }

  if (consumeOpt(parser, Token.ExtendsKeyword)) {
    superClass = parseLeftHandSideExpression(parser, context);
    context |= Context.SuperCall;
  } else {
    // reset
    context = (context | Context.SuperCall) ^ Context.SuperCall;
  }

  const body = parseClassBody(parser, context);

  parser.assignable = false;

  return wrapNode(parser, context, {
    type: 'ClassDeclaration',
    id,
    superClass,
    body,
  });
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

    //    Statement
    default: {
      return parseStatement(parser, context);
    }
  }
};

const parseStatementList = (parser: IParserState, context: Context) => {
  // Initialize token
  nextToken(parser);

  const statements: ESTree.Statement[] = [];

  // Get the machine moving!
  while (parser.token !== Token.EOF) {
    statements.push(parseStatementListItem(parser, context));
  }
  return statements;
};

const parserMachine = (source: string, context: Context): ESTree.Program => {
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
