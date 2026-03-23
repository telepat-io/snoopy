import { SettingsRepository } from '../../src/services/db/repositories/settingsRepo.js';
import * as secretStore from '../../src/services/security/secretStore.js';

describe('SettingsRepository', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('saves and reads app settings', () => {
    const repo = new SettingsRepository();
    repo.setAppSettings({
      model: 'moonshotai/kimi-k2.5',
      modelSettings: {
        temperature: 0.2,
        maxTokens: 700,
        topP: 1
      },
      cronIntervalMinutes: 15,
      jobTimeoutMs: 300000
    });

    const result = repo.getAppSettings();
    expect(result.model).toBe('moonshotai/kimi-k2.5');
    expect(result.modelSettings.maxTokens).toBe(700);
    expect(result.cronIntervalMinutes).toBe(15);
    expect(result.jobTimeoutMs).toBe(300000);
  });

  it('saves and reads global reddit credentials via secure secret store', async () => {
    const getSecretSpy = jest.spyOn(secretStore, 'getRedditClientSecret').mockResolvedValue('client-secret');
    const setSecretSpy = jest.spyOn(secretStore, 'setRedditClientSecret').mockResolvedValue();

    const repo = new SettingsRepository();
    await repo.setRedditCredentials({
      appName: 'snoopy-tests',
      clientId: 'client-id',
      clientSecret: 'client-secret'
    });

    expect(setSecretSpy).toHaveBeenCalledWith('client-secret');
    await expect(repo.getRedditCredentials()).resolves.toEqual({
      appName: 'snoopy-tests',
      clientId: 'client-id',
      clientSecret: 'client-secret'
    });
    expect(getSecretSpy).toHaveBeenCalled();
  });

  it('generates a default Reddit app name once and keeps it stable until override', async () => {
    jest.spyOn(secretStore, 'getRedditClientSecret').mockResolvedValue(null);

    const repo = new SettingsRepository();
    repo.delete('reddit_app_name');

    const first = await repo.getRedditCredentialState();
    const second = await repo.getRedditCredentialState();

    expect(first.appName).toMatch(/^snoopy-[a-f0-9]{8}$/);
    expect(second.appName).toBe(first.appName);

    await repo.setRedditCredentials({
      appName: 'custom-app-name',
      clientId: ''
    });

    const third = await repo.getRedditCredentialState();
    expect(third.appName).toBe('custom-app-name');
  });

  it('migrates legacy plaintext reddit_client_secret to secure store and clears DB key', async () => {
    const setSecretSpy = jest.spyOn(secretStore, 'setRedditClientSecret').mockResolvedValue();
    jest.spyOn(secretStore, 'getRedditClientSecret').mockResolvedValue(null);

    const repo = new SettingsRepository();
    repo.set('reddit_client_secret', 'legacy-secret');

    await repo.getRedditCredentialState();

    expect(setSecretSpy).toHaveBeenCalledWith('legacy-secret');
    expect(repo.get('reddit_client_secret')).toBeNull();
  });
});
