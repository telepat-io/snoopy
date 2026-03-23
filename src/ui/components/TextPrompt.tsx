import React from 'react';
import { Box, Text } from 'ink';
import { PasswordInput, TextInput } from '@inkjs/ui';

interface TextPromptProps {
  label: string;
  placeholder?: string;
  secret?: boolean;
  initialValue?: string;
  onSubmit: (value: string) => void;
}

export function TextPrompt({
  label,
  placeholder,
  secret = false,
  initialValue = '',
  onSubmit
}: TextPromptProps): React.JSX.Element {
  const inputKey = `${secret ? 'secret' : 'text'}:${label}:${initialValue}`;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan">{label}</Text>
      {secret ? (
        <PasswordInput
          key={inputKey}
          placeholder={placeholder}
          onSubmit={(value) => {
            onSubmit(value.trim());
          }}
        />
      ) : (
        <TextInput
          key={inputKey}
          defaultValue={initialValue}
          placeholder={placeholder}
          onSubmit={(value) => {
            onSubmit(value.trim());
          }}
        />
      )}
      <Text color="gray">Press Enter to continue</Text>
    </Box>
  );
}
