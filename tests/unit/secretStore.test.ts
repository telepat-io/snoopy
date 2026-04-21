describe('secretStore', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.SNOOPY_OPENROUTER_API_KEY;
    delete process.env.SNOOPY_REDDIT_CLIENT_SECRET;
  });

  it('uses keytar when available', async () => {
    const keytarMock = {
      setPassword: jest.fn().mockResolvedValue(undefined),
      getPassword: jest.fn().mockResolvedValue('keytar-value'),
      deletePassword: jest.fn().mockResolvedValue(true)
    };

    jest.doMock('keytar', () => ({
      __esModule: true,
      default: keytarMock
    }));

    const store = await import('../../src/services/security/secretStore.js');

    await store.setOpenRouterApiKey('openrouter-secret');
    await expect(store.getOpenRouterApiKey()).resolves.toBe('keytar-value');
    await store.deleteOpenRouterApiKey();

    expect(keytarMock.setPassword).toHaveBeenCalledWith('snoopy', 'openrouter_api_key', 'openrouter-secret');
    expect(keytarMock.getPassword).toHaveBeenCalledWith('snoopy', 'openrouter_api_key');
    expect(keytarMock.deletePassword).toHaveBeenCalledWith('snoopy', 'openrouter_api_key');
    await expect(store.isKeytarAvailable()).resolves.toBe(true);
  });

  it('falls back to env vars for reads when keytar is unavailable', async () => {
    jest.doMock('keytar', () => {
      throw new Error('keytar unavailable');
    });

    process.env.SNOOPY_OPENROUTER_API_KEY = 'env-openrouter-key';
    process.env.SNOOPY_REDDIT_CLIENT_SECRET = 'env-reddit-secret';

    const store = await import('../../src/services/security/secretStore.js');

    await expect(store.getOpenRouterApiKey()).resolves.toBe('env-openrouter-key');
    await expect(store.getRedditClientSecret()).resolves.toBe('env-reddit-secret');
    await expect(store.isKeytarAvailable()).resolves.toBe(false);
  });

  it('throws a typed error when attempting secret writes without keytar', async () => {
    jest.doMock('keytar', () => {
      throw new Error('keytar unavailable');
    });

    const store = await import('../../src/services/security/secretStore.js');

    await expect(store.setOpenRouterApiKey('new-key')).rejects.toBeInstanceOf(store.KeytarUnavailableError);
    await expect(store.setRedditClientSecret('new-secret')).rejects.toBeInstanceOf(store.KeytarUnavailableError);
  });

  it('falls back to env reads when keytar read fails', async () => {
    const keytarMock = {
      setPassword: jest.fn().mockResolvedValue(undefined),
      getPassword: jest.fn().mockRejectedValue(new Error('keytar read failure')),
      deletePassword: jest.fn().mockResolvedValue(true)
    };

    jest.doMock('keytar', () => ({
      __esModule: true,
      default: keytarMock
    }));

    process.env.SNOOPY_OPENROUTER_API_KEY = 'env-openrouter-key';
    process.env.SNOOPY_REDDIT_CLIENT_SECRET = 'env-reddit-secret';

    const store = await import('../../src/services/security/secretStore.js');

    await expect(store.getOpenRouterApiKey()).resolves.toBe('env-openrouter-key');
    await expect(store.getRedditClientSecret()).resolves.toBe('env-reddit-secret');
  });
});
