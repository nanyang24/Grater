/*
 * Lexical grammar
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar
 */

export enum Token {
  // https://stackoverflow.com/questions/6126439/what-does-0xff-do
  Musk = 0xff,

  IsIdentifier = 1 << 12,
  IsStringOrNumber = 1 << 13,
  IsPatternStart = 1 << 14,
  IsAssignPart = 1 << 14,
  IsKeyword = 1 << 15,
  IsAutoSemicolon = 1 << 16,
  IsBinaryOp = 1 << 17,
  IsLogical = 1 << 18,

  /* Precedence for binary operators */
  PrecStart = 8,
  Precedence = 15 << PrecStart, // 8-11
  /**
   * 1 ??
   * 2 ||
   * 3 &&
   * 4 |
   * 5 ^ +
   * 6 &
   * 7 === == !== !=
   * 8 <= >=
   * 9 << >> >>>
   * 10 -
   * 11 % /
   * 12 **
   *
   *
   * 15 ·limit·
   */

  Unknown = -1,
  // End-of-file
  EOF = 1024 | IsAutoSemicolon,

  /* Constants/Bindings */
  Identifier = 1 | IsIdentifier,
  NumericLiteral = 2 | IsStringOrNumber,
  StringLiteral = 3 | IsStringOrNumber,
  RegularExpression = 4,
  FalseKeyword = 5 | IsKeyword,
  TrueKeyword = 6 | IsKeyword,
  NullKeyword = 7 | IsKeyword,
  Keyword = 8 | IsKeyword,

  /* Punctuators */
  Arrow = 10,
  LeftParen = 11,
  LeftBrace = 12 | IsPatternStart, // {
  Period = 13,
  Ellipsis = 14,
  RightBrace = 15 | IsAutoSemicolon,
  RightParen = 16,
  Semicolon = 17 | IsAutoSemicolon,
  Comma = 18,
  LeftBracket = 19 | IsPatternStart, // [
  RightBracket = 20,
  Colon = 21,
  QuestionMark = 22, // ?
  QuestionMarkPeriod = 210, // ?.
  Nullish = 209 | IsBinaryOp | (1 << PrecStart), // ??
  SingleQuote = 23, // '
  DoubleQuote = 24, // ''
  JSXClose = 25,
  JSXAutoClose = 26,

  /* Update operators */
  Increment = 27,
  Decrement = 28,

  /* Assign operators */
  Assign = 29 | IsAssignPart,
  ShiftLeftAssign = 30 | IsAssignPart,
  ShiftRightAssign = 31 | IsAssignPart,
  LogicalShiftRightAssign = 32 | IsAssignPart,
  ExponentiateAssign = 33 | IsAssignPart,
  AddAssign = 34 | IsAssignPart,
  SubtractAssign = 35 | IsAssignPart,
  MultiplyAssign = 36 | IsAssignPart,
  DivideAssign = 37 | IsAssignPart,
  ModuloAssign = 38 | IsAssignPart,
  BitwiseXorAssign = 39 | IsAssignPart,
  BitwiseOrAssign = 40 | IsAssignPart,
  BitwiseAndAssign = 41 | IsAssignPart,

  /* Unary/binary operators */
  TypeofKeyword = 42 | IsKeyword,
  DeleteKeyword = 43 | IsKeyword,
  VoidKeyword = 44 | IsKeyword,
  Negate = 45,
  Complement = 46,
  Add = 47 | IsBinaryOp | (5 << PrecStart), // +
  Subtract = 48 | IsBinaryOp | (10 << PrecStart), // -
  InKeyword = 49 | IsBinaryOp | IsKeyword, // in
  InstanceofKeyword = 50 | IsBinaryOp | IsKeyword, // instanceof
  Multiply = 51 | IsBinaryOp, // *
  Modulo = 52 | IsBinaryOp | (11 << PrecStart), // %
  Divide = 53 | IsBinaryOp | (11 << PrecStart), // /
  Exponentiate = 54 | IsBinaryOp | (12 << PrecStart), // **
  LogicalAnd = 55 | IsBinaryOp | IsLogical | (3 << PrecStart), // &&
  LogicalOr = 56 | IsBinaryOp | IsLogical | (2 << PrecStart), // ||
  StrictEqual = 57 | IsBinaryOp | (7 << PrecStart), // ===
  StrictNotEqual = 58 | IsBinaryOp | (7 << PrecStart), // !==
  LooseEqual = 59 | IsBinaryOp | (7 << PrecStart), // ==
  LooseNotEqual = 60 | IsBinaryOp | (7 << PrecStart), // !=
  LessThanOrEqual = 61 | IsBinaryOp | (8 << PrecStart), // <=
  GreaterThanOrEqual = 62 | IsBinaryOp | (8 << PrecStart), // >=
  LessThan = 63 | IsBinaryOp | (8 << PrecStart), // <
  GreaterThan = 64 | IsBinaryOp | (8 << PrecStart), // >
  ShiftLeft = 65 | IsBinaryOp | (9 << PrecStart), // <<
  ShiftRight = 66 | IsBinaryOp | (9 << PrecStart), // >>
  LogicalShiftRight = 67 | IsBinaryOp | (9 << PrecStart), // >>>
  BitwiseAnd = 68 | IsBinaryOp | (6 << PrecStart), // &
  BitwiseOr = 69 | IsBinaryOp | (4 << PrecStart), // |
  BitwiseXor = 70 | IsBinaryOp | (5 << PrecStart), // ^

  /* Variable declaration */
  VarKeyword = 71 | IsKeyword,
  LetKeyword = 72 | IsKeyword,
  ConstKeyword = 73 | IsKeyword,

  /* Other reserved words */
  BreakKeyword = 74 | IsKeyword,
  CaseKeyword = 75 | IsKeyword,
  CatchKeyword = 76 | IsKeyword,
  ClassKeyword = 77 | IsKeyword,
  ContinueKeyword = 78 | IsKeyword,
  DebuggerKeyword = 79 | IsKeyword,
  DefaultKeyword = 80 | IsKeyword,
  DoKeyword = 81 | IsKeyword,
  ElseKeyword = 82 | IsKeyword,
  ExportKeyword = 83 | IsKeyword,
  ExtendsKeyword = 84 | IsKeyword,
  FinallyKeyword = 85 | IsKeyword,
  ForKeyword = 86 | IsKeyword,
  FunctionKeyword = 87 | IsKeyword,
  IfKeyword = 88 | IsKeyword,
  ImportKeyword = 89 | IsKeyword,
  NewKeyword = 90 | IsKeyword,
  ReturnKeyword = 91 | IsKeyword,
  SuperKeyword = 92 | IsKeyword,
  SwitchKeyword = 93 | IsKeyword,
  ThisKeyword = 94 | IsKeyword,
  ThrowKeyword = 95 | IsKeyword,
  TryKeyword = 96 | IsKeyword,
  WhileKeyword = 97 | IsKeyword,
  WithKeyword = 98 | IsKeyword,
  /* Strict mode reserved words */
  ImplementsKeyword = 99,
  InterfaceKeyword = 100,
  PackageKeyword = 101,
  PrivateKeyword = 102,
  ProtectedKeyword = 103,
  PublicKeyword = 104,
  StaticKeyword = 105,
  YieldKeyword = 106 | IsIdentifier,

  /* Contextual keywords */
  AsKeyword = 107,
  AsyncKeyword = 108,
  AwaitKeyword = 109 | IsIdentifier,
  ConstructorKeyword = 110,
  GetKeyword = 111,
  SetKeyword = 112,
  FromKeyword = 113,
  OfKeyword = 114,
  EnumKeyword = 115 | IsKeyword,

  Eval = 116,
  Arguments = 117,

  EscapedReserved = 118,
  EscapedFutureReserved = 119,
  AnyIdentifier = 120 | IsIdentifier,

  WhiteSpace = 200,
  LineFeed = 201,
  CarriageReturn = 202,
  PrivateField = 203,
  EscapedIdentifier = 204,
  Template = 205,
  Decorator = 206,
  Target = 207 | IsIdentifier,
  Meta = 208 | IsIdentifier,
}

// Reserved keywords of ECMAScript
export const mapKeywordTable: { [key: string]: Token } = Object.create(null, {
  this: { value: Token.ThisKeyword },
  function: { value: Token.FunctionKeyword },
  if: { value: Token.IfKeyword },
  return: { value: Token.ReturnKeyword },
  var: { value: Token.VarKeyword },
  else: { value: Token.ElseKeyword },
  for: { value: Token.ForKeyword },
  new: { value: Token.NewKeyword },
  in: { value: Token.InKeyword },
  typeof: { value: Token.TypeofKeyword },
  while: { value: Token.WhileKeyword },
  case: { value: Token.CaseKeyword },
  break: { value: Token.BreakKeyword },
  try: { value: Token.TryKeyword },
  catch: { value: Token.CatchKeyword },
  delete: { value: Token.DeleteKeyword },
  throw: { value: Token.ThrowKeyword },
  switch: { value: Token.SwitchKeyword },
  continue: { value: Token.ContinueKeyword },
  default: { value: Token.DefaultKeyword },
  instanceof: { value: Token.InstanceofKeyword },
  do: { value: Token.DoKeyword },
  void: { value: Token.VoidKeyword },
  finally: { value: Token.FinallyKeyword },
  async: { value: Token.AsyncKeyword },
  await: { value: Token.AwaitKeyword },
  class: { value: Token.ClassKeyword },
  const: { value: Token.ConstKeyword },
  constructor: { value: Token.ConstructorKeyword },
  debugger: { value: Token.DebuggerKeyword },
  export: { value: Token.ExportKeyword },
  extends: { value: Token.ExtendsKeyword },
  false: { value: Token.FalseKeyword },
  from: { value: Token.FromKeyword },
  get: { value: Token.GetKeyword },
  implements: { value: Token.ImplementsKeyword },
  import: { value: Token.ImportKeyword },
  interface: { value: Token.InterfaceKeyword },
  let: { value: Token.LetKeyword },
  null: { value: Token.NullKeyword },
  of: { value: Token.OfKeyword },
  package: { value: Token.PackageKeyword },
  private: { value: Token.PrivateKeyword },
  protected: { value: Token.ProtectedKeyword },
  public: { value: Token.PublicKeyword },
  set: { value: Token.SetKeyword },
  static: { value: Token.StaticKeyword },
  super: { value: Token.SuperKeyword },
  true: { value: Token.TrueKeyword },
  with: { value: Token.WithKeyword },
  yield: { value: Token.YieldKeyword },
  enum: { value: Token.EnumKeyword },
  eval: { value: Token.Eval },
  as: { value: Token.AsKeyword },
  arguments: { value: Token.Arguments },
  target: { value: Token.Target },
  meta: { value: Token.Meta },
});
