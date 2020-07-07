export const isIdentifierPart = (n: number): boolean => {
  switch (true) {
    case n === 36: return true;
    case n >= 48 && n <= 57: return true;
    case n >= 65 && n <= 90: return true;
    case n === 95: return true;
    case n >= 97 && n <= 122: return true;
    default: return false;
  }
};
