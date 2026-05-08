import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { uiTheme } from '../theme.js';
import {
  backspaceAtOffset,
  deleteAtOffset,
  insertAtOffset,
  moveCursorHorizontal,
  moveCursorVertical,
  offsetToCursor,
  splitLines
} from './multilinePromptModel.js';

interface MultilinePromptProps {
  label: string;
  initialValue?: string;
  rows?: number;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

function renderLineWithCursor(line: string, cursorColumn: number): React.JSX.Element {
  const safeColumn = Math.max(0, Math.min(cursorColumn, line.length));
  const before = line.slice(0, safeColumn);
  const selectedChar = safeColumn < line.length ? line[safeColumn] : ' ';
  const after = line.slice(safeColumn + (safeColumn < line.length ? 1 : 0));

  return (
    <Text color={uiTheme.ink.textPrimary}>
      {before}
      <Text inverse>{selectedChar}</Text>
      {after}
    </Text>
  );
}

export function MultilinePrompt({
  label,
  initialValue = '',
  rows = 8,
  onSubmit,
  onCancel,
}: MultilinePromptProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  const [offset, setOffset] = useState(initialValue.length);
  const [preferredColumn, setPreferredColumn] = useState<number | undefined>(undefined);

  const lines = useMemo(() => splitLines(value), [value]);
  const cursor = useMemo(() => offsetToCursor(value, offset), [value, offset]);

  const visibleRows = Math.max(3, rows);
  const scrollTop = Math.max(0, Math.min(lines.length - visibleRows, cursor.line - Math.floor(visibleRows / 2)));
  const visibleLines = lines.slice(scrollTop, scrollTop + visibleRows);

  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      if (key.shift) {
        const next = insertAtOffset(value, offset, '\n');
        setValue(next.value);
        setOffset(next.offset);
        setPreferredColumn(undefined);
        return;
      }

      onSubmit(value);
      return;
    }

    if (key.leftArrow) {
      setOffset((prev) => moveCursorHorizontal(value, prev, -1));
      setPreferredColumn(undefined);
      return;
    }

    if (key.rightArrow) {
      setOffset((prev) => moveCursorHorizontal(value, prev, 1));
      setPreferredColumn(undefined);
      return;
    }

    if (key.upArrow) {
      const moved = moveCursorVertical(value, offset, -1, preferredColumn);
      setOffset(moved.nextOffset);
      setPreferredColumn(moved.preferredColumn);
      return;
    }

    if (key.downArrow) {
      const moved = moveCursorVertical(value, offset, 1, preferredColumn);
      setOffset(moved.nextOffset);
      setPreferredColumn(moved.preferredColumn);
      return;
    }

    if (key.backspace) {
      const next = backspaceAtOffset(value, offset);
      setValue(next.value);
      setOffset(next.offset);
      setPreferredColumn(undefined);
      return;
    }

    if (key.delete) {
      const next = deleteAtOffset(value, offset);
      setValue(next.value);
      setOffset(next.offset);
      setPreferredColumn(undefined);
      return;
    }

    if (input.length > 0 && !key.ctrl && !key.meta) {
      const next = insertAtOffset(value, offset, input);
      setValue(next.value);
      setOffset(next.offset);
      setPreferredColumn(undefined);
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={uiTheme.ink.accent}>{label}</Text>
      <Box borderStyle="single" borderColor={uiTheme.ink.info} paddingLeft={1} paddingRight={1} flexDirection="column">
        {visibleLines.map((line, index) => {
          const absoluteLine = scrollTop + index;
          const isCursorLine = absoluteLine === cursor.line;
          return (
            <React.Fragment key={`${absoluteLine}:${line}`}>
              {isCursorLine ? renderLineWithCursor(line, cursor.column) : (
                <Text color={uiTheme.ink.textPrimary}>{line || ' '}</Text>
              )}
            </React.Fragment>
          );
        })}
      </Box>
      <Text color={uiTheme.ink.textMuted}>
        Enter submit | Shift+Enter newline | Arrow keys move cursor | Esc cancel
      </Text>
    </Box>
  );
}
