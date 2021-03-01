import { IParserState, Context, ExtraInfo } from './type';

export function injectParserInfo(
  node: any,
  parser: IParserState,
  context: Context,
  extraInfo?: ExtraInfo,
) {
  const { linePos = -1, colPos = -1 } = extraInfo || {};

  if (context & Context.OptionsLoc) {
    node.loc = {
      start: {
        line: linePos,
        column: colPos,
      },
      end: {
        line: parser.startLine,
        column: parser.startColumn,
      },
    };
  }
}

export const wrapNode = <T extends any>(
  parser: IParserState,
  context: Context,
  node: T,
  extraInfo?: ExtraInfo,
): T => {
  injectParserInfo(node, parser, context, extraInfo);

  return node;
};
