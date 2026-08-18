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

  // The renderer used to walk an array element with `for (const subKey in item)`, which
  // yields nothing for a primitive - so these values were signed but never displayed.
  it('should render the values of a top-level array of primitives', () => {
    const input = {
      domain: { name: 'TestDomain' },
      message: {
        amounts: [1000000, 2000000],
      },
    };

    const output = beautifyComplexMessage(input);

    expect(output).toContain('0: 𝟭𝟬𝟬𝟬𝟬𝟬𝟬');
    expect(output).toContain('1: 𝟮𝟬𝟬𝟬𝟬𝟬𝟬');
  });

  it('should render a top-level array of structs', () => {
    const input = {
      domain: { name: 'TestDomain' },
      message: {
        recipients: [{ to: '0xabc', amount: 5 }],
      },
    };

    const output = beautifyComplexMessage(input);

    expect(output).toContain('to: 𝟬𝘅𝗮𝗯𝗰');
    expect(output).toContain('amount: 𝟱');
  });

  it('should render nested arrays rather than stopping at a fixed depth', () => {
    const input = {
      domain: { name: 'TestDomain' },
      message: {
        batches: [[7, 8]],
      },
    };

    const output = beautifyComplexMessage(input);

    expect(output).toContain('0: 𝟳');
    expect(output).toContain('1: 𝟴');
  });
});
