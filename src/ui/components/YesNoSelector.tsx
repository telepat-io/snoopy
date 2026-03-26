import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  cursorForDefaultValue,
  moveCursor,
  parseYesNoShortcut,
  selectionFromCursor
} from './yesNoSelectorModel.js';

interface YesNoSelectorProps {
  label: string;
  defaultValue?: boolean;
  yesLabel?: string;
  noLabel?: string;
  onSubmit: (value: boolean) => void;
}

export function YesNoSelector({
  label,
  defaultValue = true,
  yesLabel = 'Yes',
  noLabel = 'No',
  onSubmit
}: YesNoSelectorProps): React.JSX.Element {
  const [cursor, setCursor] = useState<0 | 1>(cursorForDefaultValue(defaultValue));

  useInput((input, key) => {
    const shortcutChoice = parseYesNoShortcut(input);
    if (shortcutChoice !== null) {
      onSubmit(shortcutChoice);
      return;
    }

    if (key.return) {
      onSubmit(selectionFromCursor(cursor));
      return;
    }

    const nextCursor = moveCursor(cursor, key);
    if (nextCursor !== cursor) {
      setCursor(nextCursor);
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan">{label}</Text>
      <Text color={cursor === 0 ? 'yellow' : 'white'}>{cursor === 0 ? '>' : ' '} {yesLabel}</Text>
      <Text color={cursor === 1 ? 'yellow' : 'white'}>{cursor === 1 ? '>' : ' '} {noLabel}</Text>
      <Text color="gray">Use Up/Down to switch, Enter to confirm, or press Y/N.</Text>
    </Box>
  );
}
