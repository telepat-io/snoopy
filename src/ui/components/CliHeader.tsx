import React from 'react';
import { Box, Text } from 'ink';
import { uiTheme } from '../theme.js';

export const SNOOPY_WORDMARK = '❨･¨⬮';

interface CliHeaderProps {
  subtitle?: string;
  compact?: boolean;
}

export function CliHeader({ subtitle, compact = false }: CliHeaderProps): React.JSX.Element {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={uiTheme.ink.accentStrong} bold>
        {SNOOPY_WORDMARK}
      </Text>
      {subtitle ? <Text color={uiTheme.ink.info}>{subtitle}</Text> : null}
      {compact ? <Text color={uiTheme.ink.textMuted}>Compact view</Text> : null}
    </Box>
  );
}
