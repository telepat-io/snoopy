export const DEFAULT_MODEL = 'moonshotai/kimi-k2.5';
export const DEFAULT_CRON_INTERVAL_MINUTES = 30;
export const DEFAULT_JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function intervalToCron(minutes: number): string {
  const m = Math.max(1, Math.floor(minutes));
  return m === 1 ? '* * * * *' : `*/${m} * * * *`;
}

export interface ModelSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface AppSettings {
  model: string;
  modelSettings: ModelSettings;
  cronIntervalMinutes: number;
  jobTimeoutMs: number;
}

export interface RedditCredentials {
  appName: string;
  clientId: string;
  clientSecret: string;
}

export interface RedditCredentialState {
  appName: string;
  clientId: string;
  hasClientSecret: boolean;
}

export interface RedditCredentialsUpdate {
  appName: string;
  clientId: string;
  clientSecret?: string;
}

export interface StoredSetting {
  key: string;
  value: string;
}
