import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { resolveCustomSubreddit } from './subredditOptions.js';
import { uiTheme } from '../theme.js';

interface SubredditMultiSelectProps {
  options: string[];
  onDone: (subreddits: string[]) => void;
}

export function SubredditMultiSelect({ options, onDone }: SubredditMultiSelectProps): React.JSX.Element {
  const [displayOptions, setDisplayOptions] = useState(options);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set(options.slice(0, 2)));
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');

  useInput((input, key) => {
    if (customMode) {
      if (key.return) {
        const { normalized, nextOptions } = resolveCustomSubreddit(displayOptions, customInput);
        if (normalized) {
          setDisplayOptions(nextOptions);
          setSelected((previous) => {
            const next = new Set(previous);
            next.add(normalized);
            return next;
          });
          const nextIndex = nextOptions.indexOf(normalized);
          if (nextIndex >= 0) {
            setCursor(nextIndex);
          }
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
      if (displayOptions.length === 0) {
        return;
      }
      setCursor((prev) => (prev - 1 + displayOptions.length) % displayOptions.length);
      return;
    }

    if (key.downArrow) {
      if (displayOptions.length === 0) {
        return;
      }
      setCursor((prev) => (prev + 1) % displayOptions.length);
      return;
    }

    if (input === ' ') {
      const value = displayOptions[cursor];
      if (!value) {
        return;
      }

      setSelected((previous) => {
        const next = new Set(previous);
        if (next.has(value)) {
          next.delete(value);
        } else {
          next.add(value);
        }
        return next;
      });
      return;
    }

    if (input.toLowerCase() === 'a') {
      setCustomMode(true);
      return;
    }

    if (key.return) {
      onDone(displayOptions.filter((option) => selected.has(option)));
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={uiTheme.ink.accent}>Choose subreddits (Up/Down, Space to toggle, A to add custom, Enter to finish)</Text>
      {displayOptions.map((option, index) => {
        const isCursor = index === cursor;
        const isSelected = selected.has(option);
        return (
          <Text key={option} color={isCursor ? uiTheme.ink.focus : uiTheme.ink.textPrimary} inverse={isCursor}>
            {isCursor ? '>' : ' '} {isSelected ? '[x]' : '[ ]'} r/{option}
          </Text>
        );
      })}
      {customMode ? (
        <>
          <Text color={uiTheme.ink.info}>Custom subreddit (no r/ needed)</Text>
          <Text>{'> '}{customInput}</Text>
          <Text color={uiTheme.ink.textMuted}>Enter to add, Esc to cancel</Text>
        </>
      ) : null}
    </Box>
  );
}
