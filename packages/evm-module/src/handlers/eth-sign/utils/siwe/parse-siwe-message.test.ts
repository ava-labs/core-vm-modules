import { parseSiweMessage, parseSiweMessageStrict } from './parse-siwe-message';

const ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

const VALID_SIWE_MESSAGE = `example.com wants you to sign in with your Ethereum account:
${ADDRESS}

Sign in to Example App

URI: https://example.com/login
Version: 1
Chain ID: 1
Nonce: 32891756
Issued At: 2021-09-30T16:25:24Z`;

const MINIMAL_SIWE_MESSAGE = `example.com wants you to sign in with your Ethereum account:
${ADDRESS}

URI: https://example.com/login
Version: 1
Chain ID: 1
Nonce: abc12345
Issued At: 2021-09-30T16:25:24Z`;

const FULL_SIWE_MESSAGE = `example.com wants you to sign in with your Ethereum account:
${ADDRESS}

I accept the Terms of Service: https://example.com/tos

URI: https://example.com/login
Version: 1
Chain ID: 1
Nonce: 32891756
Issued At: 2021-09-30T16:25:24Z
Expiration Time: 2021-10-01T16:25:24Z
Not Before: 2021-09-30T16:25:24Z
Request ID: some-request-id
Resources:
- https://example.com/resource1
- https://example.com/resource2`;

describe('parseSiweMessage', () => {
  it('parses a valid SIWE message with a statement', () => {
    expect(parseSiweMessage(VALID_SIWE_MESSAGE)).toEqual({
      domain: 'example.com',
      address: ADDRESS,
      statement: 'Sign in to Example App',
      uri: 'https://example.com/login',
      version: '1',
      chainId: '1',
      nonce: '32891756',
      issuedAt: '2021-09-30T16:25:24Z',
      expirationTime: undefined,
      notBefore: undefined,
      requestId: undefined,
      resources: undefined,
    });
  });

  it('parses a minimal SIWE message without a statement', () => {
    const result = parseSiweMessage(MINIMAL_SIWE_MESSAGE);
    expect(result?.domain).toBe('example.com');
    expect(result?.statement).toBeUndefined();
  });

  it('parses the strict ABNF form with an empty statement section (three line feeds)', () => {
    const message = MINIMAL_SIWE_MESSAGE.replace(`${ADDRESS}\n\n`, `${ADDRESS}\n\n\n`);
    expect(parseSiweMessage(message)?.uri).toBe('https://example.com/login');
  });

  it('parses all optional fields', () => {
    const result = parseSiweMessage(FULL_SIWE_MESSAGE);
    expect(result?.expirationTime).toBe('2021-10-01T16:25:24Z');
    expect(result?.notBefore).toBe('2021-09-30T16:25:24Z');
    expect(result?.requestId).toBe('some-request-id');
    expect(result?.resources).toEqual(['https://example.com/resource1', 'https://example.com/resource2']);
  });

  it('keeps the domain authority as written (port, scheme prefix)', () => {
    expect(parseSiweMessage(MINIMAL_SIWE_MESSAGE.replace('example.com wants', 'localhost:3000 wants'))?.domain).toBe(
      'localhost:3000',
    );
    expect(
      parseSiweMessage(MINIMAL_SIWE_MESSAGE.replace('example.com wants', 'https://example.com wants'))?.domain,
    ).toBe('https://example.com');
  });

  it.each([
    'Hello world',
    '',
    'Please sign this message',
    'example.com wants you to sign in with your Ethereum account',
  ])('returns undefined for the non-SIWE message %p', (message) => {
    expect(parseSiweMessageStrict(message)).toBeUndefined();
    expect(parseSiweMessage(message)).toBeUndefined();
  });

  it('returns undefined when the address in the header is invalid', () => {
    expect(parseSiweMessageStrict(MINIMAL_SIWE_MESSAGE.replace(ADDRESS, '0x1234'))).toBeUndefined();
  });

  it('treats a SIWE header with missing required fields as malformed', () => {
    const incomplete = `example.com wants you to sign in with your Ethereum account:
${ADDRESS}

URI: https://example.com/login
Version: 1`;
    expect(parseSiweMessageStrict(incomplete)).toEqual({ kind: 'malformed', reason: 'invalid or ambiguous fields' });
    expect(parseSiweMessage(incomplete)).toBeUndefined();
  });

  describe('malformed / ambiguous messages', () => {
    const HEADER =
      'victim.com wants you to sign in with your Ethereum account:\n' + '0x0000000000000000000000000000000000000001\n';
    const TAIL = 'Version: 1\nChain ID: 1\nNonce: abc12345\nIssued At: 2026-10-06T00:00:00Z';

    it.each([
      [
        'multi-line statement with blank-line URI',
        HEADER + '\nLegit statement\n\nURI: https://evil.com\n\nURI: https://victim.com\n' + TAIL,
      ],
      ['duplicate URI without blank line', HEADER + '\nURI: https://evil.com\nURI: https://victim.com\n' + TAIL],
      ['CRLF CRLF separator', HEADER + '\nLegit\r\n\r\nURI: https://evil.com\n\nURI: https://victim.com\n' + TAIL],
      ['CR CR separator', HEADER + '\nLegit\r\rURI: https://evil.com\n\nURI: https://victim.com\n' + TAIL],
      [
        'unicode line separator',
        HEADER + '\nLegit\u2028\u2028URI: https://evil.com\n\nURI: https://victim.com\n' + TAIL,
      ],
      [
        'URI smuggled after Resources',
        HEADER + '\nURI: https://victim.com\n' + TAIL + '\nResources:\nURI: https://evil.com',
      ],
      [
        'fields out of order',
        HEADER + '\nVersion: 1\nURI: https://victim.com\nChain ID: 1\nNonce: abc12345\nIssued At: 2026-10-06T00:00:00Z',
      ],
      ['unknown trailing line', HEADER + '\nURI: https://victim.com\n' + TAIL + '\nFoo: bar'],
    ])('flags %s as malformed', (_name, message) => {
      expect(parseSiweMessageStrict(message)?.kind).toBe('malformed');
      expect(parseSiweMessage(message)).toBeUndefined();
    });

    it('flags a message that uses CRLF line endings throughout as malformed instead of ignoring it', () => {
      const message = (HEADER + '\nURI: https://victim.com\n' + TAIL).replace(/\n/g, '\r\n');
      expect(parseSiweMessageStrict(message)).toEqual({ kind: 'malformed', reason: 'unsupported line separator' });
    });

    it('accepts an empty statement line per EIP-4361', () => {
      expect(parseSiweMessageStrict(HEADER + '\n\nURI: https://victim.com\n' + TAIL)?.kind).toBe('ok');
    });

    it('accepts a bare Resources: line with zero items (viem shape)', () => {
      expect(parseSiweMessageStrict(HEADER + '\nURI: https://victim.com\n' + TAIL + '\nResources:')?.kind).toBe('ok');
    });

    it('flags Resources: followed by a non-resource line as malformed', () => {
      const message = HEADER + '\nURI: https://victim.com\n' + TAIL + '\nResources:\nnot a resource';
      expect(parseSiweMessageStrict(message)?.kind).toBe('malformed');
    });

    it.each([
      ['URI without a scheme/not a URL', 'URI: not a url', 'invalid URI'],
      ['unsupported version', 'Version: 2', 'unsupported version'],
      ['non-numeric chain id', 'Chain ID: 1x', 'invalid chain id'],
      ['short nonce', 'Nonce: abc', 'invalid nonce'],
      ['nonce with disallowed characters', 'Nonce: abc!defgh', 'invalid nonce'],
      ['non-RFC3339 timestamp', 'Issued At: yesterday', 'invalid timestamp'],
    ])('flags %s as malformed', (_name, override, reason) => {
      const label = override.split(': ')[0];
      const fields = [
        'URI: https://victim.com',
        'Version: 1',
        'Chain ID: 1',
        'Nonce: abc12345',
        'Issued At: 2026-10-06T00:00:00Z',
      ].map((line) => (line.startsWith(`${label}: `) ? override : line));

      expect(parseSiweMessageStrict(HEADER + '\n' + fields.join('\n'))).toEqual({ kind: 'malformed', reason });
    });

    it.each(['550e8400-e29b-41d4-a716-446655440000', 'a-b_c1234'])('accepts URL-safe nonce %s', (nonce) => {
      const message =
        HEADER + `\nURI: https://victim.com\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: 2026-10-06T00:00:00Z`;
      expect(parseSiweMessageStrict(message)?.kind).toBe('ok');
    });

    it('accepts a single trailing newline', () => {
      expect(parseSiweMessageStrict(HEADER + '\nURI: https://victim.com\n' + TAIL + '\n')?.kind).toBe('ok');
    });

    it('accepts an empty Request ID and keeps it as an empty string', () => {
      const result = parseSiweMessageStrict(HEADER + '\nURI: https://victim.com\n' + TAIL + '\nRequest ID: ');
      expect(result?.kind === 'ok' ? result.message.requestId : 'not-ok').toBe('');
    });

    it('flags Request ID without the space after the colon as malformed', () => {
      expect(parseSiweMessageStrict(HEADER + '\nURI: https://victim.com\n' + TAIL + '\nRequest ID:')?.kind).toBe(
        'malformed',
      );
    });

    it('flags an empty Expiration Time with the timestamp reason', () => {
      expect(parseSiweMessageStrict(HEADER + '\nURI: https://victim.com\n' + TAIL + '\nExpiration Time: ')).toEqual({
        kind: 'malformed',
        reason: 'invalid timestamp',
      });
    });
  });
});
