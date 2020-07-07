// https://github.com/estree/estree

export const NodeType = {
  Program: 'Program',
};

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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type Statement = any;

// Programs
export interface Program extends Node {
  type: 'Program';
  sourceType: SourceType;
  body: Statement[];
  start?: number;
  end?: number;
  range?: [number, number];
}
