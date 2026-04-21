import {
  buildSettingsMenuItems,
  buildSettingsSaveResult,
  createSettingsDraft,
  maskSecret,
  type EditableSettingKey,
  type SettingsDraft
} from '../../src/cli/flows/settingsFlowModel.js';
import type { AppSettings, RedditCredentialState } from '../../src/types/settings.js';

function createCurrentSettings(): AppSettings {
  return {
    model: 'moonshotai/kimi-k2.5',
    modelSettings: {
      temperature: 0.2,
      maxTokens: 800,
      topP: 0.9
    },
    cronIntervalMinutes: 30,
    jobTimeoutMs: 600000,
    notificationsEnabled: true
  };
}

function createRedditState(): RedditCredentialState {
  return {
    appName: 'snoopy-app',
    clientId: 'reddit-client-1234',
    hasClientSecret: true
  };
}

describe('settingsFlowModel', () => {
  it('masks secret values', () => {
    expect(maskSecret('abcdef123456')).toBe('****3456');
    expect(maskSecret('abcd')).toBe('****');
    expect(maskSecret('')).toBe('');
  });

  it('builds menu items with masked secret summaries', () => {
    const draft = createSettingsDraft(createCurrentSettings(), createRedditState());

    const items = buildSettingsMenuItems({
      draft,
      draftSecrets: {},
      keytarAvailable: true,
      currentApiKey: 'or-key-987654',
      hasCurrentRedditClientSecret: true,
      clearedFields: new Set()
    });

    expect(items.find((item) => item.key === 'apiKey')?.summary).toBe('Configured via keychain (****7654)');
    expect(items.find((item) => item.key === 'redditClientId')?.summary).toBe('Configured (****1234)');
    expect(items.find((item) => item.key === 'redditClientSecret')?.summary).toBe('Configured via keychain (hidden)');
  });

  it('returns save payload with changed values and new secrets', () => {
    const draft: SettingsDraft = {
      model: 'openrouter/auto',
      temperature: '0.4',
      maxTokens: '1200',
      topP: '0.85',
      cronIntervalMinutes: '15',
      jobTimeoutMinutes: '12',
      redditAppName: 'new-app',
      redditClientId: 'new-client-id',
      notificationsEnabled: true
    };

    const saveResult = buildSettingsSaveResult(
      draft,
      {
        apiKey: 'or-new-secret-1234',
        redditClientSecret: 'reddit-secret-5555'
      },
      createRedditState(),
      new Set()
    );

    expect(saveResult.ok).toBe(true);
    if (!saveResult.ok) {
      throw new Error('Expected successful save result');
    }

    expect(saveResult.result.apiKey).toBe('or-new-secret-1234');
    expect(saveResult.result.redditCredentials).toEqual({
      appName: 'new-app',
      clientId: 'new-client-id',
      clientSecret: 'reddit-secret-5555'
    });
    expect(saveResult.result.settings).toEqual({
      model: 'openrouter/auto',
      modelSettings: {
        temperature: 0.4,
        maxTokens: 1200,
        topP: 0.85
      },
      cronIntervalMinutes: 15,
      jobTimeoutMs: 720000,
      notificationsEnabled: true
    });
  });

  it('omits reddit credentials when they are unchanged and no new secret is set', () => {
    const redditState = createRedditState();
    const draft = createSettingsDraft(createCurrentSettings(), redditState);

    const saveResult = buildSettingsSaveResult(draft, {}, redditState, new Set());

    expect(saveResult.ok).toBe(true);
    if (!saveResult.ok) {
      throw new Error('Expected successful save result');
    }

    expect(saveResult.result.redditCredentials).toBeUndefined();
  });

  it('rejects invalid numeric values during save', () => {
    const redditState = createRedditState();
    const draft = createSettingsDraft(createCurrentSettings(), redditState);

    const saveResult = buildSettingsSaveResult(
      {
        ...draft,
        temperature: '2.5'
      },
      {},
      redditState,
      new Set()
    );

    expect(saveResult).toEqual({
      ok: false,
      error: 'Temperature must be a number from 0.0 to 2.0.'
    });
  });

  it('clears fields when marked in clearedFields set', () => {
    const redditState = createRedditState();
    const draft = createSettingsDraft(createCurrentSettings(), redditState);

    const clearedFields = new Set<EditableSettingKey>(['redditClientId']);

    const items = buildSettingsMenuItems({
      draft,
      draftSecrets: {},
      keytarAvailable: true,
      currentApiKey: 'or-key-987654',
      hasCurrentRedditClientSecret: true,
      clearedFields
    });

    expect(items.find((item) => item.key === 'redditClientId')?.summary).toBe('Cleared');

    const saveResult = buildSettingsSaveResult(draft, {}, redditState, clearedFields);

    expect(saveResult.ok).toBe(true);
    if (!saveResult.ok) {
      throw new Error('Expected successful save result');
    }

    expect(saveResult.result.redditCredentials).toEqual({
      appName: redditState.appName,
      clientId: ''
    });
  });

  it('shows cleared summary for redditAppName and Will-update variants for secrets', () => {
    const redditState = createRedditState();
    const draft = createSettingsDraft(createCurrentSettings(), redditState);

    const clearedAppName = new Set<EditableSettingKey>(['redditAppName']);

    const items = buildSettingsMenuItems({
      draft,
      draftSecrets: { apiKey: 'or-draft-key-abcdef', redditClientSecret: 'new-secret' },
      keytarAvailable: true,
      currentApiKey: null,
      hasCurrentRedditClientSecret: false,
      clearedFields: clearedAppName
    });

    expect(items.find((item) => item.key === 'apiKey')?.summary).toBe('Will update (****cdef)');
    expect(items.find((item) => item.key === 'redditClientSecret')?.summary).toBe('Will update (hidden)');
    expect(items.find((item) => item.key === 'redditAppName')?.summary).toBe('Cleared');
  });

  it('shows missing when no apiKey and no draftApiKey, and missing when no reddit client secret', () => {
    const redditState: RedditCredentialState = { appName: '', clientId: '', hasClientSecret: false };
    const draft = createSettingsDraft(createCurrentSettings(), redditState);

    const items = buildSettingsMenuItems({
      draft,
      draftSecrets: {},
      keytarAvailable: true,
      currentApiKey: null,
      hasCurrentRedditClientSecret: false
    });

    expect(items.find((item) => item.key === 'apiKey')?.summary).toBe('Missing');
    expect(items.find((item) => item.key === 'redditClientId')?.summary).toBe('Missing');
    expect(items.find((item) => item.key === 'redditClientSecret')?.summary).toBe('Missing');
    expect(items.find((item) => item.key === 'redditAppName')?.summary).toBe('(empty)');
  });

  it('shows model empty placeholder when model is empty', () => {
    const redditState = createRedditState();
    const draft = { ...createSettingsDraft(createCurrentSettings(), redditState), model: '' };

    const items = buildSettingsMenuItems({
      draft,
      draftSecrets: {},
      keytarAvailable: true,
      currentApiKey: null,
      hasCurrentRedditClientSecret: false
    });

    expect(items.find((item) => item.key === 'model')?.summary).toBe('(empty)');
  });

  it('shows No timeout label when jobTimeoutMinutes is 0', () => {
    const redditState = createRedditState();
    const draft = { ...createSettingsDraft(createCurrentSettings(), redditState), jobTimeoutMinutes: '0' };

    const items = buildSettingsMenuItems({
      draft,
      draftSecrets: {},
      keytarAvailable: true,
      currentApiKey: null,
      hasCurrentRedditClientSecret: false
    });

    expect(items.find((item) => item.key === 'jobTimeoutMinutes')?.summary).toBe('No timeout');
  });

  it('shows Disabled for notifications when notificationsEnabled is false', () => {
    const redditState = createRedditState();
    const draft = { ...createSettingsDraft(createCurrentSettings(), redditState), notificationsEnabled: false };

    const items = buildSettingsMenuItems({
      draft,
      draftSecrets: {},
      keytarAvailable: true,
      currentApiKey: null,
      hasCurrentRedditClientSecret: false
    });

    expect(items.find((item) => item.key === 'notificationsEnabled')?.summary).toBe('Disabled');
  });

  it('rejects empty model', () => {
    const redditState = createRedditState();
    const draft = { ...createSettingsDraft(createCurrentSettings(), redditState), model: '   ' };

    const result = buildSettingsSaveResult(draft, {}, redditState, new Set());
    expect(result).toEqual({ ok: false, error: 'Model cannot be empty.' });
  });

  it('rejects invalid maxTokens', () => {
    const redditState = createRedditState();
    const draft = { ...createSettingsDraft(createCurrentSettings(), redditState), maxTokens: '-1' };

    const result = buildSettingsSaveResult(draft, {}, redditState, new Set());
    expect(result).toEqual({ ok: false, error: 'Max tokens must be a positive integer.' });
  });

  it('rejects non-integer maxTokens', () => {
    const redditState = createRedditState();
    const draft = { ...createSettingsDraft(createCurrentSettings(), redditState), maxTokens: '1.5' };

    const result = buildSettingsSaveResult(draft, {}, redditState, new Set());
    expect(result).toEqual({ ok: false, error: 'Max tokens must be a positive integer.' });
  });

  it('rejects invalid topP', () => {
    const redditState = createRedditState();
    const draft = { ...createSettingsDraft(createCurrentSettings(), redditState), topP: '1.5' };

    const result = buildSettingsSaveResult(draft, {}, redditState, new Set());
    expect(result).toEqual({ ok: false, error: 'Top P must be a number from 0.0 to 1.0.' });
  });

  it('rejects invalid cronIntervalMinutes', () => {
    const redditState = createRedditState();
    const draft = { ...createSettingsDraft(createCurrentSettings(), redditState), cronIntervalMinutes: '0' };

    const result = buildSettingsSaveResult(draft, {}, redditState, new Set());
    expect(result).toEqual({ ok: false, error: 'Scan interval must be an integer greater than or equal to 1.' });
  });

  it('rejects invalid jobTimeoutMinutes', () => {
    const redditState = createRedditState();
    const draft = { ...createSettingsDraft(createCurrentSettings(), redditState), jobTimeoutMinutes: '-1' };

    const result = buildSettingsSaveResult(draft, {}, redditState, new Set());
    expect(result).toEqual({ ok: false, error: 'Job timeout must be an integer greater than or equal to 0.' });
  });

  it('accepts zero jobTimeoutMinutes and omits reddit credentials when unchanged', () => {
    const redditState = createRedditState();
    const draft = { ...createSettingsDraft(createCurrentSettings(), redditState), jobTimeoutMinutes: '0' };

    const result = buildSettingsSaveResult(draft, {}, redditState, new Set());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.result.settings.jobTimeoutMs).toBe(0);
    expect(result.result.redditCredentials).toBeUndefined();
  });

  it('clears redditAppName when in clearedFields and updates reddit credentials', () => {
    const redditState = createRedditState();
    const draft = createSettingsDraft(createCurrentSettings(), redditState);
    const clearedFields = new Set<EditableSettingKey>(['redditAppName']);

    const result = buildSettingsSaveResult(draft, {}, redditState, clearedFields);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.result.redditCredentials).toEqual({
      appName: '',
      clientId: redditState.clientId
    });
  });
});
