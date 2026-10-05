/// <reference types="node" />
import { readdirSync } from 'node:fs';
import { ALL_FOLDER_ICONS, FOLDER_ICONS, folderIconUrl, isFolderIcon } from './icons';

describe('folder icons', () => {
  it('lists exactly the png files in assets/folder-icons', () => {
    const files = readdirSync('assets/folder-icons').filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
    expect([...ALL_FOLDER_ICONS].sort()).toEqual(files.sort());
    expect(FOLDER_ICONS.currency).toContain('divine');
    expect(FOLDER_ICONS.ascendancy).toContain('smith-of-kitava');
  });

  it('builds raw github urls and recognises ids', () => {
    expect(folderIconUrl('chaos')).toBe('https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/assets/folder-icons/chaos.png');
    expect(isFolderIcon('lich')).toBe(true);
    expect(isFolderIcon('ascendant')).toBe(false);
  });
});
