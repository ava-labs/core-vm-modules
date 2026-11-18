import { beautifyComplexMessage, beautifySimpleMessage } from './beautify-message';

describe('beautifySimpleMessage', () => {
  it('should correctly format a simple message (typed data v1)', () => {
    const input = [
      { name: 'Name', type: 'string', value: 'John Doe' },
      { name: 'Age', type: 'number', value: 30 },
    ];
    const expectedOutput = `Name:\n𝗝𝗼𝗵𝗻 𝗗𝗼𝗲\n\nAge:\n𝟯𝟬\n\n`;
    expect(beautifySimpleMessage(input)).toEqual(expectedOutput);
  });
});

describe('beautifyComplexMessage', () => {
  it('should correctly format a complex message', () => {
    const input = {
      domain: { name: 'TestDomain', id: '123' },
      message: {
        title: 'TestTitle',
        details: {
          date: '2023-04-01',
          items: ['item1', 'item2'],
        },
      },
    };
    const expectedOutput = `Domain\n  name: 𝗧𝗲𝘀𝘁𝗗𝗼𝗺𝗮𝗶𝗻\n  id: 𝟭𝟮𝟯\n\nMessage\n  title: 𝗧𝗲𝘀𝘁𝗧𝗶𝘁𝗹𝗲\n  details: \n    date: 𝟮𝟬𝟮𝟯-𝟬𝟰-𝟬𝟭\n    items: \n      0: 𝗶𝘁𝗲𝗺𝟭\n      1: 𝗶𝘁𝗲𝗺𝟮\n`;
    expect(beautifyComplexMessage(input)).toEqual(expectedOutput);
  });
});

// Strips the mathematical bold glyphs back to ASCII so expectations stay readable.
const BOLD_DIGIT_ZERO = 0x1d7ec;
const BOLD_LOWER_A = 0x1d5ee;
const BOLD_UPPER_A = 0x1d5d4;
const unbold = (text: string) =>
  Array.from(text)
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (code >= BOLD_DIGIT_ZERO && code < BOLD_DIGIT_ZERO + 10)
        return String.fromCharCode(48 + code - BOLD_DIGIT_ZERO);
      if (code >= BOLD_LOWER_A && code < BOLD_LOWER_A + 26) return String.fromCharCode(97 + code - BOLD_LOWER_A);
      if (code >= BOLD_UPPER_A && code < BOLD_UPPER_A + 26) return String.fromCharCode(65 + code - BOLD_UPPER_A);
      return char;
    })
    .join('');

describe('beautifyComplexMessage (nested typed data)', () => {
  const domain = {
    name: 'Permit2',
    chainId: 1,
    verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  };

  it('always shows every domain field including verifyingContract and numeric chainId', () => {
    const output = unbold(beautifyComplexMessage({ domain, message: {} }));

    expect(output).toBe(
      'Domain\n' +
        '  name: Permit2\n' +
        '  chainId: 1\n' +
        '  verifyingContract: 0x000000000022D473030F116dDEE9F6B43aC78BA3\n' +
        '\nMessage\n',
    );
  });

  it('renders objects nested four levels deep without "[object Object]"', () => {
    const output = unbold(
      beautifyComplexMessage({
        domain,
        message: { level1: { level2: { level3: { level4: { value: 'deep', amount: 42 } } } } },
      }),
    );

    expect(output).not.toContain('[object Object]');
    expect(output).toContain(
      'Message\n' +
        '  level1: \n' +
        '    level2: \n' +
        '      level3: \n' +
        '        level4: \n' +
        '          value: deep\n' +
        '          amount: 42\n',
    );
  });

  it('renders arrays of numbers, booleans and bigints without throwing', () => {
    const render = () =>
      beautifyComplexMessage({
        domain,
        message: { ids: [1, 2, 3], flags: [true, false], amounts: [10n ** 20n], nested: { ids: [7, 8] } },
      });

    expect(render).not.toThrow();
    expect(unbold(render())).toContain(
      'Message\n' +
        '  ids: \n' +
        '    0: 1\n' +
        '    1: 2\n' +
        '    2: 3\n' +
        '  flags: \n' +
        '    0: true\n' +
        '    1: false\n' +
        '  amounts: \n' +
        '    0: 100000000000000000000\n' +
        '  nested: \n' +
        '    ids: \n' +
        '      0: 7\n' +
        '      1: 8\n',
    );
  });

  it('renders top-level and nested arrays of structs with every field', () => {
    const output = unbold(
      beautifyComplexMessage({
        domain,
        message: {
          recipients: [
            { to: '0xaaaa', amount: 1, tags: ['a'] },
            { to: '0xbbbb', amount: 2, tags: [] },
          ],
          wrapper: { orders: [{ id: 9, inner: { ok: true } }] },
        },
      }),
    );

    expect(output).toContain(
      '  recipients: \n' +
        '    0: \n' +
        '      to: 0xaaaa\n' +
        '      amount: 1\n' +
        '      tags: \n' +
        '        0: a\n' +
        '    1: \n' +
        '      to: 0xbbbb\n' +
        '      amount: 2\n' +
        '      tags: []\n' +
        '  wrapper: \n' +
        '    orders: \n' +
        '      0: \n' +
        '        id: 9\n' +
        '        inner: \n' +
        '          ok: true\n',
    );
  });

  it('shows null, undefined and empty values instead of hiding them', () => {
    const output = unbold(beautifyComplexMessage({ domain: {}, message: { a: null, b: undefined, c: {}, d: '' } }));

    expect(output).toBe('Domain\n\nMessage\n  a: null\n  b: undefined\n  c: {}\n  d: \n');
  });

  it('renders a non-object message as a single value instead of iterating its characters', () => {
    expect(unbold(beautifyComplexMessage({ domain: {}, message: 'test' }))).toBe('Domain\n\nMessage\n  test\n');
  });

  it('does not crash when the domain is missing', () => {
    expect(unbold(beautifyComplexMessage({ message: { a: 1 } } as never))).toBe('Domain\n\nMessage\n  a: 1\n');
  });

  it('stops at circular references', () => {
    const message: Record<string, unknown> = { a: 1 };
    message.self = message;

    expect(unbold(beautifyComplexMessage({ domain: {}, message }))).toBe(
      'Domain\n\nMessage\n  a: 1\n  self: [nested too deeply]\n',
    );
  });

  it('renders a full Permit2 PermitBatchWitnessTransferFrom (UniswapX-style) payload', () => {
    const output = unbold(
      beautifyComplexMessage({
        domain,
        message: {
          permitted: [
            { token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', amount: '1000000' },
            { token: '0xdAC17F958D2ee523a2206206994597C13D831ec7', amount: 2500000n },
          ],
          spender: '0x6000da47483062A0D734Ba3dc7576Ce6A0B645C4',
          nonce: 1993350500677478400n,
          deadline: 1718000000,
          witness: {
            info: {
              reactor: '0x6000da47483062A0D734Ba3dc7576Ce6A0B645C4',
              swapper: '0x1111111111111111111111111111111111111111',
              nonce: '1993350500677478400',
              deadline: 1718000000,
              additionalValidationContract: '0x0000000000000000000000000000000000000000',
              additionalValidationData: '0x',
            },
            decayStartTime: 1717999000,
            decayEndTime: 1718000000,
            exclusiveFiller: '0x0000000000000000000000000000000000000000',
            exclusivityOverrideBps: 0,
            inputToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            inputStartAmount: '1000000',
            inputEndAmount: '1000000',
            outputs: [
              {
                token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                startAmount: '300000000000000',
                endAmount: '290000000000000',
                recipient: '0x1111111111111111111111111111111111111111',
              },
            ],
          },
        },
      }),
    );

    expect(output).not.toContain('[object Object]');
    expect(output).toContain('  verifyingContract: 0x000000000022D473030F116dDEE9F6B43aC78BA3\n');
    expect(output).toContain(
      '  permitted: \n' +
        '    0: \n' +
        '      token: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48\n' +
        '      amount: 1000000\n' +
        '    1: \n' +
        '      token: 0xdAC17F958D2ee523a2206206994597C13D831ec7\n' +
        '      amount: 2500000\n',
    );
    expect(output).toContain('  nonce: 1993350500677478400\n  deadline: 1718000000\n');
    expect(output).toContain(
      '    info: \n      reactor: 0x6000da47483062A0D734Ba3dc7576Ce6A0B645C4\n' +
        '      swapper: 0x1111111111111111111111111111111111111111\n',
    );
    expect(output).toContain(
      '    outputs: \n' +
        '      0: \n' +
        '        token: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2\n' +
        '        startAmount: 300000000000000\n' +
        '        endAmount: 290000000000000\n' +
        '        recipient: 0x1111111111111111111111111111111111111111\n',
    );
  });
});

describe('beautifySimpleMessage (non-string values)', () => {
  it('coerces bigint, boolean and null values', () => {
    expect(
      unbold(
        beautifySimpleMessage([
          { name: 'big', type: 'uint256', value: 10n },
          { name: 'flag', type: 'bool', value: true },
          { name: 'none', type: 'string', value: null },
        ]),
      ),
    ).toBe('big:\n10\n\nflag:\ntrue\n\nnone:\nnull\n\n');
  });
});
