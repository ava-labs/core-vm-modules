type GetGlacierApiKeyModule = typeof import('./get-glacier-api-key');

describe('getGlacierApiKey', () => {
  const loadModule = (envKey?: string): GetGlacierApiKeyModule => {
    let module: GetGlacierApiKeyModule | undefined;
    jest.isolateModules(() => {
      jest.doMock('../consts', () => ({ GLACIER_API_KEY: envKey }));
      module = jest.requireActual<GetGlacierApiKeyModule>('./get-glacier-api-key');
    });
    return module as GetGlacierApiKeyModule;
  };

  it('falls back to the build-time key when no getter is registered', () => {
    const { getGlacierApiKey } = loadModule('env-key');

    expect(getGlacierApiKey()).toBe('env-key');
  });

  it('reads the registered getter on every call', () => {
    const { getGlacierApiKey, setGlacierApiKeyGetter } = loadModule();
    const getter = jest.fn<string | undefined, []>().mockReturnValue(undefined);
    setGlacierApiKeyGetter(getter);

    expect(getGlacierApiKey()).toBeUndefined();

    getter.mockReturnValue('runtime-key');
    expect(getGlacierApiKey()).toBe('runtime-key');
  });

  it('prefers the runtime key over the build-time key', () => {
    const { getGlacierApiKey, setGlacierApiKeyGetter } = loadModule('env-key');
    setGlacierApiKeyGetter(() => 'runtime-key');

    expect(getGlacierApiKey()).toBe('runtime-key');
  });

  it('falls back to the build-time key when the getter returns nothing', () => {
    const { getGlacierApiKey, setGlacierApiKeyGetter } = loadModule('env-key');
    setGlacierApiKeyGetter(() => undefined);

    expect(getGlacierApiKey()).toBe('env-key');
  });
});
