import { addGlacierAPIKeyIfNeeded } from './add-glacier-api-key-if-needed';
import { getGlacierApiKey } from './get-glacier-api-key';

jest.mock('./get-glacier-api-key', () => ({
  getGlacierApiKey: jest.fn(),
}));

describe('packages-internal/utils/src/utils/add-glacier-api-key-if-needed', () => {
  beforeEach(() => {
    jest.mocked(getGlacierApiKey).mockReturnValue(undefined);
  });

  it('adds the token query param for known hosts when a key is configured', () => {
    jest.mocked(getGlacierApiKey).mockReturnValue('secret-key');

    expect(addGlacierAPIKeyIfNeeded('https://glacier-api.avax.network/rpc')).toBe(
      'https://glacier-api.avax.network/rpc?token=secret-key',
    );
    expect(addGlacierAPIKeyIfNeeded('https://proxy-api.avax.network/proxy/nownodes/sol')).toBe(
      'https://proxy-api.avax.network/proxy/nownodes/sol?token=secret-key',
    );
    expect(addGlacierAPIKeyIfNeeded('https://core-proxy-api.avax.network/v1/proxy/glacier/v1/chains')).toBe(
      'https://core-proxy-api.avax.network/v1/proxy/glacier/v1/chains?token=secret-key',
    );
    expect(addGlacierAPIKeyIfNeeded('https://core-proxy-api.avax-test.network/v1/proxy/glacier/v1/chains')).toBe(
      'https://core-proxy-api.avax-test.network/v1/proxy/glacier/v1/chains?token=secret-key',
    );
  });

  it('preserves existing query params when adding the token', () => {
    jest.mocked(getGlacierApiKey).mockReturnValue('secret-key');

    expect(addGlacierAPIKeyIfNeeded('https://glacier-api.avax.network/rpc?foo=bar')).toBe(
      'https://glacier-api.avax.network/rpc?foo=bar&token=secret-key',
    );
  });

  it('does not modify the url for unknown hosts', () => {
    jest.mocked(getGlacierApiKey).mockReturnValue('secret-key');

    const url = 'https://localhost:3000/proxy/nownodes/sol';
    expect(addGlacierAPIKeyIfNeeded(url)).toBe(url);
  });

  it('does not modify the url when no key is configured', () => {
    jest.mocked(getGlacierApiKey).mockReturnValue(undefined);

    const url = 'https://glacier-api.avax.network/rpc';
    expect(addGlacierAPIKeyIfNeeded(url)).toBe(url);
  });
});
