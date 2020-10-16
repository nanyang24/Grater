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
import { IParserState, PropertyKind, PropertyKindMap } from './type';

const wrapNode = <T extends any>(parser: IParserState, node: T): T => {
  return node;
};

const parseThisExpression = (parser: IParserState) => {
  nextToken(parser);
  parser.assignable = false;
  return wrapNode(parser, {
    type: 'ThisExpression',
  });
};

const parsePrimitiveLiteral = (parser: IParserState) => {
  const { tokenValue } = parser;

  // Maybe a little mental burden
  const value = JSON.parse(tokenValue);

  nextToken(parser);
  parser.assignable = false;
  return wrapNode(parser, {
    type: 'Literal',
    value,
  });
};

const parseLiteral = (parser: IParserState): ESTree.Literal => {
  const { tokenValue } = parser;

  nextToken(parser);

  parser.assignable = false;

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

export const parseBindingElement = (parser: IParserState): ESTree.Parameter => {
  let node;

  if (parser.token & Token.IsPatternStart) {
    node = parseBindingPattern(parser);
  } else {
    node = parseBindingIdentifier(parser);
    if (parser.token !== Token.Assign) return node;
  }

  if (consumeOpt(parser, Token.Assign)) {
    const right = parseExpression(parser);

    node = wrapNode(parser, {
      type: 'AssignmentPattern',
      left: node,
      right,
    });
  }

  return wrapNode(parser, node) as ESTree.Parameter;
};

const parseArguments = (parser: IParserState) => {
  const args = [];
  consume(parser, Token.LeftParen);

  while (parser.token !== Token.RightParen) {
    args.push(parseExpression(parser));

    if (consumeOpt(parser, Token.Comma)) continue;
    if (parser.token === Token.RightParen) break;
  }

  consume(parser, Token.RightParen);

  return args;
};

export const parseFormalParameters = (
  parser: IParserState,
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
      params.push(parseBindingElement(parser));

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
): ESTree.Parameter[] {
  // UniqueFormalParameters:
  //    FormalParameters
  const parameters = parseFormalParameters(parser);

  // TODO
  // It is a Syntax Error if any element of the BoundNames of FormalParameters also occurs
  // in the LexicallyDeclaredNames of FunctionBody.
  return parameters;
}

export const parseFunctionBody = (
  parser: IParserState,
): ESTree.FunctionBody => {
  consumeOpt(parser, Token.LeftBrace);

  const body: ESTree.Statement[] = [];

  while (parser.token !== Token.RightBrace) {
    body.push(parseStatementListItem(parser));
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

  const params = parseFormalParameters(parser);

  const body = parseFunctionBody(parser);

  parser.assignable = false;

  return wrapNode(parser, {
    type: 'FunctionExpression',
    id,
    params,
    body,
    async: isAsync,
    generator: isGenerator,
  });
};

const parseUnaryExpression = (parser: IParserState) => {
  const operator = KeywordTokenTable[
    parser.token & Token.Musk
  ] as ESTree.UnaryOperator;
  nextToken(parser);
  const argument = parseLeftHandSideExpression(parser);

  parser.assignable = false;
  return wrapNode(parser, {
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

    left = wrapNode(parser, {
      type:
        (curToken & Token.IsLogical) === Token.IsLogical ||
        (curToken & Token.Nullish) === Token.Nullish
          ? 'LogicalExpression'
          : 'BinaryExpression',
      left,
      right: parseBinaryExpression(
        parser,
        parseLeftHandSideExpression(parser),
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
): ESTree.UpdateExpression => {
  const operator = KeywordTokenTable[
    parser.token & Token.Musk
  ] as ESTree.UpdateOperator;

  nextToken(parser);

  const argument = parseLeftHandSideExpression(parser);

  if (!parser.assignable) {
    throw Error('lhs');
  }

  parser.assignable = false;

  return wrapNode(parser, {
    type: 'UpdateExpression',
    argument,
    operator,
    prefix: true,
  });
};

const parseSuffixUpdateExpression = (
  parser: IParserState,
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

  return wrapNode(parser, {
    type: 'UpdateExpression',
    argument: operand,
    operator,
    prefix: false,
  });
};

const parseNewExpression = (parser: IParserState) => {
  // NewExpression:
  //    MemberExpression
  //    newNewExpression
  // MetaProperty:
  //    NewTarget
  //    ImportMeta
  // NewTarget:
  //    new.target

  nextToken(parser);

  // new.target
  if (consumeOpt(parser, Token.Period)) {
    if (parser.token !== Token.Target) throw 'Invalid New Target';
    parser.assignable = false;

    // TODO: parseMetaProperty
    return;
  }
  const callee = parseMemberExpression(parser, parsePrimaryExpression(parser));
  const args = parser.token === Token.LeftParen ? parseArguments(parser) : [];
  parser.assignable = false;

  return wrapNode(parser, {
    type: 'NewExpression',
    callee,
    arguments: args,
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
    parser.assignable = true;
    return parseIdentifier(parser);
  }

  if ((parser.token & Token.IsStringOrNumber) === Token.IsStringOrNumber) {
    return parseLiteral(parser);
  }

  switch (parser.token) {
    case Token.Decrement:
    case Token.Increment:
      return parsePrefixUpdateExpression(parser);

    case Token.TypeofKeyword:
    case Token.DeleteKeyword:
    case Token.VoidKeyword:
    case Token.Negate:
    case Token.Complement:
    case Token.Add:
    case Token.Subtract:
      return parseUnaryExpression(parser);

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
    case Token.NewKeyword: {
      return parseNewExpression(parser);
    }
    // FunctionExpression
    case Token.FunctionKeyword:
      return parseFunctionExpression(parser);

    default: {
      throw KeywordTokenTable[parser.token & Token.Musk];
    }
  }
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
    const right = parseExpression(parser);

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
      isPattern ? AssignmentPattern : AssignmentExpression,
    );
  }

  return parseConditionalExpression(parser, left);
};

const parseConditionalExpression = (
  parser: IParserState,
  left: ESTree.Expression,
) => {
  const node = parseBinaryExpression(parser, left, /* minPrec */ 4);

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
  expr: ESTree.Expression,
): ESTree.Expression => {
  while (parser.token & Token.IsPropertyOrCallExpression) {
    switch (parser.token) {
      /* Update expression */
      // This is not part of the MemberExpression specification, but let's simplify the implementation here
      case Token.Decrement:
      case Token.Increment:
        return parseSuffixUpdateExpression(parser, expr);

      /* Property */
      case Token.Period:
        nextToken(parser);

        const property = parseIdentifier(parser);

        expr = wrapNode(parser, {
          type: 'MemberExpression',
          object: expr,
          computed: false,
          property,
        });
        break;

      /* Property */
      case Token.LeftBracket: {
        nextToken(parser);

        const property = parseExpression(parser);

        consume(parser, Token.RightBracket);

        parser.assignable = false;

        expr = wrapNode(parser, {
          type: 'MemberExpression',
          object: expr,
          computed: true,
          property,
        });
        break;
      }

      /* Call */
      case Token.LeftParen: {
        const args = parseArguments(parser);

        parser.assignable = false;

        expr = wrapNode(parser, {
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

const parseBindingIdentifier = (parser: IParserState): ESTree.Identifier => {
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

  return wrapNode(parser, {
    type: 'Identifier',
    name: tokenValue,
  });
};

export const parseBindingProperty = (parser: IParserState) => {
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
    key = parseIdentifier(parser);
    kind |= PropertyKind.Generator;

    // shortHand: `,` `}` `=`
    if (
      parser.token === Token.Comma ||
      parser.token === Token.RightBrace ||
      parser.token === Token.Assign
    ) {
      shorthand = true;
      value = parseAssignmentExpression(parser, key, true);
    } else if (consumeOpt(parser, Token.Colon)) {
      value = parseBindingElement(parser);
    }
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

export const parseObjectBindingPattern = (parser: IParserState) => {
  // ObjectBindingPattern[Yield, Await]:
  //    {}
  //    {BindingRestProperty[?Yield, ?Await]}
  //    {BindingPropertyList[?Yield, ?Await]}
  //    {BindingPropertyList[?Yield, ?Await],BindingRestProperty[?Yield, ?Await]opt}

  consume(parser, Token.LeftBrace);

  const properties: ESTree.Property[] = [];

  while (parser.token !== Token.RightBrace) {
    properties.push(parseBindingProperty(parser));

    if (parser.token !== Token.Comma) break;

    nextToken(parser);
  }

  consume(parser, Token.RightBrace);

  return wrapNode(parser, {
    type: 'ObjectPattern',
    properties,
  }) as ESTree.ObjectPattern;
};
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const parseArrayBindingPattern = () => {};

const parseBindingPattern = (
  parser: IParserState,
): ESTree.ArrayPattern | ESTree.ObjectPattern => {
  if (parser.token === Token.LeftBrace) {
    return parseObjectBindingPattern(parser);
  }
  return parseArrayBindingPattern() as any;
};

export const parseBindingPatternOrIdentifier = (
  parser: IParserState,
): ESTree.BindingPattern => {
  // BindingPattern:
  //   ObjectBindingPattern
  //   ArrayBindingPattern
  //
  // BindingIdentifier
  return parser.token & Token.IsPatternStart
    ? parseBindingPattern(parser)
    : parseBindingIdentifier(parser);
};

const parseVariableDeclaration = (
  parser: IParserState,
): ESTree.VariableDeclarator => {
  let init:
    | ESTree.Expression
    | ESTree.BindingPattern
    | ESTree.Identifier
    | null = null;

  const id = parseBindingPatternOrIdentifier(parser);

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
    body.push(parseStatementListItem(parser));
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

export const parseReturnStatement = (
  parser: IParserState,
): ESTree.ReturnStatement => {
  // TODO Global return error

  nextToken(parser);

  const noLineTerminatorHere =
    (parser.token & Token.IsAutoSemicolon) === Token.IsAutoSemicolon &&
    parser.lineTerminatorBeforeNextToken;

  const argument = noLineTerminatorHere ? null : parseExpression(parser);

  consumeSemicolon(parser);

  return wrapNode(parser, {
    type: 'ReturnStatement',
    argument,
  });
};

export const parseEmptyStatement = (
  parser: IParserState,
): ESTree.EmptyStatement => {
  nextToken(parser);
  return wrapNode(parser, {
    type: 'EmptyStatement',
  });
};

export const parseThrowStatement = (
  parser: IParserState,
): ESTree.ThrowStatement => {
  nextToken(parser);

  // Can't break the line
  if (parser.lineTerminatorBeforeNextToken) {
    throw Error;
  }

  const argument: ESTree.Expression = parseExpression(parser);

  consumeSemicolon(parser);

  return wrapNode(parser, {
    type: 'ThrowStatement',
    argument,
  });
};

const parseDebuggerStatement = (
  parser: IParserState,
): ESTree.DebuggerStatement => {
  nextToken(parser);
  consumeSemicolon(parser);
  return wrapNode(parser, {
    type: 'DebuggerStatement',
  });
};

const parseConsequentOrAlternative = (
  parser: IParserState,
): ESTree.Statement => {
  // TODO:
  // FunctionDeclarations in IfStatement Statement Clauses
  // https://tc39.es/ecma262/#sec-functiondeclarations-in-ifstatement-statement-clauses

  return parseStatement(parser);
};

const parseIfStatement = (parser: IParserState): ESTree.IfStatement => {
  // if (Expression) Statement else Statement;
  // if (Expression) Statement;

  nextToken(parser);

  consume(parser, Token.LeftParen);

  const expression = parseExpression(parser);

  consume(parser, Token.RightParen);

  const consequent = parseConsequentOrAlternative(parser);

  const alternate = consumeOpt(parser, Token.ElseKeyword)
    ? parseConsequentOrAlternative(parser)
    : null;

  return wrapNode(parser, {
    type: 'IfStatement',
    test: expression,
    consequent,
    alternate,
  });
};

const parseHigherExpression = (
  parser: IParserState,
  expression: ESTree.Expression,
): ESTree.Expression => {
  // `.foo`, `.[foo]`
  expression = parseMemberExpression(parser, expression);

  // `foo = bar`, `foo[foo] = bar`
  expression = parseAssignmentExpression(parser, expression);

  return expression;
};

const parseExpressionStatements = (parser: IParserState) => {
  let expr: ESTree.Expression = parsePrimaryExpression(parser);

  expr = parseHigherExpression(parser, expr);

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
    case Token.ReturnKeyword: {
      return parseReturnStatement(parser);
    }
    case Token.DebuggerKeyword: {
      return parseDebuggerStatement(parser);
    }
    // Empty
    case Token.Semicolon: {
      return parseEmptyStatement(parser);
    }
    case Token.ThrowKeyword: {
      return parseThrowStatement(parser);
    }
    case Token.IfKeyword: {
      return parseIfStatement(parser);
    }

    case Token.FunctionKeyword:
    case Token.ClassKeyword: {
      throw Error;
    }

    default: {
      return parseExpressionStatements(parser);
    }
  }
};

// FunctionDeclaration
//    functionBindingIdentifier ( FormalParameters ){ FunctionBody }
//    [+Default] function ( FormalParameters ) { FunctionBody }
const parseFunctionDeclaration = (
  parser: IParserState,
): ESTree.FunctionDeclaration => {
  nextToken(parser);

  // TODO Async Function
  const isAsync = false;
  // TODO Generator Function
  const isGenerator = false;

  let id: ESTree.Identifier | null = null;

  if (parser.token & (Token.IsIdentifier | Token.IsKeyword)) {
    validateFunctionName(parser);

    id = parseIdentifier(parser);
  } else {
    throw Error('Missing Name of Function');
  }

  const params = parseFormalParameters(parser);

  const body = parseFunctionBody(parser);

  return wrapNode(parser, {
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
): ESTree.FunctionExpression => {
  const params = parseUniqueFormalParameters(parser);
  const body = parseFunctionBody(parser);

  return wrapNode(parser, {
    type: 'FunctionExpression',
    params,
    body,
    async: false, // TODO
    generator: false,
    id: null,
  });
};

const parseClassElement = (parser: IParserState): ESTree.MethodDefinition => {
  const kind = 'method';
  let computed = false;
  let key: ESTree.Expression | null = null;

  if (parser.token & (Token.IsIdentifier | Token.IsKeyword)) {
    key = parseIdentifier(parser);
  } else if (parser.token === Token.LeftBracket) {
    computed = true;
    key = parseComputedPropertyName(parser);
  }

  const value = parseMethodDefinition(parser);

  return wrapNode(parser, {
    type: 'MethodDefinition',
    kind,
    static: false,
    computed,
    key,
    value,
  }) as ESTree.MethodDefinition;
};

const parseClassBody = (parser: IParserState): ESTree.ClassBody => {
  const classElementList: ESTree.MethodDefinition[] = [];

  if (consumeOpt(parser, Token.LeftBrace)) {
    while (parser.token !== Token.RightBrace) {
      if (parser.token === Token.RightBrace) break;
      classElementList.push(parseClassElement(parser));
      consumeOpt(parser, Token.Comma);
    }
    consume(parser, Token.RightBrace);
  }

  return wrapNode(parser, {
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
): ESTree.ClassDeclaration => {
  consume(parser, Token.ClassKeyword);

  let id: ESTree.Expression | null = null;
  let superClass: ESTree.Expression | null = null;

  if (parser.token & Token.IsIdentifier) {
    id = parseBindingIdentifier(parser);
    // eslint-disable-next-line no-constant-condition
  } else if (true) {
    // TODO: context: Export Default
    throw Error('missingClassName');
  }

  if (consumeOpt(parser, Token.ExtendsKeyword)) {
    superClass = parseLeftHandSideExpression(parser);
  } else {
    // TODO
  }

  const body = parseClassBody(parser);

  parser.assignable = false;

  return wrapNode(parser, {
    type: 'ClassDeclaration',
    id,
    superClass,
    body,
  });
};

const parseStatementListItem = (parser: IParserState): ESTree.Statement => {
  // StatementListItem:
  //    Statement
  //    Declaration

  switch (parser.token) {
    // Declaration
    case Token.FunctionKeyword:
    case Token.AsyncKeyword:
      return parseFunctionDeclaration(parser);
    case Token.ClassKeyword:
      return parseClassDeclaration(parser);

    //    Statement
    default: {
      return parseStatement(parser);
    }
  }
};

const parseStatementList = (parser: IParserState) => {
  // Initialize token
  nextToken(parser);

  const statements: ESTree.Statement[] = [];

  // Get the machine moving!
  while (parser.token !== Token.EOF) {
    statements.push(parseStatementListItem(parser));
  }
  return statements;
};

const parserMachine = (source: string): ESTree.Program => {
  // Initialize parser state
  const parserState: IParserState = createParserState(source);
  const sourceType: ESTree.SourceType = 'script';

  let body: any[] = [];

  body = parseStatementList(parserState);

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
