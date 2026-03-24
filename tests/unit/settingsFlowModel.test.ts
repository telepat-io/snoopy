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
    jobTimeoutMs: 600000
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
      currentApiKey: 'or-key-987654',
      hasCurrentRedditClientSecret: true,
      clearedFields: new Set()
    });

    expect(items.find((item) => item.key === 'apiKey')?.summary).toBe('Configured (****7654)');
    expect(items.find((item) => item.key === 'redditClientId')?.summary).toBe('Configured (****1234)');
    expect(items.find((item) => item.key === 'redditClientSecret')?.summary).toBe('Configured (hidden)');
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
      redditClientId: 'new-client-id'
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
      jobTimeoutMs: 720000
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
});
