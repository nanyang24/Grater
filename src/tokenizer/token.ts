/*
 * Lexical grammar
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar
 */

export enum Token {
  // https://stackoverflow.com/questions/6126439/what-does-0xff-do
  Musk = 0xff,

  IsIdentifier = 1 << 11,
  IsStringOrNumber = 1 << 12,

  Keyword = 1 << 12,

  Unknown = -1,
  // End-of-file
  EOF = 0,

  /* Constants/Bindings */
  Identifier = 1 | IsIdentifier,
  NumericLiteral = 2 | IsStringOrNumber,
  StringLiteral = 3 | IsStringOrNumber,
  RegularExpression = 4,
  FalseKeyword = 5,
  TrueKeyword = 6,
  NullKeyword = 7,

  /* Punctuators */
  Arrow = 10,
  LeftParen = 11,
  LeftBrace = 12,
  Period = 13,
  Ellipsis = 14,
  RightBrace = 15,
  RightParen = 16,
  Semicolon = 17,
  Comma = 18,
  LeftBracket = 19,
  RightBracket = 20,
  Colon = 21,
  QuestionMark = 22,
  SingleQuote = 23,
  DoubleQuote = 24,
  JSXClose = 25,
  JSXAutoClose = 26,

  /* Update operators */
  Increment = 27,
  Decrement = 28,

  /* Assign operators */
  Assign = 29,
  ShiftLeftAssign = 30,
  ShiftRightAssign = 31,
  LogicalShiftRightAssign = 32,
  ExponentiateAssign = 33,
  AddAssign = 34,
  SubtractAssign = 35,
  MultiplyAssign = 36,
  DivideAssign = 37,
  ModuloAssign = 38,
  BitwiseXorAssign = 39,
  BitwiseOrAssign = 40,
  BitwiseAndAssign = 41,

  /* Unary/binary operators */
  TypeofKeyword = 42,
  DeleteKeyword = 43,
  VoidKeyword = 44,
  Negate = 45,
  Complement = 46,
  Add = 47,
  Subtract = 48,
  InKeyword = 49,
  InstanceofKeyword = 50,
  Multiply = 51,
  Modulo = 52,
  Divide = 53,
  Exponentiate = 54,
  LogicalAnd = 55,
  LogicalOr = 56,
  StrictEqual = 57,
  StrictNotEqual = 58,
  LooseEqual = 59,
  LooseNotEqual = 60,
  LessThanOrEqual = 61,
  GreaterThanOrEqual = 62,
  LessThan = 63,
  GreaterThan = 64,
  ShiftLeft = 65,
  ShiftRight = 66,
  LogicalShiftRight = 67,
  BitwiseAnd = 68,
  BitwiseOr = 69,
  BitwiseXor = 70,

  /* Variable declaration */
  VarKeyword = 71,
  LetKeyword = 72,
  ConstKeyword = 73,

  /* Other reserved words */
  BreakKeyword = 74,
  CaseKeyword = 75,
  CatchKeyword = 76,
  ClassKeyword = 77,
  ContinueKeyword = 78,
  DebuggerKeyword = 79,
  DefaultKeyword = 80,
  DoKeyword = 81,
  ElseKeyword = 82,
  ExportKeyword = 83,
  ExtendsKeyword = 84,
  FinallyKeyword = 85,
  ForKeyword = 86,
  FunctionKeyword = 87,
  IfKeyword = 88,
  ImportKeyword = 89,
  NewKeyword = 90,
  ReturnKeyword = 91,
  SuperKeyword = 92,
  SwitchKeyword = 93,
  ThisKeyword = 94,
  ThrowKeyword = 95,
  TryKeyword = 96,
  WhileKeyword = 97,
  WithKeyword = 98,
  /* Strict mode reserved words */
  ImplementsKeyword = 99,
  InterfaceKeyword = 100,
  PackageKeyword = 101,
  PrivateKeyword = 102,
  ProtectedKeyword = 103,
  PublicKeyword = 104,
  StaticKeyword = 105,
  YieldKeyword = 106,

  /* Contextual keywords */
  AsKeyword = 107,
  AsyncKeyword = 108,
  AwaitKeyword = 109,
  ConstructorKeyword = 110,
  GetKeyword = 111,
  SetKeyword = 112,
  FromKeyword = 113,
  OfKeyword = 114,
  EnumKeyword = 115,

  Eval = 116,
  Arguments = 117,

  EscapedReserved = 118,
  EscapedFutureReserved = 119,
  AnyIdentifier = 120,

  WhiteSpace = 200,
  LineFeed = 201,
  CarriageReturn = 202,
  PrivateField = 203,
  EscapedIdentifier = 204,
  Template = 205,
  Decorator = 206,
  Target = 207,
  Meta = 208,
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
