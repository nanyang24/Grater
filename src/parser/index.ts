/* eslint-disable no-unused-vars */
import createParserState from './createParserState';

// typings
import * as ESTree from '../es-tree';
import { IParserState } from './type';

const parserMachine = (source: string): ESTree.Program => {
  // Initialize parser state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const parserState: IParserState = createParserState(source);
  const sourceType: ESTree.SourceType = 'script';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any[] = [];

  const nodeTree: ESTree.Program = {
    type: 'Program',
    sourceType,
    body,
  };

  return nodeTree;
};

// eslint-disable-next-line import/prefer-default-export
export { parserMachine };
