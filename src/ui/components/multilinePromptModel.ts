export interface CursorPosition {
  line: number;
  column: number;
}

export interface VerticalMoveResult {
  nextOffset: number;
  preferredColumn: number;
}

export function splitLines(value: string): string[] {
  const lines = value.split('\n');
  return lines.length > 0 ? lines : [''];
}

export function offsetToCursor(value: string, offset: number): CursorPosition {
  const safeOffset = Math.max(0, Math.min(offset, value.length));
  let line = 0;
  let column = 0;

  for (let index = 0; index < safeOffset; index += 1) {
    if (value[index] === '\n') {
      line += 1;
      column = 0;
      continue;
    }

    column += 1;
  }

  return { line, column };
}

export function cursorToOffset(value: string, position: CursorPosition): number {
  const lines = splitLines(value);
  const safeLine = Math.max(0, Math.min(position.line, lines.length - 1));
  const lineLength = lines[safeLine]?.length ?? 0;
  const safeColumn = Math.max(0, Math.min(position.column, lineLength));

  let offset = 0;
  for (let index = 0; index < safeLine; index += 1) {
    offset += (lines[index]?.length ?? 0) + 1;
  }

  return offset + safeColumn;
}

export function moveCursorHorizontal(value: string, offset: number, delta: -1 | 1): number {
  if (delta < 0) {
    return Math.max(0, offset - 1);
  }

  return Math.min(value.length, offset + 1);
}

export function moveCursorVertical(
  value: string,
  offset: number,
  direction: -1 | 1,
  preferredColumn?: number
): VerticalMoveResult {
  const cursor = offsetToCursor(value, offset);
  const lines = splitLines(value);
  const nextLine = Math.max(0, Math.min(lines.length - 1, cursor.line + direction));
  const targetColumn = preferredColumn ?? cursor.column;
  const maxColumn = lines[nextLine]?.length ?? 0;
  const nextColumn = Math.max(0, Math.min(targetColumn, maxColumn));

  return {
    nextOffset: cursorToOffset(value, { line: nextLine, column: nextColumn }),
    preferredColumn: targetColumn,
  };
}

export function insertAtOffset(value: string, offset: number, inserted: string): { value: string; offset: number } {
  const safeOffset = Math.max(0, Math.min(offset, value.length));
  const nextValue = `${value.slice(0, safeOffset)}${inserted}${value.slice(safeOffset)}`;
  return {
    value: nextValue,
    offset: safeOffset + inserted.length,
  };
}

export function backspaceAtOffset(value: string, offset: number): { value: string; offset: number } {
  const safeOffset = Math.max(0, Math.min(offset, value.length));
  if (safeOffset === 0) {
    return { value, offset: safeOffset };
  }

  return {
    value: `${value.slice(0, safeOffset - 1)}${value.slice(safeOffset)}`,
    offset: safeOffset - 1,
  };
}

export function deleteAtOffset(value: string, offset: number): { value: string; offset: number } {
  const safeOffset = Math.max(0, Math.min(offset, value.length));
  if (safeOffset >= value.length) {
    return { value, offset: safeOffset };
  }

  return {
    value: `${value.slice(0, safeOffset)}${value.slice(safeOffset + 1)}`,
    offset: safeOffset,
  };
}
