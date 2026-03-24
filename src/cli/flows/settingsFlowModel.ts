import {
  DEFAULT_JOB_TIMEOUT_MS,
  type AppSettings,
  type RedditCredentialState,
  type RedditCredentialsUpdate
} from '../../types/settings.js';

export type EditableSettingKey =
  | 'apiKey'
  | 'model'
  | 'temperature'
  | 'maxTokens'
  | 'topP'
  | 'cronIntervalMinutes'
  | 'jobTimeoutMinutes'
  | 'notificationsEnabled'
  | 'redditAppName'
  | 'redditClientId'
  | 'redditClientSecret';

export interface SettingsDraft {
  model: string;
  temperature: string;
  maxTokens: string;
  topP: string;
  cronIntervalMinutes: string;
  jobTimeoutMinutes: string;
  notificationsEnabled: boolean;
  redditAppName: string;
  redditClientId: string;
}

export interface SettingsDraftSecrets {
  apiKey?: string;
  redditClientSecret?: string;
}

interface BuildMenuItemsInput {
  draft: SettingsDraft;
  draftSecrets: SettingsDraftSecrets;
  currentApiKey: string | null;
  hasCurrentRedditClientSecret: boolean;
  clearedFields?: Set<EditableSettingKey>;
}

export interface SettingsMenuItem {
  key: EditableSettingKey | 'save' | 'cancel';
  label: string;
  summary: string;
  editable: boolean;
}

interface SettingsSaveResult {
  apiKey?: string;
  redditCredentials?: RedditCredentialsUpdate;
  settings: AppSettings;
}

type SaveResult =
  | { ok: true; result: SettingsSaveResult }
  | { ok: false; error: string };

function parseRequiredNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredInteger(value: string): number | null {
  const parsed = parseRequiredNumber(value);
  if (parsed === null || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

export function maskSecret(value: string, visibleChars = 4): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.length <= visibleChars) {
    return '*'.repeat(trimmed.length);
  }

  return `****${trimmed.slice(-visibleChars)}`;
}

export function createSettingsDraft(current: AppSettings, currentRedditCredentials: RedditCredentialState): SettingsDraft {
  return {
    model: current.model,
    temperature: String(current.modelSettings.temperature),
    maxTokens: String(current.modelSettings.maxTokens),
    topP: String(current.modelSettings.topP),
    cronIntervalMinutes: String(current.cronIntervalMinutes),
    jobTimeoutMinutes: String(Math.round((current.jobTimeoutMs ?? DEFAULT_JOB_TIMEOUT_MS) / 60000)),
    notificationsEnabled: current.notificationsEnabled ?? true,
    redditAppName: currentRedditCredentials.appName,
    redditClientId: currentRedditCredentials.clientId
  };
}

export function buildSettingsMenuItems({
  draft,
  draftSecrets,
  currentApiKey,
  hasCurrentRedditClientSecret,
  clearedFields = new Set()
}: BuildMenuItemsInput): SettingsMenuItem[] {
  const apiKeySummary = draftSecrets.apiKey
    ? `Will update (${maskSecret(draftSecrets.apiKey)})`
    : currentApiKey
      ? `Configured (${maskSecret(currentApiKey)})`
      : 'Missing';

  const redditClientIdSummary = clearedFields.has('redditClientId')
    ? 'Cleared'
    : draft.redditClientId
      ? `Configured (${maskSecret(draft.redditClientId)})`
      : 'Missing';

  const redditAppNameSummary = clearedFields.has('redditAppName') ? 'Cleared' : draft.redditAppName || '(empty)';

  const redditClientSecretSummary = draftSecrets.redditClientSecret
    ? 'Will update (hidden)'
    : hasCurrentRedditClientSecret
      ? 'Configured (hidden)'
      : 'Missing';

  return [
    { key: 'apiKey', label: 'OpenRouter API key', summary: apiKeySummary, editable: true },
    { key: 'model', label: 'Default model', summary: draft.model || '(empty)', editable: true },
    { key: 'temperature', label: 'Temperature', summary: draft.temperature, editable: true },
    { key: 'maxTokens', label: 'Max tokens', summary: draft.maxTokens, editable: true },
    { key: 'topP', label: 'Top P', summary: draft.topP, editable: true },
    { key: 'cronIntervalMinutes', label: 'Scan interval', summary: `${draft.cronIntervalMinutes} minutes`, editable: true },
    {
      key: 'jobTimeoutMinutes',
      label: 'Job timeout',
      summary: draft.jobTimeoutMinutes === '0' ? 'No timeout' : `${draft.jobTimeoutMinutes} minutes`,
      editable: true
    },
    {
      key: 'notificationsEnabled',
      label: 'Show desktop notifications',
      summary: draft.notificationsEnabled ? 'Enabled' : 'Disabled',
      editable: true
    },
    { key: 'redditAppName', label: 'Reddit app name', summary: redditAppNameSummary, editable: true },
    { key: 'redditClientId', label: 'Reddit client ID', summary: redditClientIdSummary, editable: true },
    {
      key: 'redditClientSecret',
      label: 'Reddit client secret',
      summary: redditClientSecretSummary,
      editable: true
    },
    { key: 'save', label: 'Save changes', summary: '', editable: false },
    { key: 'cancel', label: 'Cancel', summary: '', editable: false }
  ];
}

export function buildSettingsSaveResult(
  draft: SettingsDraft,
  draftSecrets: SettingsDraftSecrets,
  currentRedditCredentials: RedditCredentialState,
  clearedFields: Set<EditableSettingKey> = new Set()
): SaveResult {
  const model = draft.model.trim();
  if (!model) {
    return { ok: false, error: 'Model cannot be empty.' };
  }

  const temperature = parseRequiredNumber(draft.temperature);
  if (temperature === null || temperature < 0 || temperature > 2) {
    return { ok: false, error: 'Temperature must be a number from 0.0 to 2.0.' };
  }

  const maxTokens = parseRequiredInteger(draft.maxTokens);
  if (maxTokens === null || maxTokens <= 0) {
    return { ok: false, error: 'Max tokens must be a positive integer.' };
  }

  const topP = parseRequiredNumber(draft.topP);
  if (topP === null || topP < 0 || topP > 1) {
    return { ok: false, error: 'Top P must be a number from 0.0 to 1.0.' };
  }

  const cronIntervalMinutes = parseRequiredInteger(draft.cronIntervalMinutes);
  if (cronIntervalMinutes === null || cronIntervalMinutes < 1) {
    return { ok: false, error: 'Scan interval must be an integer greater than or equal to 1.' };
  }

  const jobTimeoutMinutes = parseRequiredInteger(draft.jobTimeoutMinutes);
  if (jobTimeoutMinutes === null || jobTimeoutMinutes < 0) {
    return { ok: false, error: 'Job timeout must be an integer greater than or equal to 0.' };
  }

  const redditCredentials: RedditCredentialsUpdate = {
    appName: clearedFields.has('redditAppName') ? '' : draft.redditAppName.trim(),
    clientId: clearedFields.has('redditClientId') ? '' : draft.redditClientId.trim(),
    ...(draftSecrets.redditClientSecret
      ? { clientSecret: draftSecrets.redditClientSecret }
      : {})
  };

  const hasRedditCredentialChange =
    redditCredentials.appName !== currentRedditCredentials.appName ||
    redditCredentials.clientId !== currentRedditCredentials.clientId ||
    Boolean(redditCredentials.clientSecret) ||
    clearedFields.has('redditAppName') ||
    clearedFields.has('redditClientId');

  return {
    ok: true,
    result: {
      ...(draftSecrets.apiKey ? { apiKey: draftSecrets.apiKey } : {}),
      ...(hasRedditCredentialChange ? { redditCredentials } : {}),
      settings: {
        model,
        modelSettings: {
          temperature,
          maxTokens,
          topP
        },
        cronIntervalMinutes,
        jobTimeoutMs: Math.round(jobTimeoutMinutes * 60000),
        notificationsEnabled: !!draft.notificationsEnabled
      }
    }
  };
}
