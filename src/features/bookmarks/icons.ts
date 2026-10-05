/** Folder icons from Better Trading (MIT), files in assets/folder-icons/<id>.png. */
export const FOLDER_ICONS = {
  currency: [
    'alchemy', 'annul', 'artificer', 'augment', 'chance', 'chaos', 'divine', 'essence', 'exalt',
    'gemcutter', 'glassblower', 'mirror', 'regal', 'rune', 'transmute', 'vaal', 'waystone', 'wisdom',
  ],
  ascendancy: [
    'titan', 'warbringer', 'smith-of-kitava', 'infernalist', 'blood-mage', 'lich', 'deadeye', 'pathfinder',
    'chronomancer', 'stormweaver', 'witch-hunter', 'gemling-legionnaire', 'tactician', 'invoker',
    'acolyte-of-chayula', 'ritualist', 'amazon',
  ],
} as const;

export const ALL_FOLDER_ICONS: readonly string[] = [...FOLDER_ICONS.currency, ...FOLDER_ICONS.ascendancy];

export function isFolderIcon(id: unknown): id is string {
  return typeof id === 'string' && ALL_FOLDER_ICONS.includes(id);
}

export function folderIconUrl(id: string): string {
  return `https://raw.githubusercontent.com/maluramichael/poe2-trade-monkey/master/assets/folder-icons/${id}.png`;
}
