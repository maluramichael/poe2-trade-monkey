import { finalIndex, handleSortKey, insertionIndex, moveItem } from './sortable';

const rows = [
  { top: 0, bottom: 20 },
  { top: 20, bottom: 40 },
  { top: 40, bottom: 60 },
];

describe('sortable index math', () => {
  it('finds the slot by item middles', () => {
    expect(insertionIndex(rows, -5)).toBe(0);
    expect(insertionIndex(rows, 9)).toBe(0);
    expect(insertionIndex(rows, 11)).toBe(1);
    expect(insertionIndex(rows, 45)).toBe(2);
    expect(insertionIndex(rows, 55)).toBe(3);
    expect(insertionIndex([], 10)).toBe(0);
  });

  it('accounts for the dragged item leaving its own slot', () => {
    expect(finalIndex(0, 0)).toBe(0);
    expect(finalIndex(0, 1)).toBe(0);
    expect(finalIndex(0, 3)).toBe(2);
    expect(finalIndex(2, 0)).toBe(0);
    expect(finalIndex(-1, 2)).toBe(2);
  });

  it('moves items', () => {
    expect(moveItem(['a', 'b', 'c'], 0, finalIndex(0, 3))).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, finalIndex(2, 0))).toEqual(['c', 'a', 'b']);
    expect(moveItem(['a', 'b', 'c'], 1, finalIndex(1, 1))).toEqual(['a', 'b', 'c']);
  });

  it('moves by one with the arrow keys and stops at the ends', () => {
    const button = document.createElement('button');
    const press = (key: string, id: string) => {
      let result: string[] | null = null;
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      button.addEventListener('keydown', (e) => handleSortKey(e, ['a', 'b', 'c'], id, (ids) => (result = ids)), { once: true });
      button.dispatchEvent(event);
      return result;
    };
    expect(press('ArrowDown', 'a')).toEqual(['b', 'a', 'c']);
    expect(press('ArrowUp', 'c')).toEqual(['a', 'c', 'b']);
    expect(press('ArrowUp', 'a')).toBeNull();
    expect(press('Enter', 'b')).toBeNull();
  });
});
