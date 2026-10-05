import {
  BookmarkImportError,
  decodeBackupFile,
  decodeBtBackup,
  decodeFolderCode,
  encodeBackup,
  encodeBtBackup,
  encodeFolderCode,
} from './codec';
import type { BookmarkFolder } from './model';

// Pinned fixtures from Better Trading (tests/fixtures/export-v*.ts).
const exportv1 = 'eyJpY24iOiJleGFsdCIsInRpdCI6InRlc3QgZm9sZGVyIiwidHJzIjpbeyJ0aXQiOiJ0ZXN0IHRyYWRlIiwibG9jIjoic2VhcmNoOm93V0pRRWtpbCJ9XX0=';
const exportv2 = '2:eyJpY24iOiJleGFsdCIsInRpdCI6InRlc3QgZm9sZGVyIPCfl4EiLCJ0cnMiOlt7InRpdCI6InRlc3QgdHJhZGUg8J+amiIsImxvYyI6InNlYXJjaDpvd1dKUUVraWwifV19';
const exportv3poe1 =
  '3:eyJpY24iOiJhc2NlbmRhbnQiLCJ0aXQiOiJ0ZXN0IFBvRSAxIGZvbGRlciDwn5eBIiwidmVyIjoiMSIsInRycyI6W3sidGl0IjoidGVzdCBQb0UgMSB0cmFkZSDwn5qaIiwibG9jIjoiMTpzZWFyY2g6Zm9vYmFyIn1dfQ==';
const exportv3poe2 =
  '3:eyJpY24iOiJhc2NlbmRhbnQiLCJ0aXQiOiJ0ZXN0IFBvRSAyIGZvbGRlciDwn5eBIiwidmVyIjoiMiIsInRycyI6W3sidGl0IjoidGVzdCBQb0UgMiB0cmFkZSDwn5qaIiwibG9jIjoiMjpzZWFyY2g6Zm9vYmFyIn1dfQ==';

const NOW = '2026-10-05T12:00:00.000Z';
const ID = 'H4sIAAAAAAAAE6tWKi5JLCktVrKqVsovKMnMz1OyUkrMq1Sq1QHLFCtZRVcrlVQWpILFU5R0lNIyc0pSi0ASsbWxtQADy6BQQQAAAA';

const folder: BookmarkFolder = {
  id: 'f1', title: 'Rüstung 🗁', icon: 'chaos', archivedAt: null,
  trades: [
    {
      id: 't1', title: 'Helm 🚚', type: 'search', realm: 'poe2', searchId: ID, savedLeague: 'Runes of Aldur',
      payload: { query: { status: { option: 'any' } } }, completedAt: null, createdAt: NOW, updatedAt: NOW,
    },
    {
      id: 't2', title: 'Divs', type: 'exchange', realm: 'poe2', searchId: 'H4sIex', savedLeague: 'Standard',
      payload: null, completedAt: NOW, createdAt: NOW, updatedAt: NOW,
    },
  ],
};

const rawJson = (code: string) => new TextDecoder().decode(Uint8Array.from(atob(code.slice(2)), (c) => c.charCodeAt(0)));
const reason = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BookmarkImportError);
    return (error as BookmarkImportError).reason;
  }
  throw new Error('expected an error');
};

describe('folder code (Better Trading format)', () => {
  it('exports as "3:" + base64 of BT v3 json with poe2- icon names', () => {
    const code = encodeFolderCode(folder);
    expect(code.startsWith('3:')).toBe(true);
    expect(JSON.parse(rawJson(code))).toEqual({
      icn: 'poe2-chaos',
      tit: 'Rüstung 🗁',
      ver: '2',
      trs: [{ tit: 'Helm 🚚', loc: `2:search:${ID}` }, { tit: 'Divs', loc: '2:exchange:H4sIex' }],
    });
    expect(Object.keys(JSON.parse(rawJson(code)))).toEqual(['icn', 'tit', 'ver', 'trs']);
  });

  it('round trips titles, icon, type and search id', () => {
    const decoded = decodeFolderCode(encodeFolderCode(folder), NOW);
    expect(decoded).toEqual({
      title: 'Rüstung 🗁', icon: 'chaos', archivedAt: null,
      trades: [
        { title: 'Helm 🚚', type: 'search', realm: 'poe2', searchId: ID, savedLeague: '', payload: null, completedAt: null, createdAt: NOW, updatedAt: NOW },
        { title: 'Divs', type: 'exchange', realm: 'poe2', searchId: 'H4sIex', savedLeague: '', payload: null, completedAt: null, createdAt: NOW, updatedAt: NOW },
      ],
    });
  });

  it('imports the pinned BT v3 PoE 2 fixture, unknown icons become null', () => {
    const decoded = decodeFolderCode(exportv3poe2, NOW);
    expect(decoded.title).toBe('test PoE 2 folder 🗁');
    expect(decoded.icon).toBeNull();
    expect(decoded.trades).toEqual([expect.objectContaining({ title: 'test PoE 2 trade 🚚', type: 'search', searchId: 'foobar' })]);
  });

  it('rejects PoE 1 folders, which includes every BT v1 and v2 code with legacy ids', () => {
    expect(reason(() => decodeFolderCode(exportv3poe1))).toBe('poe1');
    expect(reason(() => decodeFolderCode(exportv1))).toBe('poe1');
    expect(reason(() => decodeFolderCode(exportv2))).toBe('poe1');
  });

  it('accepts v1 and v2 codes that carry trade2 search ids', () => {
    const json = JSON.stringify({ icn: 'poe2-lich', tit: 'old', trs: [{ tit: 'x', loc: `search:${ID}` }] });
    const v1 = btoa(json);
    const v2 = '2:' + btoa(json);
    for (const code of [v1, v2]) {
      expect(decodeFolderCode(code, NOW)).toMatchObject({ title: 'old', icon: 'lich', trades: [{ title: 'x', searchId: ID, type: 'search' }] });
    }
  });

  it('rejects garbage with a typed error and a translated message', () => {
    expect(reason(() => decodeFolderCode('foobar'))).toBe('invalid-code');
    expect(reason(() => decodeFolderCode(btoa(JSON.stringify({ title: 'incomplete payload' }))))).toBe('invalid-code');
    expect(reason(() => decodeFolderCode('3:' + btoa(JSON.stringify({ tit: 'x', ver: '2', trs: [{ tit: 'y', loc: '2:weird:z' }] }))))).toBe('invalid-code');
    expect(new BookmarkImportError('invalid-code').message).toBe('The folder code is invalid.');
  });
});

describe('Better Trading backup file', () => {
  const archived = { ...folder, id: 'f2', title: 'Old', archivedAt: NOW };

  it('writes active codes, 20 dashes, archived codes', () => {
    const text = encodeBtBackup([folder, archived]);
    const [active, rest] = text.split('\n--------------------\n');
    expect(active).toBe(encodeFolderCode(folder));
    expect(rest).toBe(encodeFolderCode(archived));
  });

  it('parses both sections and skips PoE 1 and broken lines', () => {
    const text = [encodeFolderCode(folder), exportv3poe1, 'garbage', ''].join('\n') + '\n--------------------\n' + encodeFolderCode(archived);
    const result = decodeBtBackup(text, NOW);
    expect(result.skipped).toBe(2);
    expect(result.folders.map((f) => [f.title, f.archivedAt])).toEqual([['Rüstung 🗁', null], ['Old', NOW]]);
  });

  it('accepts a file without archived section and rejects files without usable folders', () => {
    expect(decodeBtBackup(encodeFolderCode(folder), NOW).folders).toHaveLength(1);
    expect(reason(() => decodeBtBackup(exportv3poe1, NOW))).toBe('poe1');
    expect(reason(() => decodeBtBackup('nope', NOW))).toBe('invalid-backup');
  });
});

describe('own backup', () => {
  it('round trips everything including payloads, league and archive state', () => {
    const archived = { ...folder, id: 'f2', archivedAt: NOW };
    const text = encodeBackup({ folders: [folder, archived] }, NOW);
    expect(JSON.parse(text)).toMatchObject({ app: 'poe2-trade-monkey', format: 1, exportedAt: NOW });
    const { folders, skipped } = decodeBackupFile(text, NOW);
    expect(skipped).toBe(0);
    const strip = ({ id: _id, trades, ...rest }: BookmarkFolder) => ({ ...rest, trades: trades.map(({ id: _t, ...t }) => t) });
    expect(folders).toEqual([strip(folder), strip(archived)]);
  });

  it('detects BT backups too', () => {
    expect(decodeBackupFile(encodeBtBackup([folder]), NOW).folders[0]!.title).toBe('Rüstung 🗁');
  });

  it('rejects unknown shapes', () => {
    expect(reason(() => decodeBackupFile('{"app":"other","format":1,"folders":[]}', NOW))).toBe('invalid-backup');
    expect(reason(() => decodeBackupFile('{"app":"poe2-trade-monkey","format":2,"folders":[]}', NOW))).toBe('invalid-backup');
    const broken = JSON.parse(encodeBackup({ folders: [folder] }, NOW));
    broken.folders[0].trades[0].type = 'bulk';
    expect(reason(() => decodeBackupFile(JSON.stringify(broken), NOW))).toBe('invalid-backup');
    expect(reason(() => decodeBackupFile('{oops', NOW))).toBe('invalid-backup');
  });
});
