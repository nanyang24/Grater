import parserMachine from '../src/grater';
import createParserState from '../src/parser/createParserState';
import { scan } from '../src/tokenizer/scanner';
import { Context } from '../src/parser/type';
import * as t from 'assert';

export const pass = (name: string, valids: [string, Context, any][]) => {
  describe(name, () => {
    for (const [source, ctx, expected] of valids) {
      it(source, () => {
        const parser = parserMachine(source, ctx);
        t.deepStrictEqual(parser, expected);
      });
    }
  });
};

export const fail = (name: string, invalid: [string, Context][]) => {
  describe(name, () => {
    for (const [source, ctx] of invalid) {
      it(source, () => {
        t.throws(() => {
            parserMachine(source, ctx);
        });
      });
    }
  });
};

export const failViaScan = (name: string, source: string, context: Context) => {
  it(name, () => {
    const state = createParserState(source);
    t.throws(() => scan(state, context));
  });
}
