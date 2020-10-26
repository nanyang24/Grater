import { parserMachine } from './parser';
import * as ESTree from './es-tree';
import { Context } from './parser/type';

export function parseScript(source: string): ESTree.Program {
  return parserMachine(source, Context.Empty);
}

export default parserMachine;
