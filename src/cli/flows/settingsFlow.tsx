import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import { TextPrompt } from '../../ui/components/TextPrompt.js';
import { CliHeader } from '../../ui/components/CliHeader.js';
import {
  DEFAULT_MODEL,
  DEFAULT_CRON_INTERVAL_MINUTES,
  DEFAULT_JOB_TIMEOUT_MS,
  type AppSettings,
  type RedditCredentialState,
  type RedditCredentialsUpdate
} from '../../types/settings.js';

interface SettingsResult {
  apiKey?: string;
  redditCredentials?: RedditCredentialsUpdate;
  settings: AppSettings;
}

interface SettingsFlowProps {
  current: AppSettings;
  currentRedditCredentials: RedditCredentialState;
  hasApiKey: boolean;
  onDone: (result: SettingsResult) => void;
}

type Stage =
  | 'apiKey'
  | 'model'
  | 'temperature'
  | 'maxTokens'
  | 'topP'
  | 'cronIntervalMinutes'
  | 'jobTimeoutMinutes'
  | 'redditAppName'
  | 'redditClientId'
  | 'redditClientSecret'
  | 'confirm';

interface SettingsFrameProps {
  children: React.ReactNode;
}

function SettingsFrame({ children }: SettingsFrameProps): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <CliHeader subtitle="Settings" />
      {children}
    </Box>
  );
}

export function SettingsFlow({ current, currentRedditCredentials, hasApiKey, onDone }: SettingsFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [stage, setStage] = useState<Stage>('apiKey');
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const defaultModel = current.model.trim() || DEFAULT_MODEL;
  const [model, setModel] = useState(defaultModel);
  const [temperature, setTemperature] = useState(String(current.modelSettings.temperature));
  const [maxTokens, setMaxTokens] = useState(String(current.modelSettings.maxTokens));
  const [topP, setTopP] = useState(String(current.modelSettings.topP));
  const [cronIntervalMinutes, setCronIntervalMinutes] = useState(
    String(current.cronIntervalMinutes ?? DEFAULT_CRON_INTERVAL_MINUTES)
  );
  const [jobTimeoutMinutes, setJobTimeoutMinutes] = useState(
    String(Math.round((current.jobTimeoutMs ?? DEFAULT_JOB_TIMEOUT_MS) / 60000))
  );
  const [redditAppName, setRedditAppName] = useState<string | undefined>(undefined);
  const [redditClientId, setRedditClientId] = useState<string | undefined>(undefined);
  const [redditClientSecret, setRedditClientSecret] = useState<string | undefined>(undefined);

  if (stage === 'apiKey') {
    return (
      <SettingsFrame>
        <Text color="cyan">Current API key: {hasApiKey ? 'Configured' : 'Missing'}</Text>
        <TextPrompt
          label="Set new OpenRouter API key (leave blank to keep current)"
          secret
          onSubmit={(value) => {
            if (value) {
              setApiKey(value);
            }
            setStage('model');
          }}
        />
      </SettingsFrame>
    );
  }

  if (stage === 'model') {
    return (
      <SettingsFrame>
        <TextPrompt
          label="Default model"
          initialValue={model.trim() || defaultModel}
          onSubmit={(value) => {
            setModel(value.trim() || defaultModel);
            setStage('temperature');
          }}
        />
      </SettingsFrame>
    );
  }

  if (stage === 'temperature') {
    return (
      <SettingsFrame>
        <TextPrompt
          label="Temperature (0.0 - 2.0)"
          initialValue={temperature}
          onSubmit={(value) => {
            setTemperature(value || temperature);
            setStage('maxTokens');
          }}
        />
      </SettingsFrame>
    );
  }

  if (stage === 'maxTokens') {
    return (
      <SettingsFrame>
        <TextPrompt
          label="Max tokens"
          initialValue={maxTokens}
          onSubmit={(value) => {
            setMaxTokens(value || maxTokens);
            setStage('topP');
          }}
        />
      </SettingsFrame>
    );
  }

  if (stage === 'topP') {
    return (
      <SettingsFrame>
        <TextPrompt
          label="Top P (0.0 - 1.0)"
          initialValue={topP}
          onSubmit={(value) => {
            setTopP(value || topP);
            setStage('cronIntervalMinutes');
          }}
        />
      </SettingsFrame>
    );
  }

  if (stage === 'cronIntervalMinutes') {
    return (
      <SettingsFrame>
        <TextPrompt
          label="Scan interval in minutes (e.g. 30)"
          initialValue={cronIntervalMinutes}
          onSubmit={(value) => {
            setCronIntervalMinutes(value || cronIntervalMinutes);
            setStage('jobTimeoutMinutes');
          }}
        />
      </SettingsFrame>
    );
  }

  if (stage === 'jobTimeoutMinutes') {
    return (
      <SettingsFrame>
        <TextPrompt
          label="Job timeout in minutes (0 = no timeout)"
          initialValue={jobTimeoutMinutes}
          onSubmit={(value) => {
            setJobTimeoutMinutes(value !== '' ? value : jobTimeoutMinutes);
            setStage('redditAppName');
          }}
        />
      </SettingsFrame>
    );
  }

  if (stage === 'redditAppName') {
    return (
      <SettingsFrame>
        <Text color="cyan">Reddit fallback app name: {currentRedditCredentials.appName}</Text>
        <TextPrompt
          label="Reddit app name for OAuth fallback (leave blank to keep current)"
          initialValue={currentRedditCredentials.appName}
          onSubmit={(value) => {
            if (value) {
              setRedditAppName(value);
            }
            setStage('redditClientId');
          }}
        />
      </SettingsFrame>
    );
  }

  if (stage === 'redditClientId') {
    return (
      <SettingsFrame>
        <Text color="cyan">Reddit fallback client ID: {currentRedditCredentials.clientId ? 'Configured' : 'Missing'}</Text>
        <TextPrompt
          label="Reddit client ID for OAuth fallback (leave blank to keep current)"
          initialValue={currentRedditCredentials.clientId}
          onSubmit={(value) => {
            if (value) {
              setRedditClientId(value);
            }
            setStage('redditClientSecret');
          }}
        />
      </SettingsFrame>
    );
  }

  if (stage === 'redditClientSecret') {
    return (
      <SettingsFrame>
        <Text color="cyan">Reddit fallback client secret: {currentRedditCredentials.hasClientSecret ? 'Configured' : 'Missing'}</Text>
        <TextPrompt
          label="Reddit client secret for OAuth fallback (leave blank to keep current)"
          secret
          onSubmit={(value) => {
            if (value) {
              setRedditClientSecret(value);
            }
            setStage('confirm');
          }}
        />
      </SettingsFrame>
    );
  }

  const nextRedditCredentials = {
    appName: redditAppName ?? currentRedditCredentials.appName,
    clientId: redditClientId ?? currentRedditCredentials.clientId,
    clientSecret: redditClientSecret
  };

  const hasCompleteRedditCredentials =
    Boolean(nextRedditCredentials.appName) &&
    Boolean(nextRedditCredentials.clientId) &&
    Boolean(nextRedditCredentials.clientSecret || currentRedditCredentials.hasClientSecret);

  return (
    <SettingsFrame>
      <Text bold color="green">Review settings</Text>
      <Text>Model: {model}</Text>
      <Text>Temperature: {temperature}</Text>
      <Text>Max tokens: {maxTokens}</Text>
      <Text>Top P: {topP}</Text>
      <Text>Scan interval: {cronIntervalMinutes} minutes</Text>
      <Text>Job timeout: {jobTimeoutMinutes === '0' ? 'No timeout' : `${jobTimeoutMinutes} minutes`}</Text>
      <Text>Reddit OAuth fallback: {hasCompleteRedditCredentials ? 'configured' : 'missing fields'}</Text>
      <TextPrompt
        label="Save settings? (y/n)"
        initialValue="y"
        onSubmit={(value) => {
          if (value.toLowerCase().startsWith('y')) {
            onDone({
              apiKey,
              redditCredentials: {
                appName: nextRedditCredentials.appName,
                clientId: nextRedditCredentials.clientId,
                ...(nextRedditCredentials.clientSecret ? { clientSecret: nextRedditCredentials.clientSecret } : {})
              },
              settings: {
                model,
                modelSettings: {
                  temperature: Number(temperature),
                  maxTokens: Number(maxTokens),
                  topP: Number(topP)
                },
                cronIntervalMinutes: Math.max(1, Number(cronIntervalMinutes) || DEFAULT_CRON_INTERVAL_MINUTES),
                jobTimeoutMs: Math.max(0, Math.round(Number(jobTimeoutMinutes) * 60000))
              }
            });
          }
          exit();
        }}
      />
    </SettingsFrame>
  );
}
