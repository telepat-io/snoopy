import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { CliHeader } from './CliHeader.js';
import { shouldUseCompactLayout, uiTheme } from '../theme.js';

type StatusTone = 'info' | 'success' | 'warning' | 'danger';

interface AppFrameProps {
  subtitle: string;
  children: React.ReactNode;
  description?: string;
  statusText?: string;
  statusTone?: StatusTone;
  hints?: string[];
}

interface PanelProps {
  title?: string;
  children: React.ReactNode;
}

function statusColor(tone: StatusTone): 'blue' | 'green' | 'yellow' | 'red' {
  switch (tone) {
    case 'info':
      return uiTheme.ink.info;
    case 'success':
      return uiTheme.ink.success;
    case 'warning':
      return uiTheme.ink.warning;
    case 'danger':
      return uiTheme.ink.danger;
  }
}

export function Panel({ title, children }: PanelProps): React.JSX.Element {
  return (
    <Box flexDirection="column" marginTop={1} paddingLeft={1}>
      {title ? (
        <Text color={uiTheme.ink.accent} bold>
          {title}
        </Text>
      ) : null}
      <Box flexDirection="column">{children}</Box>
    </Box>
  );
}

export function AppFrame({
  subtitle,
  children,
  description,
  statusText,
  statusTone = 'info',
  hints = []
}: AppFrameProps): React.JSX.Element {
  const stdout = useStdout();
  const columns = stdout.stdout.columns ?? 80;
  const compact = shouldUseCompactLayout(columns);

  return (
    <Box flexDirection="column">
      <CliHeader subtitle={subtitle} compact={compact} />
      {description ? <Text color={uiTheme.ink.textMuted}>{description}</Text> : null}
      <Box flexDirection="column" marginTop={description ? 1 : 0}>
        {children}
      </Box>
      {statusText ? (
        <Box marginTop={1} flexDirection="column">
          <Text color={statusColor(statusTone)}>{statusText}</Text>
          {!compact && hints.length > 0 ? <Text color={uiTheme.ink.textMuted}>{hints.join(' | ')}</Text> : null}
        </Box>
      ) : null}
    </Box>
  );
}
