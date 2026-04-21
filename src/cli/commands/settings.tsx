import React from 'react';
import { render } from 'ink';
import { SettingsFlow } from '../flows/settingsFlow.js';
import { SettingsRepository } from '../../services/db/repositories/settingsRepo.js';
import {
  getOpenRouterApiKey,
  isKeytarAvailable,
  setOpenRouterApiKey
} from '../../services/security/secretStore.js';
import { printInfo, printSuccess, printWarning } from '../ui/consoleUi.js';
import type { RedditCredentialsUpdate } from '../../types/settings.js';

interface SettingsFlowResult {
  apiKey?: string;
  redditCredentials?: RedditCredentialsUpdate;
  settings: {
    model: string;
    modelSettings: {
      temperature: number;
      maxTokens: number;
      topP: number;
    };
    cronIntervalMinutes: number;
    jobTimeoutMs: number;
    notificationsEnabled: boolean;
  };
}

export async function openSettings(): Promise<void> {
  const settingsRepo = new SettingsRepository();
  const current = settingsRepo.getAppSettings();
  const keytarAvailable = await isKeytarAvailable();
  const currentRedditCredentials = await settingsRepo.getRedditCredentialState();
  const currentApiKey = await getOpenRouterApiKey();

  let result: SettingsFlowResult | null = null;
  const app = render(
    <SettingsFlow
      current={current}
      keytarAvailable={keytarAvailable}
      currentRedditCredentials={currentRedditCredentials}
      currentApiKey={currentApiKey}
      onDone={(value) => {
        result = value;
      }}
    />
  );

  await app.waitUntilExit();
  const finalResult = result as SettingsFlowResult | null;
  if (!finalResult) {
    printWarning('Settings unchanged.');
    return;
  }

  if (!keytarAvailable && (finalResult.apiKey || finalResult.redditCredentials?.clientSecret)) {
    printWarning('Keychain storage is unavailable. Secret values entered in settings were not saved.');
    printInfo('Use environment variables instead:');
    printInfo('  SNOOPY_OPENROUTER_API_KEY');
    printInfo('  SNOOPY_REDDIT_CLIENT_SECRET');
  }

  if (finalResult.apiKey) {
    if (keytarAvailable) {
      await setOpenRouterApiKey(finalResult.apiKey);
    }
  }

  if (finalResult.redditCredentials) {
    const redditCredentials = keytarAvailable
      ? finalResult.redditCredentials
      : { ...finalResult.redditCredentials, clientSecret: undefined };
    await settingsRepo.setRedditCredentials(redditCredentials);
  }

  settingsRepo.setAppSettings(finalResult.settings);
  printSuccess('Settings saved.');
}
