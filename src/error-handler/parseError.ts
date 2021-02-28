import { Errors } from './type';
import { ErrorMessage } from './errorMessage';

export class ParseError extends SyntaxError {
  public loc: {
    line: ParseError['line'];
    column: ParseError['column'];
  };

  public index: number;

  public line: number;

  public column: number;

  public description: string;

  constructor(
    startindex: number,
    line: number,
    column: number,
    type: Errors,
    ...params: string[]
  ) {
    const message =
      '[' +
      line +
      ':' +
      column +
      ']: ' +
      ErrorMessage[type].replace(
        /%(\d+)/g,
        (_: string, i: number) => params[i],
      );

    super(`${message}`);

    this.index = startindex;
    this.line = line;
    this.column = column;
    this.description = message;
    this.loc = {
      line,
      column,
    };
  }
}
