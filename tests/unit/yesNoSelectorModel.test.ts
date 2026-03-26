import {
  cursorForDefaultValue,
  moveCursor,
  parseYesNoShortcut,
  selectionFromCursor
} from '../../src/ui/components/yesNoSelectorModel.js';

describe('yesNoSelectorModel', () => {
  it('maps default values to expected cursor positions', () => {
    expect(cursorForDefaultValue(true)).toBe(0);
    expect(cursorForDefaultValue(false)).toBe(1);
  });

  it('toggles cursor on navigation keys', () => {
    expect(moveCursor(0, { downArrow: true })).toBe(1);
    expect(moveCursor(1, { upArrow: true })).toBe(0);
    expect(moveCursor(0, { leftArrow: true })).toBe(1);
    expect(moveCursor(1, { rightArrow: true })).toBe(0);
  });

  it('keeps cursor for non-navigation keys', () => {
    expect(moveCursor(0, {})).toBe(0);
    expect(moveCursor(1, { upArrow: false, downArrow: false, leftArrow: false, rightArrow: false })).toBe(1);
  });

  it('parses y and n keyboard shortcuts', () => {
    expect(parseYesNoShortcut('y')).toBe(true);
    expect(parseYesNoShortcut('Yes')).toBe(true);
    expect(parseYesNoShortcut('n')).toBe(false);
    expect(parseYesNoShortcut('No')).toBe(false);
  });

  it('ignores unrelated shortcuts', () => {
    expect(parseYesNoShortcut('')).toBeNull();
    expect(parseYesNoShortcut('maybe')).toBeNull();
    expect(parseYesNoShortcut('1')).toBeNull();
  });

  it('maps cursor selection to boolean values', () => {
    expect(selectionFromCursor(0)).toBe(true);
    expect(selectionFromCursor(1)).toBe(false);
  });
});
