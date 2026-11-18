import type { SiweMessage } from './parse-siwe-message';
import { isSiweDomainMismatch, isSiweUriMismatch, safeParseUrl, validateSiweOrigin } from './validate-siwe-origin';

const siwe = (overrides: Partial<SiweMessage> = {}): SiweMessage => ({
  domain: 'example.com',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  uri: 'https://example.com/login',
  version: '1',
  chainId: '1',
  nonce: 'abc12345',
  issuedAt: '2021-09-30T16:25:24Z',
  ...overrides,
});

const origin = (url: string): URL => {
  const parsed = safeParseUrl(url);
  if (!parsed) throw new Error(`bad test url ${url}`);
  return parsed;
};

describe('safeParseUrl', () => {
  it('parses full URLs and bare authorities', () => {
    expect(safeParseUrl('https://example.com/path')?.host).toBe('example.com');
    expect(safeParseUrl('example.com:8080')?.host).toBe('example.com:8080');
  });

  it.each([undefined, '', 'http://', 'https://exa mple.com', '::::'])('returns undefined for %p', (value) => {
    expect(safeParseUrl(value)).toBeUndefined();
  });
});

describe('isSiweDomainMismatch', () => {
  it.each([
    ['exact host', 'example.com', 'https://example.com'],
    ['dApp URL with path, query and fragment', 'example.com', 'https://example.com/app?x=1#y'],
    ['case-insensitive host', 'EXAMPLE.com', 'https://example.COM'],
    ['trailing dot', 'example.com.', 'https://example.com'],
    ['explicit default https port', 'example.com:443', 'https://example.com'],
    ['explicit default http port', 'example.com:80', 'http://example.com'],
    ['dApp with explicit default port', 'example.com', 'https://example.com:443'],
    ['matching non-default port', 'localhost:3000', 'http://localhost:3000'],
    ['matching scheme prefix', 'https://example.com', 'https://example.com'],
    ['matching scheme prefix and port', 'http://localhost:3000', 'http://localhost:3000'],
    ['IDN and its punycode form', 'xn--mnchen-3ya.de', 'https://münchen.de'],
    ['IPv4 host', '127.0.0.1:8545', 'http://127.0.0.1:8545'],
  ])('matches: %s', (_name, domain, dappUrl) => {
    expect(isSiweDomainMismatch(domain, origin(dappUrl))).toBe(false);
  });

  it.each([
    ['different host', 'evil.com', 'https://example.com'],
    ['subdomain of the dApp', 'login.example.com', 'https://example.com'],
    ['parent domain of the dApp', 'example.com', 'https://app.example.com'],
    ['look-alike suffix', 'example.com.evil.io', 'https://example.com'],
    ['look-alike prefix', 'evilexample.com', 'https://example.com'],
    ['userinfo', 'example.com@evil.com', 'https://evil.com'],
    ['userinfo with password', 'user:pass@example.com', 'https://example.com'],
    ['path in domain', 'example.com/login', 'https://example.com'],
    ['backslash in domain', 'example.com\\@evil.com', 'https://example.com'],
    ['query in domain', 'example.com?x=1', 'https://example.com'],
    ['fragment in domain', 'example.com#@evil.com', 'https://example.com'],
    ['different port', 'example.com:8443', 'https://example.com'],
    ['similar port (4433 vs 443)', 'example.com:4433', 'https://example.com:443'],
    ['omits the non-default port the dApp is served on', 'localhost', 'http://localhost:3000'],
    ['names a port while the dApp uses the default port', 'localhost:3000', 'http://localhost'],
    ['default port of the wrong scheme', 'example.com:80', 'https://example.com'],
    ['mismatched scheme prefix', 'http://example.com', 'https://example.com'],
    ['scheme prefix and port with scheme mismatch', 'https://localhost:3000', 'http://localhost:3000'],
    ['unparseable domain', 'exa mple.com', 'https://example.com'],
  ])('mismatches: %s', (_name, domain, dappUrl) => {
    expect(isSiweDomainMismatch(domain, origin(dappUrl))).toBe(true);
  });
});

describe('isSiweUriMismatch', () => {
  it.each([
    ['same origin with path', 'https://example.com/login', 'https://example.com'],
    ['explicit default port', 'https://example.com:443/', 'https://example.com'],
    ['matching non-default port', 'http://localhost:3000/', 'http://localhost:3000/app'],
  ])('matches: %s', (_name, uri, dappUrl) => {
    expect(isSiweUriMismatch(uri, origin(dappUrl))).toBe(false);
  });

  it.each([
    ['different host', 'https://evil.com/login', 'https://example.com'],
    ['subdomain', 'https://api.example.com/login', 'https://example.com'],
    ['http URI on an https dApp', 'http://example.com/login', 'https://example.com'],
    ['different port', 'https://example.com:8443/', 'https://example.com'],
  ])('mismatches: %s', (_name, uri, dappUrl) => {
    expect(isSiweUriMismatch(uri, origin(dappUrl))).toBe(true);
  });
});

describe('validateSiweOrigin', () => {
  it('returns undefined when domain and URI match the dApp origin', () => {
    expect(validateSiweOrigin(siwe(), 'https://example.com')).toBeUndefined();
  });

  it('returns undefined when the dApp URL has a path', () => {
    expect(validateSiweOrigin(siwe(), 'https://example.com/some/page?q=1')).toBeUndefined();
  });

  it('accepts a dApp URL without a scheme as https', () => {
    expect(validateSiweOrigin(siwe(), 'example.com')).toBeUndefined();
  });

  it.each([undefined, '', 'not a url', 'https://'])(
    'returns undefined when the dApp URL is missing or unparseable (%p)',
    (dappUrl) => {
      expect(validateSiweOrigin(siwe({ domain: 'evil.com' }), dappUrl)).toBeUndefined();
    },
  );

  it('reports a domain mismatch', () => {
    expect(validateSiweOrigin(siwe({ domain: 'evil.com' }), 'https://example.com')).toEqual({
      domainMismatch: true,
      uriMismatch: false,
      reasons: ['Domain "evil.com" doesn\'t match the dApp origin "example.com".'],
    });
  });

  it('reports a URI mismatch and shows the non-https scheme and port of the dApp', () => {
    expect(
      validateSiweOrigin(siwe({ domain: 'localhost:3000', uri: 'https://evil.com' }), 'http://localhost:3000'),
    ).toEqual({
      domainMismatch: false,
      uriMismatch: true,
      reasons: ['URI "https://evil.com" doesn\'t match the dApp origin "http://localhost:3000".'],
    });
  });

  it('reports both mismatches at once', () => {
    const result = validateSiweOrigin(siwe({ domain: 'evil.com', uri: 'https://evil.com' }), 'https://example.com');
    expect(result?.domainMismatch).toBe(true);
    expect(result?.uriMismatch).toBe(true);
    expect(result?.reasons).toHaveLength(2);
  });
});
