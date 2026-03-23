import fs from 'node:fs';
import path from 'node:path';
import keytar from 'keytar';
import {
  deleteOpenRouterApiKey,
  deleteRedditClientSecret,
  getOpenRouterApiKey,
  getRedditClientSecret,
  setOpenRouterApiKey,
  setRedditClientSecret
} from '../../src/services/security/secretStore.js';

jest.mock('keytar', () => ({
  __esModule: true,
  default: {
    setPassword: jest.fn(),
    getPassword: jest.fn(),
    deletePassword: jest.fn()
  }
}));

const keytarMock = keytar as unknown as {
  setPassword: jest.Mock;
  getPassword: jest.Mock;
  deletePassword: jest.Mock;
};

function getSecretFilePath(): string {
  return path.join(process.env.SNOOPY_ROOT_DIR!, 'secrets.enc');
}

async function loadSecretStoreModule() {
  return Promise.resolve({
    setOpenRouterApiKey,
    getOpenRouterApiKey,
    deleteOpenRouterApiKey,
    setRedditClientSecret,
    getRedditClientSecret,
    deleteRedditClientSecret
  });
}

describe('secretStore', () => {
  beforeEach(() => {
    keytarMock.setPassword.mockReset();
    keytarMock.getPassword.mockReset();
    keytarMock.deletePassword.mockReset();
    fs.rmSync(getSecretFilePath(), { force: true });
  });

  it('uses keytar when available', async () => {
    keytarMock.setPassword.mockResolvedValue(undefined);
    keytarMock.getPassword.mockResolvedValue('keytar-value');
    keytarMock.deletePassword.mockResolvedValue(true);

    const store = await loadSecretStoreModule();

    await store.setOpenRouterApiKey('openrouter-secret');
    await expect(store.getOpenRouterApiKey()).resolves.toBe('keytar-value');
    await store.deleteOpenRouterApiKey();

    expect(keytarMock.setPassword).toHaveBeenCalledWith('snoopy', 'openrouter_api_key', 'openrouter-secret');
    expect(keytarMock.getPassword).toHaveBeenCalledWith('snoopy', 'openrouter_api_key');
    expect(keytarMock.deletePassword).toHaveBeenCalledWith('snoopy', 'openrouter_api_key');
    expect(fs.existsSync(getSecretFilePath())).toBe(false);
  });

  it('falls back to encrypted local file when keytar operations fail', async () => {
    keytarMock.setPassword.mockRejectedValue(new Error('keychain down'));
    keytarMock.getPassword.mockRejectedValue(new Error('keychain down'));

    const store = await loadSecretStoreModule();

    await store.setOpenRouterApiKey('fallback-openrouter-key');
    const filePath = getSecretFilePath();
    expect(fs.existsSync(filePath)).toBe(true);

    const raw = fs.readFileSync(filePath, 'utf8');
    expect(raw).not.toContain('fallback-openrouter-key');
    await expect(store.getOpenRouterApiKey()).resolves.toBe('fallback-openrouter-key');
  });

  it('deletes fallback entries and removes file when all secrets are cleared', async () => {
    keytarMock.setPassword.mockRejectedValue(new Error('keychain down'));
    keytarMock.getPassword.mockRejectedValue(new Error('keychain down'));
    keytarMock.deletePassword.mockRejectedValue(new Error('delete failed'));

    const store = await loadSecretStoreModule();

    await store.setOpenRouterApiKey('or-key');
    await store.setRedditClientSecret('reddit-secret');
    expect(fs.existsSync(getSecretFilePath())).toBe(true);

    await store.deleteOpenRouterApiKey();
    expect(fs.existsSync(getSecretFilePath())).toBe(true);
    await expect(store.getRedditClientSecret()).resolves.toBe('reddit-secret');

    await store.deleteRedditClientSecret();
    expect(fs.existsSync(getSecretFilePath())).toBe(false);
  });

  it('returns null when fallback file cannot be decrypted', async () => {
    keytarMock.getPassword.mockRejectedValue(new Error('keychain down'));
    fs.writeFileSync(getSecretFilePath(), 'not-a-valid-payload', 'utf8');

    const store = await loadSecretStoreModule();
    await expect(store.getOpenRouterApiKey()).resolves.toBeNull();
    await expect(store.getRedditClientSecret()).resolves.toBeNull();
  });
});