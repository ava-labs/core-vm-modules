/* eslint-disable @typescript-eslint/no-explicit-any */
const INDENT = '  ';
// Typed data comes from the dApp; bound the recursion so a pathological payload cannot hang the approval.
const MAX_DEPTH = 32;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Coerces any leaf value (string, number, bigint, boolean, null, undefined, ...) into a printable string.
const formatPrimitive = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return '[function]';
  return String(value);
};

const isEmptyContainer = (value: unknown): boolean =>
  (Array.isArray(value) && value.length === 0) || (isPlainObject(value) && Object.keys(value).length === 0);

/**
 * Renders the entries of an object or array, one line per leaf, recursing into nested structs and arrays at any
 * depth. Array elements are labelled with their index. Containers print `key: ` on their own line and indent their
 * children by one more level; empty containers print `[]` / `{}` so they are not silently hidden.
 */
const renderEntries = (value: Record<string, unknown> | unknown[], depth: number, seen: Set<unknown>): string => {
  const indent = INDENT.repeat(depth);
  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);

  let result = '';

  for (const [key, item] of entries) {
    if (isEmptyContainer(item)) {
      result += `${indent}${key}: ${Array.isArray(item) ? '[]' : '{}'}\n`;
    } else if (Array.isArray(item) || isPlainObject(item)) {
      if (seen.has(item) || depth >= MAX_DEPTH) {
        result += `${indent}${key}: [nested too deeply]\n`;
        continue;
      }
      seen.add(item);
      result += `${indent}${key}: \n${renderEntries(item, depth + 1, seen)}`;
      seen.delete(item);
    } else {
      result += `${indent}${key}: ${toUnicodeBold(formatPrimitive(item))}\n`;
    }
  }

  return result;
};

const renderSection = (value: unknown): string => {
  if (Array.isArray(value) || isPlainObject(value)) {
    return renderEntries(value, 1, new Set([value]));
  }
  // A non-object message (e.g. a bare string) is shown as a single value rather than iterated character by character.
  return value === undefined ? '' : `${INDENT}${toUnicodeBold(formatPrimitive(value))}\n`;
};

/**
 * Formats EIP-712 typed data (domain + message) for display. Every domain field, including `verifyingContract`, and
 * every message field at any depth is shown in full.
 */
export const beautifyComplexMessage = (data: { domain?: Record<string, any>; message: unknown }) => {
  return `Domain\n${renderSection(data.domain)}\nMessage\n${renderSection(data.message)}`;
};

export const beautifySimpleMessage = (
  data: {
    name: string;
    type: string;
    value: any;
  }[],
) => {
  let result = '';

  data.forEach((item) => {
    result += `${item.name}:\n`;
    result += `${toUnicodeBold(formatPrimitive(item.value))}\n\n`;
  });

  return result;
};

const toUnicodeBold = (str: string) => {
  const boldMap: Record<string, string> = {
    '0': '𝟬',
    '1': '𝟭',
    '2': '𝟮',
    '3': '𝟯',
    '4': '𝟰',
    '5': '𝟱',
    '6': '𝟲',
    '7': '𝟳',
    '8': '𝟴',
    '9': '𝟵',
    a: '𝗮',
    b: '𝗯',
    c: '𝗰',
    d: '𝗱',
    e: '𝗲',
    f: '𝗳',
    g: '𝗴',
    h: '𝗵',
    i: '𝗶',
    j: '𝗷',
    k: '𝗸',
    l: '𝗹',
    m: '𝗺',
    n: '𝗻',
    o: '𝗼',
    p: '𝗽',
    q: '𝗾',
    r: '𝗿',
    s: '𝘀',
    t: '𝘁',
    u: '𝘂',
    v: '𝘃',
    w: '𝘄',
    x: '𝘅',
    y: '𝘆',
    z: '𝘇',
    A: '𝗔',
    B: '𝗕',
    C: '𝗖',
    D: '𝗗',
    E: '𝗘',
    F: '𝗙',
    G: '𝗚',
    H: '𝗛',
    I: '𝗜',
    J: '𝗝',
    K: '𝗞',
    L: '𝗟',
    M: '𝗠',
    N: '𝗡',
    O: '𝗢',
    P: '𝗣',
    Q: '𝗤',
    R: '𝗥',
    S: '𝗦',
    T: '𝗧',
    U: '𝗨',
    V: '𝗩',
    W: '𝗪',
    X: '𝗫',
    Y: '𝗬',
    Z: '𝗭',
  };

  return str
    .split('')
    .map((char) => boldMap[char] || char)
    .join('');
};
