import parserMachine from './parser';
import * as ESTree from './es-tree';
import { Context, Options } from './parser/type';

export function parseScript(source: string, options?: Options): ESTree.Program {
  return parserMachine(source, Context.Empty, options);
}

export default parserMachine;
