import React from 'react';
import { render } from 'ink';
import { SettingsFlow } from '../flows/settingsFlow.js';
import { SettingsRepository } from '../../services/db/repositories/settingsRepo.js';
import { getOpenRouterApiKey, setOpenRouterApiKey } from '../../services/security/secretStore.js';
import { printSuccess, printWarning } from '../ui/consoleUi.js';
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
  };
}

export async function openSettings(): Promise<void> {
  const settingsRepo = new SettingsRepository();
  const current = settingsRepo.getAppSettings();
  const currentRedditCredentials = await settingsRepo.getRedditCredentialState();
  const hasApiKey = Boolean(await getOpenRouterApiKey());

  let result: SettingsFlowResult | null = null;
  const app = render(
    <SettingsFlow
      current={current}
      currentRedditCredentials={currentRedditCredentials}
      hasApiKey={hasApiKey}
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

  if (finalResult.apiKey) {
    await setOpenRouterApiKey(finalResult.apiKey);
  }

  if (finalResult.redditCredentials) {
    await settingsRepo.setRedditCredentials(finalResult.redditCredentials);
  }

  settingsRepo.setAppSettings(finalResult.settings);
  printSuccess('Settings saved.');
}
