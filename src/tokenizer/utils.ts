import { Token } from './token';
import { IParserState } from '../parser/type';

// ASCII Table map to Token
export const TokenPickUpFromASCII = [
  /*   0 - Null               */ Token.Unknown,
  /*   1 - Start of Heading   */ Token.Unknown,
  /*   2 - Start of Text      */ Token.Unknown,
  /*   3 - End of Text        */ Token.Unknown,
  /*   4 - End of Transm.     */ Token.Unknown,
  /*   5 - Enquiry            */ Token.Unknown,
  /*   6 - Acknowledgment     */ Token.Unknown,
  /*   7 - Bell               */ Token.Unknown,
  /*   8 - Backspace          */ Token.Unknown,
  /*   9 - Horizontal Tab     */ Token.WhiteSpace,
  /*  10 - Line Feed          */ Token.LineFeed,
  /*  11 - Vertical Tab       */ Token.WhiteSpace,
  /*  12 - Form Feed          */ Token.WhiteSpace,
  /*  13 - Carriage Return    */ Token.CarriageReturn,
  /*  14 - Shift Out          */ Token.Unknown,
  /*  15 - Shift In           */ Token.Unknown,
  /*  16 - Data Line Escape   */ Token.Unknown,
  /*  17 - Device Control 1   */ Token.Unknown,
  /*  18 - Device Control 2   */ Token.Unknown,
  /*  19 - Device Control 3   */ Token.Unknown,
  /*  20 - Device Control 4   */ Token.Unknown,
  /*  21 - Negative Ack.      */ Token.Unknown,
  /*  22 - Synchronous Idle   */ Token.Unknown,
  /*  23 - End of Transmit    */ Token.Unknown,
  /*  24 - Cancel             */ Token.Unknown,
  /*  25 - End of Medium      */ Token.Unknown,
  /*  26 - Substitute         */ Token.Unknown,
  /*  27 - Escape             */ Token.Unknown,
  /*  28 - File Separator     */ Token.Unknown,
  /*  29 - Group Separator    */ Token.Unknown,
  /*  30 - Record Separator   */ Token.Unknown,
  /*  31 - Unit Separator     */ Token.Unknown,
  /*  32 - Space              */ Token.WhiteSpace,
  /*  33 - !                  */ Token.Negate,
  /*  34 - "                  */ Token.StringLiteral,
  /*  35 - #                  */ Token.PrivateField,
  /*  36 - $                  */ Token.Identifier,
  /*  37 - %                  */ Token.Modulo,
  /*  38 - &                  */ Token.BitwiseAnd,
  /*  39 - '                  */ Token.StringLiteral,
  /*  40 - (                  */ Token.LeftParen,
  /*  41 - )                  */ Token.RightParen,
  /*  42 - *                  */ Token.Multiply,
  /*  43 - +                  */ Token.Add,
  /*  44 - ,                  */ Token.Comma,
  /*  45 - -                  */ Token.Subtract,
  /*  46 - .                  */ Token.Period,
  /*  47 - /                  */ Token.Divide,
  /*  48 - 0                  */ Token.NumericLiteral,
  /*  49 - 1                  */ Token.NumericLiteral,
  /*  50 - 2                  */ Token.NumericLiteral,
  /*  51 - 3                  */ Token.NumericLiteral,
  /*  52 - 4                  */ Token.NumericLiteral,
  /*  53 - 5                  */ Token.NumericLiteral,
  /*  54 - 6                  */ Token.NumericLiteral,
  /*  55 - 7                  */ Token.NumericLiteral,
  /*  56 - 8                  */ Token.NumericLiteral,
  /*  57 - 9                  */ Token.NumericLiteral,
  /*  58 - :                  */ Token.Colon,
  /*  59 - ;                  */ Token.Semicolon,
  /*  60 - <                  */ Token.LessThan,
  /*  61 - =                  */ Token.Assign,
  /*  62 - >                  */ Token.GreaterThan,
  /*  63 - ?                  */ Token.QuestionMark,
  /*  64 - @                  */ Token.Decorator,
  /*  65 - A                  */ Token.Identifier,
  /*  66 - B                  */ Token.Identifier,
  /*  67 - C                  */ Token.Identifier,
  /*  68 - D                  */ Token.Identifier,
  /*  69 - E                  */ Token.Identifier,
  /*  70 - F                  */ Token.Identifier,
  /*  71 - G                  */ Token.Identifier,
  /*  72 - H                  */ Token.Identifier,
  /*  73 - I                  */ Token.Identifier,
  /*  74 - J                  */ Token.Identifier,
  /*  75 - K                  */ Token.Identifier,
  /*  76 - L                  */ Token.Identifier,
  /*  77 - M                  */ Token.Identifier,
  /*  78 - N                  */ Token.Identifier,
  /*  79 - O                  */ Token.Identifier,
  /*  80 - P                  */ Token.Identifier,
  /*  81 - Q                  */ Token.Identifier,
  /*  82 - R                  */ Token.Identifier,
  /*  83 - S                  */ Token.Identifier,
  /*  84 - T                  */ Token.Identifier,
  /*  85 - U                  */ Token.Identifier,
  /*  86 - V                  */ Token.Identifier,
  /*  87 - W                  */ Token.Identifier,
  /*  88 - X                  */ Token.Identifier,
  /*  89 - Y                  */ Token.Identifier,
  /*  90 - Z                  */ Token.Identifier,
  /*  91 - [                  */ Token.LeftBracket,
  /*  92 - \                  */ Token.EscapedIdentifier,
  /*  93 - ]                  */ Token.RightBracket,
  /*  94 - ^                  */ Token.BitwiseXor,
  /*  95 - _                  */ Token.Identifier,
  /*  96 - `                  */ Token.Template,
  /*  97 - a                  */ Token.Keyword,
  /*  98 - b                  */ Token.Keyword,
  /*  99 - c                  */ Token.Keyword,
  /* 100 - d                  */ Token.Keyword,
  /* 101 - e                  */ Token.Keyword,
  /* 102 - f                  */ Token.Keyword,
  /* 103 - g                  */ Token.Keyword,
  /* 104 - h                  */ Token.Identifier,
  /* 105 - i                  */ Token.Keyword,
  /* 106 - j                  */ Token.Identifier,
  /* 107 - k                  */ Token.Identifier,
  /* 108 - l                  */ Token.Keyword,
  /* 109 - m                  */ Token.Identifier,
  /* 110 - n                  */ Token.Keyword,
  /* 111 - o                  */ Token.Identifier,
  /* 112 - p                  */ Token.Keyword,
  /* 113 - q                  */ Token.Identifier,
  /* 114 - r                  */ Token.Keyword,
  /* 115 - s                  */ Token.Keyword,
  /* 116 - t                  */ Token.Keyword,
  /* 117 - u                  */ Token.Identifier,
  /* 118 - v                  */ Token.Keyword,
  /* 119 - w                  */ Token.Keyword,
  /* 120 - x                  */ Token.Identifier,
  /* 121 - y                  */ Token.Keyword,
  /* 122 - z                  */ Token.Keyword,
  /* 123 - {                  */ Token.LeftBrace,
  /* 124 - |                  */ Token.BitwiseOr,
  /* 125 - }                  */ Token.RightBrace,
  /* 126 - ~                  */ Token.Complement,
  /* 127 - Delete             */ Token.Unknown,
];

export const forwardChar = (parser: IParserState): number => (
  (++parser.column) && (parser.currentChar = parser.source.charCodeAt(++parser.index))
);