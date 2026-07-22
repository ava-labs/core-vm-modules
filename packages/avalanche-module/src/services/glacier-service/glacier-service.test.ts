import { AvalancheGlacierService } from './glacier-service';
import { Glacier } from '@avalabs/glacier-sdk';

jest.mock('@avalabs/glacier-sdk', () => {
  const actual = jest.requireActual('@avalabs/glacier-sdk');
  return {
    ...actual,
    Glacier: jest.fn(),
  };
});

describe('AvalancheGlacierService', () => {
  const FAKE_URL = 'http://fake-url';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('headers config', () => {
    it('passes static headers straight through when no auth header resolver is given', () => {
      new AvalancheGlacierService({ glacierApiUrl: FAKE_URL, headers: { 'x-application-name': 'core-mobile-ios' } });

      expect(Glacier).toHaveBeenCalledWith(
        expect.objectContaining({ BASE: FAKE_URL, HEADERS: { 'x-application-name': 'core-mobile-ios' } }),
        expect.anything(),
      );
    });

    it('resolves auth headers per request, merged over static headers', async () => {
      const getAuthHeaders = jest.fn().mockResolvedValue({ 'X-Firebase-AppCheck': 'token-1' });

      new AvalancheGlacierService({
        glacierApiUrl: FAKE_URL,
        headers: { 'x-application-name': 'core-mobile-ios' },
        getAuthHeaders,
      });

      const config = (Glacier as jest.Mock).mock.calls[0]?.[0];
      expect(typeof config.HEADERS).toBe('function');
      await expect(config.HEADERS()).resolves.toEqual({
        'x-application-name': 'core-mobile-ios',
        'X-Firebase-AppCheck': 'token-1',
      });

      getAuthHeaders.mockResolvedValue({ 'X-Firebase-AppCheck': 'token-2' });
      await expect(config.HEADERS()).resolves.toEqual({
        'x-application-name': 'core-mobile-ios',
        'X-Firebase-AppCheck': 'token-2',
      });
    });
  });
});
