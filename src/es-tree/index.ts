// https://github.com/estree/estree

// Node objects
export interface Node {
  type: string;
  loc?: SourceLocation | null;
}

export interface SourceLocation {
  source?: string | null;
  start: Position;
  end: Position;
}

export interface Position {
  line: number; // >= 1
  column: number; // >= 0
}

export type SourceType = 'module' | 'script';

export type Parameter =
  | AssignmentPattern
  | ArrayPattern
  | ObjectPattern
  | Identifier;

/*
 * Programs
 */
export interface Program extends Node {
  type: 'Program';
  sourceType: SourceType;
  body: Statement[];
  start?: number;
  end?: number;
  range?: [number, number];
}

/*
 * Patterns
 * Destructuring binding and assignment are not part of ES5
 */
export type Pattern =
  | Identifier
  | ObjectPattern
  | ArrayPattern
  | AssignmentPattern
  | MemberExpression;

export type BindingPattern = ArrayPattern | ObjectPattern | Identifier;

export interface ArrayPattern extends Node {
  type: 'ArrayPattern';
  elements: Expression[];
}

export interface ObjectPattern extends Node {
  type: 'ObjectPattern';
  properties: ObjectLiteralElementLike[];
}

export type ObjectLiteralElementLike = Property;

/*
 * Identifier
 */
export interface Identifier extends Expression {
  type: 'Identifier';
  name: string;
}

/*
 * Literal
 */
export interface Literal extends Expression {
  type: 'Literal';
  value: string | boolean | null | number | RegExp;
}

/*
 * Functions
 */
export interface Function extends Node {
  id: Identifier | null;
  params: Pattern[];
  body: FunctionBody;
}

/*
 * Statements
 */
export type Statement =
  | BlockStatement
  | ExpressionStatement
  // | FunctionBody
  | EmptyStatement
  | DebuggerStatement
  | WithStatement
  | ReturnStatement
  | LabeledStatement
  | BreakStatement
  | BreakStatement
  | ContinueStatement
  | IfStatement
  | SwitchStatement
  | ThrowStatement
  | TryStatement
  // VariableDeclaration
  | VariableDeclaration
  // FunctionDeclaration
  | FunctionDeclaration
  // IterationStatement: for/for-in/while/do-while
  | IterationStatement;

export type IterationStatement =
  | ForStatement
  | ForInStatement
  | WhileStatement
  | DoWhileStatement;

export interface Directive extends Node {
  type: 'ExpressionStatement';
  expression: Literal;
  directive: string;
}

export interface BlockStatement extends Node {
  type: 'BlockStatement';
  body: Statement[];
}

export interface ExpressionStatement extends Node {
  type: 'ExpressionStatement';
  expression: Expression;
}

export interface FunctionBody extends Node {
  body: Directive | Statement[];
}

export interface EmptyStatement extends Node {
  type: 'EmptyStatement';
}

// A debugger statement.
export interface DebuggerStatement extends Node {
  type: 'DebuggerStatement';
}

// A with statement.
export interface WithStatement extends Node {
  type: 'WithStatement';
  object: Expression;
  body: Statement;
}

// Control flow

// A Reture statement.
export interface ReturnStatement extends Node {
  type: 'ReturnStatement';
  argument: Expression | null;
}

// A labeled statement, i.e., a statement prefixed by a break/continue label.
export interface LabeledStatement extends Node {
  type: 'LabeledStatement';
  label: Identifier;
  body: Statement;
}

export interface BreakStatement extends Node {
  type: 'BreakStatement';
  label: Identifier | null;
}

export interface ContinueStatement extends Node {
  type: 'ContinueStatement';
  label: Identifier | null;
}

// Choice

export interface IfStatement extends Node {
  type: 'IfStatement';
  test: Expression;
  consequent: Statement;
  alternate: Statement | null;
}

export interface SwitchStatement extends Node {
  type: 'SwitchStatement';
  discriminant: Expression;
  cases: SwitchCase[];
}

// A case (if test is an Expression) or default (if test === null) clause in the body of a switch statement.
export interface SwitchCase extends Node {
  type: 'SwitchCase';
  test: Expression | null;
  consequent: Statement[];
}

// Exceptions

// A throw statement
export interface ThrowStatement extends Node {
  type: 'ThrowStatement';
  argument: Expression;
}

// A try statement. If handler is null then finalizer must be a BlockStatement.
export interface TryStatement extends Node {
  type: 'TryStatement';
  block: BlockStatement;
  handler: CatchClause | null;
  finalizer: BlockStatement | null;
}

export interface CatchClause extends Node {
  type: 'CatchClause';
  param: Pattern;
  body: BlockStatement;
}

// Loops
export interface WhileStatement extends Node {
  type: 'WhileStatement';
  test: Expression;
  body: Statement;
}

export interface DoWhileStatement extends Node {
  type: 'DoWhileStatement';
  test: Expression;
  body: Statement;
}

export interface ForStatement extends Node {
  type: 'ForStatement';
  init: VariableDeclaration | Expression | null;
  test: Expression | null;
  update: Expression | null;
  body: Statement;
}
export interface ForInStatement extends Node {
  type: 'ForInStatement';
  left: VariableDeclaration | Expression;
  right: Expression;
  body: Statement;
}

/*
 * Declarations
 */
export interface FunctionDeclaration extends Function {
  type: 'FunctionDeclaration';
}

export interface VariableDeclaration extends Node {
  type: 'VariableDeclaration';
  declarations: VariableDeclarator[];
  kind: 'let' | 'const' | 'var';
}

export interface VariableDeclarator extends Node {
  type: 'VariableDeclarator';
  id: Pattern;
  init: Expression | null;
}

/*
 * Expressions
 */
export type Expression = any;

export type LeftHandSideExpression =
  | AssignmentExpression
  | ConditionalExpression
  | MemberExpression
  | BinaryExpression
  | CallExpression
  | UnaryExpression
  | NewExpression
  | ThisExpression
  | FunctionExpression
  | FunctionBody
  | ImportMeta;

export interface ThisExpression extends Node {
  type: 'ThisExpression';
}

export interface ArrayExpression extends Node {
  type: 'ArrayExpression';
  elements: any[];
}
export interface ObjectExpression extends Node {
  type: 'ObjectExpression';
  properties: Property[];
}

// Property
export interface Property extends Node {
  type: 'Property';
  key: Expression;
  value: Expression;
  computed: boolean;
  method: boolean;
  shorthand: boolean;
  kind: 'init' | 'get' | 'set';
}

export interface FunctionExpression extends Function, Expression {
  type: 'FunctionExpression';
}

// Unary operations 一元操作符
export interface UnaryExpression extends Node {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  prefix: true;
  argument: Expression;
}

// A unary operator token.
export type UnaryOperator =
  | '-'
  | '+'
  | '!'
  | '~'
  | 'typeof'
  | 'void'
  | 'delete';

export interface UpdateExpression extends Node {
  type: 'UpdateExpression';
  operator: UpdateOperator;
  argument: Expression;
  prefix: boolean;
}

// An update (increment or decrement) operator token.
export type UpdateOperator = '++' | '--';

// Binary operations
export interface BinaryExpression extends Node {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

// A binary operator token.
export type BinaryOperator =
  | '=='
  | '!='
  | '==='
  | '!=='
  | '<'
  | '<='
  | '>'
  | '>='
  | '<<'
  | '>>'
  | '>>>'
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '|'
  | '^'
  | '&'
  | 'in'
  | 'instanceof';

export interface AssignmentExpression extends Node {
  type: 'AssignmentExpression';
  operator: AssignmentOperator;
  left: Expression;
  right: Expression;
}
export interface AssignmentPattern extends Node {
  type: 'AssignmentPattern';
  left: BindingPattern | Identifier;
  right?: Expression;
}

// An assignment operator token.
export type AssignmentOperator =
  | '='
  | '+='
  | '-='
  | '*='
  | '/='
  | '%='
  | '<<='
  | '>>='
  | '>>>='
  | '|='
  | '^='
  | '&=';

export interface LogicalExpression extends Node {
  type: 'LogicalExpression';
  operator: LogicalOperator;
  left: Expression;
  right: Expression;
}

// A logical operator token.
export type LogicalOperator = '||' | '&&';

export interface MemberExpression extends Node {
  type: 'MemberExpression';
  object: Expression;
  property: Expression;
  computed?: boolean;
}

// A conditional expression, i.e., a ternary ?/: expression.
export interface ConditionalExpression extends Node {
  type: 'ConditionalExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
}

// A function or method call expression.
export interface CallExpression extends Node {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
}

// A new expression.
export interface NewExpression extends Node {
  type: 'NewExpression';
  callee: Expression;
  arguments: Expression[];
}

// A sequence expression, i.e., a comma-separated sequence of expressions.
export interface SequenceExpression extends Node {
  type: 'SequenceExpression';
  expressions: Expression[];
}
