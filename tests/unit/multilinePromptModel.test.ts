import {
  backspaceAtOffset,
  cursorToOffset,
  deleteAtOffset,
  insertAtOffset,
  moveCursorHorizontal,
  moveCursorVertical,
  offsetToCursor,
  splitLines
} from '../../src/ui/components/multilinePromptModel.js';

describe('multilinePromptModel', () => {
  it('splits lines and preserves trailing empty line', () => {
    expect(splitLines('alpha\nbeta\n')).toEqual(['alpha', 'beta', '']);
  });

  it('converts cursor positions and offsets across line breaks', () => {
    const value = 'alpha\nbeta';
    expect(offsetToCursor(value, 7)).toEqual({ line: 1, column: 1 });
    expect(cursorToOffset(value, { line: 1, column: 3 })).toBe(9);
  });

  it('moves cursor left and right within boundaries', () => {
    const value = 'abc';
    expect(moveCursorHorizontal(value, 0, -1)).toBe(0);
    expect(moveCursorHorizontal(value, 1, -1)).toBe(0);
    expect(moveCursorHorizontal(value, 3, 1)).toBe(3);
    expect(moveCursorHorizontal(value, 2, 1)).toBe(3);
  });

  it('moves cursor up and down while preserving preferred column', () => {
    const value = 'abcd\nxy\nmnop';
    const down = moveCursorVertical(value, cursorToOffset(value, { line: 0, column: 3 }), 1);
    const downCursor = offsetToCursor(value, down.nextOffset);
    expect(downCursor).toEqual({ line: 1, column: 2 });

    const downAgain = moveCursorVertical(value, down.nextOffset, 1, down.preferredColumn);
    const downAgainCursor = offsetToCursor(value, downAgain.nextOffset);
    expect(downAgainCursor).toEqual({ line: 2, column: 3 });
  });

  it('inserts text at cursor offset', () => {
    const inserted = insertAtOffset('abef', 2, 'cd');
    expect(inserted).toEqual({ value: 'abcdef', offset: 4 });
  });

  it('backspaces across line boundaries', () => {
    const original = 'alpha\nbeta';
    const offset = cursorToOffset(original, { line: 1, column: 0 });
    const next = backspaceAtOffset(original, offset);
    expect(next.value).toBe('alphabeta');
    expect(offsetToCursor(next.value, next.offset)).toEqual({ line: 0, column: 5 });
  });

  it('deletes forward across line boundaries', () => {
    const original = 'alpha\nbeta';
    const offset = cursorToOffset(original, { line: 0, column: 5 });
    const next = deleteAtOffset(original, offset);
    expect(next.value).toBe('alphabeta');
    expect(offsetToCursor(next.value, next.offset)).toEqual({ line: 0, column: 5 });
  });
});
