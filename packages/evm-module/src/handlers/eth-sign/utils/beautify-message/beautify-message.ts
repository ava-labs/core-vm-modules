/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Renders one field of a typed-data message, at any depth.
 *
 * This used to be a hand-unrolled walk over two levels that assumed every array element was
 * an object: it iterated an element with `for (const subKey in item)`, which yields nothing
 * for a primitive. An array of primitives - a `uint256[]` of amounts, an `address[]` of
 * recipients - therefore printed its indices and no values, so those elements were signed
 * without ever being displayed. Recursing on the value handles primitives, structs, arrays
 * of primitives, arrays of structs and arrays of arrays alike, with no depth assumption.
 */
const renderField = (indent: string, label: string, value: unknown): string => {
  if (Array.isArray(value)) {
    return (
      `${indent}${label}: \n` + value.map((item, index) => renderField(`${indent}  `, String(index), item)).join('')
    );
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    return `${indent}${label}: \n` + entries.map(([key, item]) => renderField(`${indent}  `, key, item)).join('');
  }

  return `${indent}${label}: ${toUnicodeBold(String(value))}\n`;
};

export const beautifyComplexMessage = (data: { domain: Record<string, any>; message: Record<string, any> }) => {
  let result = '';

  result += 'Domain\n';
  for (const key in data.domain) {
    result += `  ${key}: ${toUnicodeBold(String(data.domain[key]))}\n`;
  }

  result += '\nMessage\n';
  for (const key in data.message) {
    result += renderField('  ', key, data.message[key]);
  }

  return result;
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
    result += `${toUnicodeBold(String(item.value))}\n\n`;
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
