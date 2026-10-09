import { createTranslator } from '../../core/i18n';
import { isEncodedSearchId } from '../../site/searchId';
import { DEFAULT_REALM, isRealm, type TradeType } from '../../site/tradeLocation';
import { isFolderIcon } from './icons';
import type { BookmarkFolder, BookmarksData, NewFolder, NewTrade } from './model';

const t = createTranslator({
  de: {
    'invalid-code': 'Der Ordner-Code ist ungültig.',
    poe1: 'Der Ordner stammt aus Path of Exile 1 und lässt sich hier nicht verwenden.',
    'invalid-backup': 'Die Backup-Datei hat ein unbekanntes Format.',
  },
  en: {
    'invalid-code': 'The folder code is invalid.',
    poe1: 'This folder is from Path of Exile 1 and cannot be used here.',
    'invalid-backup': 'The backup file has an unknown format.',
  },
});

export type ImportErrorReason = 'invalid-code' | 'poe1' | 'invalid-backup';

export class BookmarkImportError extends Error {
  constructor(readonly reason: ImportErrorReason) {
    super(t(reason));
    this.name = 'BookmarkImportError';
  }
}

/** Result of reading a backup file. `skipped` counts folder codes that could not be used. */
export interface ImportResult {
  folders: NewFolder[];
  skipped: number;
}

// Better Trading folder codes. Icons are named "poe2-<id>" there.
const BT_ICON_PREFIX = 'poe2-';
const BT_SECTION_DELIMITER = '\n--------------------\n';
const TYPES = new Set<string>(['search', 'exchange']);
/** Search ids end up in links, so only url-safe base64 characters get in. */
const SEARCH_ID = /^[A-Za-z0-9_-]{1,4096}$/;
/** Larger files are not read at all. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

interface BtFolder {
  icn: string | null;
  tit: string;
  ver?: string;
  trs: { tit: string; loc: string }[];
}

/** Share code in Better Trading's v3 format: "3:" + base64(UTF-8 JSON). */
export function encodeFolderCode(folder: Pick<BookmarkFolder, 'title' | 'icon' | 'trades'>): string {
  const payload: BtFolder = {
    icn: folder.icon ? BT_ICON_PREFIX + folder.icon : null,
    tit: folder.title,
    ver: '2',
    trs: folder.trades.map((trade) => ({ tit: trade.title, loc: `2:${trade.type}:${trade.searchId}` })),
  };
  return '3:' + toBase64(JSON.stringify(payload));
}

/**
 * Reads Better Trading codes v1 (no prefix, latin1), v2 ("2:") and v3 ("3:"). v1 and v2 predate
 * PoE 2 and count as PoE 1 unless every trade carries a trade2 search id.
 */
export function decodeFolderCode(code: string, now = new Date().toISOString()): NewFolder {
  const trimmed = code.trim();
  const version = trimmed.startsWith('3:') ? 3 : trimmed.startsWith('2:') ? 2 : 1;
  let raw: unknown;
  try {
    raw = JSON.parse(version === 1 ? atob(trimmed) : fromBase64(trimmed.slice(2)));
  } catch {
    throw new BookmarkImportError('invalid-code');
  }
  if (!isBtFolder(raw)) throw new BookmarkImportError('invalid-code');

  const trades = raw.trs.map((trade) => {
    const parts = trade.loc.split(':');
    if (version === 3) parts.shift();
    const [type, ...slug] = parts;
    const searchId = slug.join(':');
    if (!type || !TYPES.has(type) || !SEARCH_ID.test(searchId)) throw new BookmarkImportError('invalid-code');
    return { title: trade.tit, type: type as TradeType, searchId };
  });

  const siteVersion = version === 3 ? raw.ver : trades.every((trade) => isEncodedSearchId(trade.searchId)) ? '2' : '1';
  if (siteVersion === '1') throw new BookmarkImportError('poe1');
  if (siteVersion !== '2') throw new BookmarkImportError('invalid-code');

  const icon = raw.icn?.startsWith(BT_ICON_PREFIX) ? raw.icn.slice(BT_ICON_PREFIX.length) : null;
  return {
    title: raw.tit,
    icon: isFolderIcon(icon) ? icon : null,
    archivedAt: null,
    trades: trades.map(
      (trade): NewTrade => ({ ...trade, realm: DEFAULT_REALM, savedLeague: '', payload: null, completedAt: null, createdAt: now, updatedAt: now }),
    ),
  };
}

/** Better Trading backup file: active folder codes, a dashed line, archived folder codes. */
export function encodeBtBackup(folders: BookmarkFolder[]): string {
  const codes = (archived: boolean) => folders.filter((f) => !!f.archivedAt === archived).map(encodeFolderCode).join('\n');
  return codes(false) + BT_SECTION_DELIMITER + codes(true);
}

export function decodeBtBackup(text: string, now = new Date().toISOString()): ImportResult {
  const [active = '', archived = ''] = text.replace(/\r\n/g, '\n').split(BT_SECTION_DELIMITER);
  const result: ImportResult = { folders: [], skipped: 0 };
  let poe1 = 0;
  const read = (section: string, archivedAt: string | null) => {
    for (const line of section.split('\n').filter((l) => l.trim())) {
      try {
        result.folders.push({ ...decodeFolderCode(line, now), archivedAt });
      } catch (error) {
        result.skipped++;
        if ((error as BookmarkImportError).reason === 'poe1') poe1++;
      }
    }
  };
  read(active, null);
  read(archived, now);
  if (!result.folders.length) throw new BookmarkImportError(poe1 && poe1 === result.skipped ? 'poe1' : 'invalid-backup');
  return result;
}

const APP = 'poe2-trade-monkey';

/** Full backup with payloads, saved leagues and archive state. */
export function encodeBackup(data: BookmarksData, now = new Date().toISOString()): string {
  return JSON.stringify({ app: APP, format: 1, exportedAt: now, folders: data.folders }, null, 2);
}

/** Reads our own JSON backup or a Better Trading backup file. */
export function decodeBackupFile(text: string, now = new Date().toISOString()): ImportResult {
  if (!text.trim().startsWith('{')) return decodeBtBackup(text, now);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BookmarkImportError('invalid-backup');
  }
  const backup = raw as { app?: unknown; format?: unknown; folders?: unknown };
  if (backup.app !== APP || backup.format !== 1 || !Array.isArray(backup.folders) || !backup.folders.every(isFolder)) {
    throw new BookmarkImportError('invalid-backup');
  }
  const folders = (backup.folders as BookmarkFolder[]).map(({ id: _id, trades, ...folder }) => ({
    ...folder,
    icon: isFolderIcon(folder.icon) ? folder.icon : null,
    trades: trades.map(({ id: _tradeId, ...trade }) => trade),
  }));
  return { folders, skipped: 0 };
}

function isBtFolder(value: unknown): value is BtFolder {
  const v = value as BtFolder | null;
  return (
    typeof v === 'object' && v !== null && typeof v.tit === 'string' && Array.isArray(v.trs) &&
    v.trs.every((trade) => typeof trade?.tit === 'string' && typeof trade.loc === 'string')
  );
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isNullableString = (v: unknown) => v === null || isString(v);

function isFolder(value: unknown): boolean {
  const f = value as BookmarkFolder | null;
  return (
    typeof f === 'object' && f !== null && isString(f.title) && isNullableString(f.icon) &&
    isNullableString(f.archivedAt) && Array.isArray(f.trades) && f.trades.every(isTrade)
  );
}

function isTrade(value: unknown): boolean {
  const t = value as NewTrade | null;
  return (
    typeof t === 'object' && t !== null && isString(t.title) && TYPES.has(t.type) && isString(t.realm) &&
    isRealm(t.realm) && isString(t.searchId) && SEARCH_ID.test(t.searchId) && isString(t.savedLeague) &&
    (t.payload === null || (typeof t.payload === 'object' && typeof t.payload.query === 'object')) &&
    isNullableString(t.completedAt) && isString(t.createdAt) && isString(t.updatedAt)
  );
}

function toBase64(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Accepts standard and url-safe base64, with or without padding (Better Trading uses js-base64). */
function fromBase64(base64: string): string {
  const normal = base64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normal.padEnd(Math.ceil(normal.length / 4) * 4, '='));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}
