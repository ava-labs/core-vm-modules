import { AlertType } from '@avalabs/vm-module-types';
import { hexlify, toUtf8Bytes } from 'ethers';
import { decodePersonalSignMessage, getSiweAlert, SIWE_MALFORMED_TITLE, SIWE_MISMATCH_TITLE } from './get-siwe-alert';

const siweMessage = (
  domain: string,
  uri = `https://${domain}/login`,
) => `${domain} wants you to sign in with your Ethereum account:
0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

Sign in to the app

URI: ${uri}
Version: 1
Chain ID: 1
Nonce: abc12345
Issued At: 2021-09-30T16:25:24Z`;

const toHex = (text: string) => hexlify(toUtf8Bytes(text));

describe('decodePersonalSignMessage', () => {
  it('decodes 0x-prefixed hex as UTF-8', () => {
    expect(decodePersonalSignMessage(toHex('héllo ✓'))).toBe('héllo ✓');
  });

  it('decodes uppercase hex digits', () => {
    expect(decodePersonalSignMessage('0x48454C4C4F')).toBe('HELLO');
  });

  it('pads odd-length hex like the signer does', () => {
    expect(decodePersonalSignMessage('0x141')).toBe('\u0001A');
  });

  it('returns plain text unchanged', () => {
    expect(decodePersonalSignMessage('Hello world')).toBe('Hello world');
    expect(decodePersonalSignMessage('0xnot-hex')).toBe('0xnot-hex');
  });

  it.each([
    ['invalid continuation byte', '0xc328'],
    ['truncated sequence', '0xe282'],
    ['overlong encoding', '0xc0af'],
    ['UTF-16 surrogate', '0xeda080'],
  ])('returns undefined for hex that is not valid UTF-8 (%s)', (_name, hex) => {
    expect(decodePersonalSignMessage(hex)).toBeUndefined();
  });

  it.each([undefined, null, 42, '', {}])('returns undefined for %p', (value) => {
    expect(decodePersonalSignMessage(value)).toBeUndefined();
  });
});

describe('getSiweAlert', () => {
  it('returns undefined for a non-SIWE message', () => {
    expect(getSiweAlert({ data: toHex('Hello world'), dappUrl: 'https://example.com' })).toBeUndefined();
  });

  it('returns undefined when the SIWE domain matches the dApp origin (hex payload)', () => {
    expect(getSiweAlert({ data: toHex(siweMessage('example.com')), dappUrl: 'https://example.com' })).toBeUndefined();
  });

  it('returns undefined when the SIWE domain matches the dApp origin (plain text payload)', () => {
    expect(getSiweAlert({ data: siweMessage('example.com'), dappUrl: 'https://example.com/app' })).toBeUndefined();
  });

  it.each([
    ['hex', toHex(siweMessage('evil.com'))],
    ['plain text', siweMessage('evil.com')],
  ])('returns a DANGER alert for a mismatching %s payload', (_encoding, data) => {
    expect(getSiweAlert({ data, dappUrl: 'https://example.com' })).toEqual({
      type: AlertType.DANGER,
      details: {
        title: SIWE_MISMATCH_TITLE,
        description:
          'Domain "evil.com" doesn\'t match the dApp origin "example.com". ' +
          'URI "https://evil.com/login" doesn\'t match the dApp origin "example.com". ' +
          'This could be a phishing attempt. Proceed with caution.',
      },
    });
  });

  it('flags a subdomain even when the URI matches', () => {
    const alert = getSiweAlert({
      data: siweMessage('login.example.com', 'https://example.com/login'),
      dappUrl: 'https://example.com',
    });
    expect(alert?.type).toBe(AlertType.DANGER);
    expect(alert?.details.description).toContain('Domain "login.example.com"');
    expect(alert?.details.description).not.toContain('URI');
  });

  it('returns a DANGER alert for a malformed SIWE message, even without a dApp URL', () => {
    const smuggled = siweMessage('example.com').replace(
      'Sign in to the app\n',
      'Sign in to the app\n\nURI: https://evil.com\n',
    );
    expect(getSiweAlert({ data: smuggled, dappUrl: undefined })).toEqual({
      type: AlertType.DANGER,
      details: {
        title: SIWE_MALFORMED_TITLE,
        description: 'This sign-in message is not formatted as a valid Sign-In with Ethereum request. Do not sign it.',
      },
    });
  });

  it.each([undefined, '', 'not a url'])('returns undefined when the dApp URL is %p', (dappUrl) => {
    expect(getSiweAlert({ data: siweMessage('evil.com'), dappUrl })).toBeUndefined();
  });

  it('returns undefined for hex that is not valid UTF-8', () => {
    expect(getSiweAlert({ data: '0xc328', dappUrl: 'https://example.com' })).toBeUndefined();
  });
});
