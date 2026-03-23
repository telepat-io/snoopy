import React from 'react';
import { Box, Text } from 'ink';

export const SNOOPY_WORDMARK = '❨･¨⬮    ꜱ ɴ ᴏ ᴏ ᴘ ʏ';

interface CliHeaderProps {
  subtitle?: string;
}

export function CliHeader({ subtitle }: CliHeaderProps): React.JSX.Element {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyanBright" bold>
        {SNOOPY_WORDMARK}
      </Text>
      {subtitle ? <Text color="blueBright">{subtitle}</Text> : null}
    </Box>
  );
}
