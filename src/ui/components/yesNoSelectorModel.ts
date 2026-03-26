export function cursorForDefaultValue(defaultValue: boolean): 0 | 1 {
  return defaultValue ? 0 : 1;
}

export function moveCursor(
  current: 0 | 1,
  key: {
    upArrow?: boolean;
    downArrow?: boolean;
    leftArrow?: boolean;
    rightArrow?: boolean;
  }
): 0 | 1 {
  if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
    return current === 0 ? 1 : 0;
  }

  return current;
}

export function parseYesNoShortcut(input: string): boolean | null {
  const normalized = input.trim().toLowerCase();
  if (normalized.startsWith('y')) {
    return true;
  }

  if (normalized.startsWith('n')) {
    return false;
  }

  return null;
}

export function selectionFromCursor(cursor: 0 | 1): boolean {
  return cursor === 0;
}
