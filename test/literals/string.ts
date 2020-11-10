import * as assert from 'assert';

import { fail, failViaScan } from '../tester'
import { Token } from '../../src/tokenizer/token';
import { Context } from '../../src/parser/type'
import createParserState from '../../src/parser/createParserState';
import { scan } from '../../src/tokenizer/scanner';

function process(
  tokenList: any[][],
  tokenType = Token.Identifier,
): [Token, string, string][] {
  const [unicode, character] = tokenList;
  return unicode.map((item, index) => [tokenType, item, character[index]]);
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

const DIGITS = [
  [
    '\u0030',
    '\u0031',
    '\u0032',
    '\u0033',
    '\u0034',
    '\u0035',
    '\u0036',
    '\u0037',
    '\u0038',
    '\u0039',
  ],
  ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
];

const HEX_ENGLISH_CAPITAL_ALPHABET = [
  ["\x41", "\x42", "\x43", "\x44", "\x45", "\x46", "\x47", "\x48", "\x49", "\x4A", "\x4B", "\x4C", "\x4D", "\x4E", "\x4F", "\x50", "\x51", "\x52", "\x53", "\x54", "\x55", "\x56", "\x57", "\x58", "\x59", "\x5A"],
  ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
]
const HEX_ENGLISH_SMALL_ALPHABET = [
  ["\x61", "\x62", "\x63", "\x64", "\x65", "\x66", "\x67", "\x68", "\x69", "\x6A", "\x6B", "\x6C", "\x6D", "\x6E", "\x6F", "\x70", "\x71", "\x72", "\x73", "\x74", "\x75", "\x76", "\x77", "\x78", "\x79", "\x7A"],
  ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]
]

const UNICODE_ENGLISH_CAPITAL_ALPHABET = [
  ["\u0041", "\u0042", "\u0043", "\u0044", "\u0045", "\u0046", "\u0047", "\u0048", "\u0049", "\u004A", "\u004B", "\u004C", "\u004D", "\u004E", "\u004F", "\u0050", "\u0051", "\u0052", "\u0053", "\u0054", "\u0055", "\u0056", "\u0057", "\u0058", "\u0059", "\u005A"],
  ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
]
const UNICODE_ENGLISH_SMALL_ALPHABET = [
  ["\u0061", "\u0062", "\u0063", "\u0064", "\u0065", "\u0066", "\u0067", "\u0068", "\u0069", "\u006A", "\u006B", "\u006C", "\u006D", "\u006E", "\u006F", "\u0070", "\u0071", "\u0072", "\u0073", "\u0074", "\u0075", "\u0076", "\u0077", "\u0078", "\u0079", "\u007A"],
  ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]
]

describe('String', () => {
  const tokens: [Token, string, string][] = [
    [Token.StringLiteral, '"nan"', 'nan'],
    [Token.StringLiteral, '"yang"', 'yang'],
    ...process(ENGLISH_CAPITAL_ALPHABET),
    ...process(ENGLISH_SMALL_ALPHABET),
    ...process(HEX_ENGLISH_CAPITAL_ALPHABET),
    ...process(HEX_ENGLISH_SMALL_ALPHABET),
    ...process(UNICODE_ENGLISH_CAPITAL_ALPHABET),
    ...process(UNICODE_ENGLISH_SMALL_ALPHABET),
    ...process(DIGITS, Token.NumericLiteral),
    [Token.StringLiteral, '"\'"', "'"],
    [Token.StringLiteral, "'\"'", '"'],
    [Token.StringLiteral, '"\\A"', 'A'],
    [Token.StringLiteral, '"\\a"', 'a'],
    [Token.StringLiteral, '"\\b"', "\b"],
    [Token.StringLiteral, '"\\f"', "\f"],
    [Token.StringLiteral, '"\\n"', "\n"],
    [Token.StringLiteral, '"\\r"', "\r"],
    [Token.StringLiteral, '"\\t"', "\t"],
    [Token.StringLiteral, '"\\v"', "\v"],
    [Token.StringLiteral, '"\u0000"', "\0"],
    [Token.StringLiteral, '"\x00"', "\0"],
    [Token.StringLiteral, '"\\08"', '\u00008'],
    [Token.StringLiteral, '"\\052"', '*'],
    [Token.StringLiteral, '"\\052"', '*'],
    [Token.StringLiteral, '""', ""],
    [Token.StringLiteral, '"\"', ""],
    [Token.StringLiteral, '"\ "', ""],
    [Token.StringLiteral, `"\
    "`, "    "],
    [Token.StringLiteral, "''", ''],
    [Token.StringLiteral, "'\'", ''],
    [Token.StringLiteral, "'\ '", ''],
    [Token.StringLiteral, `'\
    '`, '    '],  
    [Token.StringLiteral, '"\\u2028"', '\u2028'],
    [Token.StringLiteral, '"\\u180E"', '᠎'],
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

  fail('fails on  Missing expected exception', [
    ['"""', Context.Empty,],
    ["'''", Context.Empty,],
    ['"\\"', Context.Empty,],
    ["'\\'", Context.Empty,],
  ]);
  failViaScan('fails on "\\\"', '"\\\"');
  failViaScan('fails on "\\u000G"', '"\\u000G"');
  failViaScan('fails on "\\u{1F_639}"', '"\\u{1F_639}"');
  failViaScan("fails on '\\u{1F_639}'", "'\\u{1F_639}'");
  failViaScan('fails on "\\u"', '"\\u"');
  failViaScan("fails on '\\u'", "'\\u'");
  failViaScan('fails on "\\8"', '"\\8"');
  failViaScan('fails on "\\9', '"\\9"');
  
  failViaScan("fails on '\\\'", "'\\\'");
  failViaScan(
    `fails on "
    "`,
    `"
  "`,
  );
  failViaScan(
    `fails on '
    '`,
    `'
    '`,
    );
    
    // Strict Mode:
    // failViaScan('fails on "\\1"', '"\\1"');
    // failViaScan('fails on "\\7"', '"\\7"');
    // failViaScan('fails on "\\1"', '"\\1"');

});
