import * as assert from 'assert';

import { Token } from '../src/tokenizer/token';
import createParserState from '../src/parser/createParserState';
import { scan } from '../src/tokenizer/scanner';

function fail(name: string, source: string) {
  it(name, () => {
    const state = createParserState(source);
    assert.rejects(async () => scan(state));
  });
}

// ENGLISH CAPITAL ALPHABET
const ENGLISH_CAPITAL_ALPHABET = [
  [
    '\u0041',
    '\u0042',
    '\u0043',
    '\u0044',
    '\u0045',
    '\u0046',
    '\u0047',
    '\u0048',
    '\u0049',
    '\u004A',
    '\u004B',
    '\u004C',
    '\u004D',
    '\u004E',
    '\u004F',
    '\u0050',
    '\u0051',
    '\u0052',
    '\u0053',
    '\u0054',
    '\u0055',
    '\u0056',
    '\u0057',
    '\u0058',
    '\u0059',
    '\u005A',
  ],
  [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
  ],
];

const ENGLISH_SMALL_ALPHABET = [
  [
    '\u0061',
    '\u0062',
    '\u0063',
    '\u0064',
    '\u0065',
    '\u0066',
    '\u0067',
    '\u0068',
    '\u0069',
    '\u006A',
    '\u006B',
    '\u006C',
    '\u006D',
    '\u006E',
    '\u006F',
    '\u0070',
    '\u0071',
    '\u0072',
    '\u0073',
    '\u0074',
    '\u0075',
    '\u0076',
    '\u0077',
    '\u0078',
    '\u0079',
    '\u007A',
  ],
  [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
  ],
];

describe('String', () => {
  const ENGLISH_CAPITAL_ALPHABET_TOKEN: [
    Token,
    string,
    string,
  ][] = ENGLISH_CAPITAL_ALPHABET[0].map((item, index) => {
    return [Token.Identifier, item, ENGLISH_CAPITAL_ALPHABET[1][index]];
  });
  const ENGLISH_SMALL_ALPHABET_TOKEN: [
    Token,
    string,
    string,
  ][] = ENGLISH_SMALL_ALPHABET[0].map((item, index) => {
    return [Token.Identifier, item, ENGLISH_SMALL_ALPHABET[1][index]];
  });

  const tokens: [Token, string, string][] = [
    [Token.StringLiteral, '"foo"', 'foo'],
    [Token.StringLiteral, '"foo"', 'foo'],
    ...ENGLISH_CAPITAL_ALPHABET_TOKEN,
    ...ENGLISH_SMALL_ALPHABET_TOKEN,
  ];

  for (const [token, op, value] of tokens) {
    it(`scans '${op}' at the end`, () => {
      const state = createParserState(op);
      const found = scan(state);

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

    it(`scans '${op}' with more to go`, () => {
      const state = createParserState(`${op} `);
      const found = scan(state);

      assert.deepEqual(
        {
          token: found,
          hasNext: state.index < state.source.length,
          value: state.tokenValue,
          index: state.index,
        },
        {
          token,
          hasNext: true,
          value,
          index: op.length,
        },
      );
    });
  }

  fail('fails on """', '"""');
  fail("fails on '''", "'''");
  fail(
    `fails on "
    "`,
    `"
  "`,
  );
  fail(
    `fails on '
    '`,
    `'
  '`,
  );
});
