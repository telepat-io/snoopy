import React, { useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TextPrompt } from '../../ui/components/TextPrompt.js';
import { YesNoSelector } from '../../ui/components/YesNoSelector.js';
import { CliHeader } from '../../ui/components/CliHeader.js';
import {
  type AppSettings,
  type RedditCredentialState,
  type RedditCredentialsUpdate
} from '../../types/settings.js';
import {
  buildSettingsMenuItems,
  buildSettingsSaveResult,
  createSettingsDraft,
  type EditableSettingKey,
  type SettingsDraftSecrets
} from './settingsFlowModel.js';

interface SettingsResult {
  apiKey?: string;
  redditCredentials?: RedditCredentialsUpdate;
  settings: AppSettings;
}

interface SettingsFlowProps {
  current: AppSettings;
  currentRedditCredentials: RedditCredentialState;
  currentApiKey: string | null;
  onDone: (result: SettingsResult) => void;
}

type Mode = 'menu' | 'edit' | 'confirmClear';

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

function labelForSettingKey(key: EditableSettingKey): string {
  switch (key) {
    case 'apiKey':
      return 'Set new OpenRouter API key (leave blank to keep current)';
    case 'model':
      return 'Default model';
    case 'temperature':
      return 'Tehey mperature (0.0 - 2.0)';
    case 'maxTokens':
      return 'Max tokens';
    case 'topP':
      return 'Top P (0.0 - 1.0)';
    case 'cronIntervalMinutes':
      return 'Scan interval in minutes (e.g. 30)';
    case 'jobTimeoutMinutes':
      return 'Job timeout in minutes (0 = no timeout)';
    case 'notificationsEnabled':
      return 'Show desktop notifications';
    case 'redditAppName':
      return 'Reddit app name for OAuth fallback';
    case 'redditClientId':
      return 'Reddit client ID for OAuth fallback';
    case 'redditClientSecret':
      return 'Reddit client secret for OAuth fallback (leave blank to keep current)';
  }
}

function keyToDraftField(key: Exclude<EditableSettingKey, 'apiKey' | 'redditClientSecret'>): keyof ReturnType<typeof createSettingsDraft> {
  switch (key) {
    case 'model':
      return 'model';
    case 'temperature':
      return 'temperature';
    case 'maxTokens':
      return 'maxTokens';
    case 'topP':
      return 'topP';
    case 'cronIntervalMinutes':
      return 'cronIntervalMinutes';
    case 'jobTimeoutMinutes':
      return 'jobTimeoutMinutes';
    case 'notificationsEnabled':
      return 'notificationsEnabled';
    case 'redditAppName':
      return 'redditAppName';
    case 'redditClientId':
      return 'redditClientId';
  }
}

export function SettingsFlow({ current, currentRedditCredentials, currentApiKey, onDone }: SettingsFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [mode, setMode] = useState<Mode>('menu');
  const [cursor, setCursor] = useState(0);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => createSettingsDraft(current, currentRedditCredentials));
  const [draftSecrets, setDraftSecrets] = useState<SettingsDraftSecrets>({});
  const [editingKey, setEditingKey] = useState<EditableSettingKey | null>(null);
  const [clearedFields, setClearedFields] = useState<Set<EditableSettingKey>>(new Set());

  const menuItems = useMemo(
    () =>
      buildSettingsMenuItems({
        draft,
        draftSecrets,
        currentApiKey,
        hasCurrentRedditClientSecret: currentRedditCredentials.hasClientSecret,
        clearedFields
      }),
    [currentApiKey, currentRedditCredentials.hasClientSecret, draft, draftSecrets, clearedFields]
  );

  useInput((_, key) => {
    if (mode === 'edit' && editingKey === 'notificationsEnabled') {
      if (key.return) {
        setDraft((prev) => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }));
        setMode('menu');
        setEditingKey(null);
      } else if (key.escape) {
        setMode('menu');
        setEditingKey(null);
      }
      return;
    }

    if (mode !== 'menu') {
      return;
    }

    if (key.upArrow) {
      setCursor((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      return;
    }

    if (key.downArrow) {
      setCursor((prev) => (prev + 1) % menuItems.length);
      return;
    }

    if (key.escape) {
      exit();
      return;
    }

    if (!key.return) {
      return;
    }

    const selected = menuItems[cursor];
    if (!selected) {
      return;
    }

    if (selected.key === 'cancel') {
      exit();
      return;
    }

    if (selected.key === 'save') {
      const saveResult = buildSettingsSaveResult(draft, draftSecrets, currentRedditCredentials, clearedFields);
      if (!saveResult.ok) {
        setMenuError(saveResult.error);
        return;
      }

      onDone(saveResult.result);
      exit();
      return;
    }

    setMenuError(null);
    setEditingKey(selected.key);
    setMode('edit');
  });

  if (mode === 'menu') {
    return (
      <SettingsFrame>
        <Text color="cyan">Choose a setting to edit. Press Enter to select.</Text>
        <Text color="gray">Use Up/Down arrows to navigate. Esc or Cancel exits without saving.</Text>
        <Box flexDirection="column" marginTop={1}>
          {menuItems.map((item, index) => {
            const isCursor = index === cursor;
            const value = item.summary ? `: ${item.summary}` : '';
            return (
              <Text key={item.key} color={isCursor ? 'yellow' : 'white'}>
                {isCursor ? '>' : ' '} {item.label}{value}
              </Text>
            );
          })}
        </Box>
        {menuError ? (
          <Text color="red">{menuError}</Text>
        ) : null}
      </SettingsFrame>
    );
  }

  if (mode === 'confirmClear' && editingKey) {
    return (
      <SettingsFrame>
        <YesNoSelector
          label="Clear this field?"
          defaultValue={false}
          onSubmit={(shouldClear) => {
            if (shouldClear) {
              setClearedFields((prev) => new Set([...prev, editingKey]));
            }
            setMode('menu');
            setEditingKey(null);
          }}
        />
      </SettingsFrame>
    );
  }

  if (!editingKey) {
    return (
      <SettingsFrame>
        <Text color="red">No setting selected. Press Esc to exit.</Text>
      </SettingsFrame>
    );
  }

  const isSecret = editingKey === 'apiKey' || editingKey === 'redditClientSecret';

  if (editingKey === 'notificationsEnabled') {
    return (
      <SettingsFrame>
        <Text>
          {labelForSettingKey(editingKey)}: {draft.notificationsEnabled ? 'Enabled' : 'Disabled'}
        </Text>
        <Text color="gray">Press Enter to toggle, Esc to cancel.</Text>
      </SettingsFrame>
    );
  }

  const initialValue =
    editingKey === 'apiKey' || editingKey === 'redditClientSecret'
      ? ''
      : draft[keyToDraftField(editingKey)];

  const fieldHasCurrentValue = Boolean(initialValue);
  const helpText = fieldHasCurrentValue ? 'Press Enter with empty value to clear' : 'Press Enter to continue';

  return (
    <SettingsFrame>
      <TextPrompt
        label={labelForSettingKey(editingKey)}
        initialValue={initialValue as string}
        secret={isSecret}
        onSubmit={(value) => {
          if (value === '' && fieldHasCurrentValue && editingKey !== 'model') {
            setMode('confirmClear');
            return;
          }

          if (editingKey === 'apiKey') {
            if (value) {
              setDraftSecrets((prev) => ({ ...prev, apiKey: value }));
            }
          } else if (editingKey === 'redditClientSecret') {
            if (value) {
              setDraftSecrets((prev) => ({ ...prev, redditClientSecret: value }));
            }
          } else if (value) {
            const field = keyToDraftField(editingKey);
            setDraft((prev) => ({ ...prev, [field]: value }));
          }

          setMode('menu');
          setEditingKey(null);
        }}
      />
      {!isSecret && <Text color="gray">{helpText}</Text>}
    </SettingsFrame>
  );
}
