import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface SubredditMultiSelectProps {
  options: string[];
  onDone: (subreddits: string[]) => void;
}

function normalizeSubreddit(value: string): string {
  return value.replace(/^r\//i, '').replace(/\s+/g, '').trim();
}

export function SubredditMultiSelect({ options, onDone }: SubredditMultiSelectProps): React.JSX.Element {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set(options.slice(0, 2)));
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');

  useInput((input, key) => {
    if (customMode) {
      if (key.return) {
        const normalized = normalizeSubreddit(customInput);
        if (normalized) {
          selected.add(normalized);
          setSelected(new Set(selected));
        }
        setCustomInput('');
        setCustomMode(false);
        return;
      }

      if (key.escape) {
        setCustomMode(false);
        setCustomInput('');
        return;
      }

      if (key.backspace || key.delete) {
        setCustomInput((prev) => prev.slice(0, -1));
        return;
      }

      if (!key.ctrl && !key.meta && input) {
        setCustomInput((prev) => prev + input);
      }
      return;
    }

    if (key.upArrow) {
      setCursor((prev) => (prev - 1 + options.length) % options.length);
      return;
    }

    if (key.downArrow) {
      setCursor((prev) => (prev + 1) % options.length);
      return;
    }

    if (input === ' ') {
      const value = options[cursor];
      if (!value) {
        return;
      }

      if (selected.has(value)) {
        selected.delete(value);
      } else {
        selected.add(value);
      }
      setSelected(new Set(selected));
      return;
    }

    if (input.toLowerCase() === 'a') {
      setCustomMode(true);
      return;
    }

    if (key.return) {
      onDone(Array.from(selected));
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan">Choose subreddits (Up/Down, Space to toggle, A to add custom, Enter to finish)</Text>
      {options.map((option, index) => {
        const isCursor = index === cursor;
        const isSelected = selected.has(option);
        return (
          <Text key={option} color={isCursor ? 'yellow' : 'white'}>
            {isCursor ? '>' : ' '} {isSelected ? '[x]' : '[ ]'} r/{option}
          </Text>
        );
      })}
      {customMode ? (
        <>
          <Text color="magenta">Custom subreddit (no r/ needed)</Text>
          <Text>{'> '}{customInput}</Text>
          <Text color="gray">Enter to add, Esc to cancel</Text>
        </>
      ) : null}
    </Box>
  );
}
