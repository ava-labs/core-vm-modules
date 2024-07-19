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
