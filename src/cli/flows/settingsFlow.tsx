import React, { useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TextPrompt } from '../../ui/components/TextPrompt.js';
import { YesNoSelector } from '../../ui/components/YesNoSelector.js';
import { AppFrame, Panel } from '../../ui/components/AppFrame.js';
import { uiTheme } from '../../ui/theme.js';
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
  keytarAvailable: boolean;
  currentRedditCredentials: RedditCredentialState;
  currentApiKey: string | null;
  onDone: (result: SettingsResult) => void;
}

type Mode = 'menu' | 'edit' | 'confirmClear';

interface SettingsFrameProps {
  children: React.ReactNode;
  statusText?: string;
  statusTone?: 'info' | 'success' | 'warning' | 'danger';
}

function SettingsFrame({ children, statusText, statusTone = 'info' }: SettingsFrameProps): React.JSX.Element {
  return (
    <AppFrame
      subtitle="Settings"
      statusText={statusText}
      statusTone={statusTone}
      hints={['Up/Down: move', 'Enter: select/confirm', 'Esc: cancel or exit']}
    >
      {children}
    </AppFrame>
  );
}

function labelForSettingKey(key: EditableSettingKey): string {
  switch (key) {
    case 'apiKey':
      return 'Set new OpenRouter API key (leave blank to keep current)';
    case 'model':
      return 'Default model';
    case 'temperature':
      return 'Temperature (0.0 - 2.0)';
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

export function SettingsFlow({
  current,
  keytarAvailable,
  currentRedditCredentials,
  currentApiKey,
  onDone
}: SettingsFlowProps): React.JSX.Element {
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
        keytarAvailable,
        currentApiKey,
        hasCurrentRedditClientSecret: currentRedditCredentials.hasClientSecret,
        clearedFields
      }),
    [keytarAvailable, currentApiKey, currentRedditCredentials.hasClientSecret, draft, draftSecrets, clearedFields]
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
    const storageStatus = keytarAvailable
      ? 'Keychain storage available for secret fields.'
      : 'Keychain storage unavailable. Use SNOOPY_OPENROUTER_API_KEY and SNOOPY_REDDIT_CLIENT_SECRET.';

    return (
      <SettingsFrame
        statusText={menuError ?? storageStatus}
        statusTone={menuError ? 'danger' : 'info'}
      >
        <Panel title="Settings Menu">
          <Text color={uiTheme.ink.accent}>Choose a setting to edit. Press Enter to select.</Text>
          <Text color={uiTheme.ink.textMuted}>Use Up/Down arrows to navigate. Esc or Cancel exits without saving.</Text>
          <Box flexDirection="column" marginTop={1}>
            {menuItems.map((item, index) => {
              const isCursor = index === cursor;
              const value = item.summary ? `: ${item.summary}` : '';
              return (
                <Text key={item.key} color={isCursor ? uiTheme.ink.focus : uiTheme.ink.textPrimary} inverse={isCursor}>
                  {isCursor ? '>' : ' '} {item.label}{value}
                </Text>
              );
            })}
          </Box>
        </Panel>
      </SettingsFrame>
    );
  }

  if (mode === 'confirmClear' && editingKey) {
    return (
      <SettingsFrame statusText="Confirm field clear" statusTone="warning">
        <Panel title="Confirmation">
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
        </Panel>
      </SettingsFrame>
    );
  }

  if (!editingKey) {
    return (
      <SettingsFrame statusText="No setting selected" statusTone="danger">
        <Panel title="Error">
          <Text color={uiTheme.ink.danger}>No setting selected. Press Esc to exit.</Text>
        </Panel>
      </SettingsFrame>
    );
  }

  const isSecret = editingKey === 'apiKey' || editingKey === 'redditClientSecret';

  if (editingKey === 'notificationsEnabled') {
    return (
      <SettingsFrame statusText="Toggle notifications" statusTone="info">
        <Panel title="Edit Setting">
          <Text>
            {labelForSettingKey(editingKey)}: {draft.notificationsEnabled ? 'Enabled' : 'Disabled'}
          </Text>
          <Text color={uiTheme.ink.textMuted}>Press Enter to toggle, Esc to cancel.</Text>
        </Panel>
      </SettingsFrame>
    );
  }

  const initialValue =
    editingKey === 'apiKey' || editingKey === 'redditClientSecret'
      ? ''
      : draft[keyToDraftField(editingKey)];

  const fieldHasCurrentValue = Boolean(initialValue);
  const helpText = fieldHasCurrentValue ? 'Press Enter with empty value to clear' : 'Press Enter to continue';
  const showSecretEnvHint = isSecret && !keytarAvailable;

  return (
    <SettingsFrame statusText="Editing setting" statusTone="info">
      <Panel title="Edit Setting">
        {showSecretEnvHint ? (
          <Text color={uiTheme.ink.warning}>
            Keychain storage is unavailable. Save is disabled for this secret; configure env vars instead.
          </Text>
        ) : null}
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
        {!isSecret ? <Text color={uiTheme.ink.textMuted}>{helpText}</Text> : null}
      </Panel>
    </SettingsFrame>
  );
}
