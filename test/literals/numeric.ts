import * as assert from 'assert';

import { fail, failViaScan } from '../tester'
import { Token } from '../../src/tokenizer/token';
import { Context } from '../../src/parser/type'
import createParserState from '../../src/parser/createParserState';
import { scan } from '../../src/tokenizer/scanner';

describe('Numeric', () => {


    const tokens:[Token, string, number][] = [
        [Token.NumericLiteral, '0', 0,],
        [Token.NumericLiteral, '1', 1,],
        [Token.NumericLiteral, '24', 24,],
        [Token.NumericLiteral, '8', 8,],
        [Token.NumericLiteral, '9', 9,],
        [Token.NumericLiteral, '0e1', 0,],
        [Token.NumericLiteral, '1e1', 10,],
        [Token.NumericLiteral, '8e1', 80,],
        [Token.NumericLiteral, '9e1', 90,],
        [Token.NumericLiteral, '0E1', 0,],
        [Token.NumericLiteral, '1E1', 10,],
        [Token.NumericLiteral, '8E1', 80,],
        [Token.NumericLiteral, '9E1', 90,],
        [Token.NumericLiteral, '0e+1', 0,],
        [Token.NumericLiteral, '0E+1', 0,],
        [Token.NumericLiteral, '8e+1', 80,],
        [Token.NumericLiteral, '0E-1', 0,],
        [Token.NumericLiteral, '9E-1', 0.9,],
        [Token.NumericLiteral, '0e0', 0,],
        [Token.NumericLiteral, '9e0', 9,],
        [Token.NumericLiteral, '0E0', 0,],
        [Token.NumericLiteral, '9E0', 9,],
        [Token.NumericLiteral, '.0', 0.0,],
        [Token.NumericLiteral, '.9', 0.9,],
        [Token.NumericLiteral, '.00', 0.00,],
        [Token.NumericLiteral, '.99', 0.99,],
        [Token.NumericLiteral, '.10', 0.10,],
        [Token.NumericLiteral, '.0e1', 0,],
        [Token.NumericLiteral, '.9e1', 9,],
        [Token.NumericLiteral, '.0E1', 0,],
        [Token.NumericLiteral, '.9E1', 9,],
        [Token.NumericLiteral, '.0e-1', 0,],
        [Token.NumericLiteral, '.9e-1', 0.09,],
        [Token.NumericLiteral, '.0E-1', 0,],
        [Token.NumericLiteral, '.9E-1', 0.09,],
        [Token.NumericLiteral, '.9e+1', 9,],
        [Token.NumericLiteral, '.0E+1', 0,],
        [Token.NumericLiteral, '.9E+1', 9,],
        [Token.NumericLiteral, '.0e0', 0,],
        [Token.NumericLiteral, '.0E0', 0,],
        [Token.NumericLiteral, '.9e0', 0.9,],
        [Token.NumericLiteral, '.9E0', 0.9,],
        [Token.NumericLiteral, '0.', 0,],
        [Token.NumericLiteral, '9.', 9,],
        [Token.NumericLiteral, '0.e1', 0,],
        [Token.NumericLiteral, '0.E1', 0,],
        [Token.NumericLiteral, '9.e1', 90,],
        [Token.NumericLiteral, '9.E1', 90,],
        [Token.NumericLiteral, '11.', 11,],
        [Token.NumericLiteral, '99.', 99,],
        [Token.NumericLiteral, '0e01', 0,],
        [Token.NumericLiteral, '9e01', 90,],
        [Token.NumericLiteral, '0x0', 0,],
        [Token.NumericLiteral, '0x7', 7,],
        [Token.NumericLiteral, '0x8', 8,],
        [Token.NumericLiteral, '0x9', 9,],
        [Token.NumericLiteral, '0xA', 10,],
        [Token.NumericLiteral, '0xB', 11,],
        [Token.NumericLiteral, '0xC', 12,],
        [Token.NumericLiteral, '0xD', 13,],
        [Token.NumericLiteral, '0xE', 14,],
        [Token.NumericLiteral, '0xF', 15,],
        [Token.NumericLiteral, '0X0', 0,],
        [Token.NumericLiteral, '0X7', 7,],
        [Token.NumericLiteral, '0X8', 8,],
        [Token.NumericLiteral, '0X9', 9,],
        [Token.NumericLiteral, '0XA', 10,],
        [Token.NumericLiteral, '0XB', 11,],
        [Token.NumericLiteral, '0XC', 12,],
        [Token.NumericLiteral, '0XD', 13,],
        [Token.NumericLiteral, '0XE', 14,],
        [Token.NumericLiteral, '0XF', 15,],
        [Token.NumericLiteral, '0x10', 16,],
        [Token.NumericLiteral, '0x100000', 1048576,],
        [Token.NumericLiteral, '0x00', 0,],
        [Token.NumericLiteral, '0x0100', 256,],
        [Token.NumericLiteral, '0xa', 10,],
        [Token.NumericLiteral, '0xb', 11,],
        [Token.NumericLiteral, '0xc', 12,],
        [Token.NumericLiteral, '0xd', 13,],
        [Token.NumericLiteral, '0xe', 14,],
        [Token.NumericLiteral, '0xf', 15,],
        [Token.NumericLiteral, '0o0', 0,],
        [Token.NumericLiteral, '0o7', 7,],
        [Token.NumericLiteral, '0o10', 8,],
        [Token.NumericLiteral, '0b0', 0,],
        [Token.NumericLiteral, '0b10', 2,],
        [Token.NumericLiteral, '0b11', 3,],
    ]


    for (const [token, op, value] of tokens) {
        it(`scans '${op}' at the end`, () => {
          const state = createParserState(op);
          const found = scan(state, Context.Empty);
    
          assert.deepEqual(
            {
              token: found,
              hasNext: state.index < state.source.length,
              value: state.tokenValue,
              index: state.index,
            },
            {
              token,
              hasNext: false,
              value,
              index: op.length,
            },
          );
        });
    }


  failViaScan('fails on "0x"', '0x', Context.Empty);
  failViaScan('fails on "0xG"', '0xG', Context.Empty);
  failViaScan('fails on "0Xg"', '0Xg', Context.Empty);
  failViaScan('fails on "0X"', '0X', Context.Empty);
  failViaScan('fails on "0o"', '0o', Context.Empty);
  failViaScan('fails on "0o8"', '0o8', Context.Empty);
  failViaScan('fails on "0b2"', '0b2', Context.Empty);
  // failViaScan('fails on "00b0"', '00b0', Context.Empty);
  failViaScan('fails on "0b"', '0b', Context.Empty);

  // Strict
    //  failViaScan('fails on "00"', '00');
    //  failViaScan('fails on "000"', '000');
    //  failViaScan('fails on "01"', '01');
    //  failViaScan('fails on "005"', '005');
    //  failViaScan('fails on "06"', '06');
    //  failViaScan('fails on "07"', '07');
    //  failViaScan('fails on "08"', '08');
    //  failViaScan('fails on "010"', '010');

})