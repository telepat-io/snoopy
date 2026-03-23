import crypto from 'node:crypto';
import { getDb } from '../sqlite.js';
import {
  DEFAULT_MODEL,
  DEFAULT_CRON_INTERVAL_MINUTES,
  DEFAULT_JOB_TIMEOUT_MS,
  type AppSettings,
  type ModelSettings,
  type RedditCredentials,
  type RedditCredentialState,
  type RedditCredentialsUpdate
} from '../../../types/settings.js';
import {
  getRedditClientSecret,
  setRedditClientSecret
} from '../../security/secretStore.js';

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  temperature: 0.3,
  maxTokens: 800,
  topP: 1
};

function normalizeModel(model: string | null): string {
  const value = model?.trim();
  return value && value.length > 0 ? value : DEFAULT_MODEL;
}

function generateDefaultRedditAppName(): string {
  return `snoopy-${crypto.randomBytes(4).toString('hex')}`;
}

export class SettingsRepository {
  private readonly db = getDb();

  get(key: string): string | null {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = datetime('now')`
      )
      .run(key, value);
  }

  delete(key: string): void {
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  }

  getAppSettings(): AppSettings {
    const rawModel = this.get('model');
    const modelSettingsRaw = this.get('model_settings_json');
    const parsed = modelSettingsRaw
      ? (JSON.parse(modelSettingsRaw) as ModelSettings)
      : DEFAULT_MODEL_SETTINGS;

    const rawCronInterval = this.get('cron_interval_minutes');
    const cronIntervalMinutes = rawCronInterval
      ? Math.max(1, Number(rawCronInterval) || DEFAULT_CRON_INTERVAL_MINUTES)
      : DEFAULT_CRON_INTERVAL_MINUTES;

    const rawJobTimeout = this.get('job_timeout_ms');
    const jobTimeoutMs = rawJobTimeout
      ? Math.max(0, Number(rawJobTimeout) || DEFAULT_JOB_TIMEOUT_MS)
      : DEFAULT_JOB_TIMEOUT_MS;

    const settings: AppSettings = {
      model: normalizeModel(rawModel),
      modelSettings: {
        ...DEFAULT_MODEL_SETTINGS,
        ...parsed
      },
      cronIntervalMinutes,
      jobTimeoutMs
    };

    if (rawModel !== settings.model || modelSettingsRaw === null) {
      this.setAppSettings(settings);
    }

    return settings;
  }

  setAppSettings(settings: AppSettings): void {
    this.set('model', normalizeModel(settings.model));
    this.set(
      'model_settings_json',
      JSON.stringify({
        ...DEFAULT_MODEL_SETTINGS,
        ...settings.modelSettings
      })
    );
    this.set('cron_interval_minutes', String(Math.max(1, settings.cronIntervalMinutes ?? DEFAULT_CRON_INTERVAL_MINUTES)));
    this.set('job_timeout_ms', String(Math.max(0, settings.jobTimeoutMs ?? DEFAULT_JOB_TIMEOUT_MS)));
  }

  private getOrCreateRedditAppName(): string {
    const appName = this.get('reddit_app_name')?.trim() ?? '';
    if (appName) {
      return appName;
    }

    const generated = generateDefaultRedditAppName();
    this.set('reddit_app_name', generated);
    return generated;
  }

  private async migrateLegacyRedditClientSecret(): Promise<void> {
    const legacySecret = this.get('reddit_client_secret')?.trim() ?? '';
    if (!legacySecret) {
      return;
    }

    const existingSecret = await getRedditClientSecret();
    if (!existingSecret) {
      await setRedditClientSecret(legacySecret);
    }

    this.delete('reddit_client_secret');
  }

  async getRedditCredentialState(): Promise<RedditCredentialState> {
    await this.migrateLegacyRedditClientSecret();

    const appName = this.getOrCreateRedditAppName();
    const clientId = this.get('reddit_client_id')?.trim() ?? '';
    const clientSecret = await getRedditClientSecret();

    return {
      appName,
      clientId,
      hasClientSecret: Boolean(clientSecret?.trim())
    };
  }

  async getRedditCredentials(): Promise<RedditCredentials | null> {
    await this.migrateLegacyRedditClientSecret();

    const appName = this.getOrCreateRedditAppName();
    const clientId = this.get('reddit_client_id')?.trim() ?? '';
    const clientSecret = (await getRedditClientSecret())?.trim() ?? '';

    if (!clientId || !clientSecret) {
      return null;
    }

    return {
      appName,
      clientId,
      clientSecret
    };
  }

  async setRedditCredentials(update: RedditCredentialsUpdate | RedditCredentials): Promise<void> {
    this.set('reddit_app_name', update.appName.trim());
    this.set('reddit_client_id', update.clientId.trim());

    const secret = update.clientSecret?.trim();
    if (secret) {
      await setRedditClientSecret(secret);
    }
  }
}
