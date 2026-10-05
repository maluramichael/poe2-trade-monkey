import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppContext } from '../../app/context';
import type { CurrentSearch } from '../../app/currentSearch';
import { resolveSearchTitle } from '../../app/searchName';
import { type Store, useStore } from '../../core/store';
import { decodeSearchId } from '../../site/searchId';
import type { SearchPayload } from '../../site/tradeTypes';
import { Button, ButtonGroup } from '../../ui/components/Button';
import { ConfirmDialog } from '../../ui/components/ConfirmDialog';
import { Menu } from '../../ui/components/Menu';
import {
  IconArchive, IconBolt, IconCheck, IconChevronDown, IconCompress, IconDownload, IconEdit, IconFolderPlus,
  IconGrip, IconLink, IconPlus, IconSave, IconTrash, IconUndo, IconUpload, IconWarning,
} from '../../ui/icons';
import { BookmarkImportError, decodeBackupFile, encodeBackup, encodeFolderCode } from './codec';
import { folderIconUrl } from './icons';
import { t } from './messages';
import { FolderModal, ImportModal, ShareModal, TitleModal } from './modals';
import type { BookmarkFolder, BookmarkTrade } from './model';
import type { BookmarksService } from './service';
import { finalIndex, handleSortKey, moveItem, startPointerDrag, type DropTarget } from './sortable';
import { isFromOtherLeague, tradePath } from './urls';
import { findUnknownStats } from './validate';

type Dialog =
  | { kind: 'newFolder' }
  | { kind: 'editFolder'; folder: BookmarkFolder }
  | { kind: 'deleteFolder'; folder: BookmarkFolder }
  | { kind: 'share'; folder: BookmarkFolder }
  | { kind: 'import' }
  | { kind: 'save'; folderId: string }
  | { kind: 'rename'; trade: BookmarkTrade }
  | { kind: 'deleteTrade'; trade: BookmarkTrade };

const pad = (n: number) => String(n).padStart(2, '0');

export function backupFileName(date = new Date()): string {
  return `poe2-trade-monkey-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** GM.setClipboard where granted, else the async clipboard API. */
async function copyText(win: Window, text: string): Promise<boolean> {
  try {
    if (typeof GM !== 'undefined' && typeof GM.setClipboard === 'function') {
      await GM.setClipboard(text);
      return true;
    }
  } catch {
    // fall through to the web API
  }
  try {
    await win.navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function bookmarksPanel(ctx: AppContext, service: BookmarksService, expanded: Store<string[]>): ComponentType {
  const copy = async (text: string) => {
    if (await copyText(ctx.win, text)) ctx.toast(t('copied'));
    else ctx.toast(t('copyFailed'), 'error');
  };

  const toggleExpanded = (id: string) =>
    expanded.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const leagueFor = (trade: BookmarkTrade, current: string | null) => current ?? (trade.savedLeague || 'Standard');

  const checkTrade = async (trade: BookmarkTrade, league: string) => {
    try {
      const decoded = trade.payload ? null : ((await decodeSearchId(trade.searchId)) as SearchPayload['query'] | null);
      const payload = trade.payload ?? (decoded ? { query: decoded } : null);
      if (!payload) return ctx.toast(t('checkNoQuery'), 'warning');
      const unknown = findUnknownStats(payload, await ctx.data.stats());
      if (unknown.length === 0) ctx.toast(t('checkOk', { league }));
      else ctx.toast(t('checkUnknown', { n: unknown.length, ids: unknown.join(', ') }), 'warning');
    } catch {
      ctx.toast(t('checkFailed'), 'error');
    }
  };

  const dropTrade = (tradeId: string, fromFolderId: string, { listId, index }: DropTarget) => {
    const folders = service.data.get().folders;
    const source = folders.find((f) => f.id === fromFolderId);
    const target = folders.find((f) => f.id === listId);
    if (!source || !target || target.archivedAt) return;
    if (target === source) {
      const ids = source.trades.map((trade) => trade.id);
      const from = ids.indexOf(tradeId);
      service.reorderTrades(source.id, moveItem(ids, from, finalIndex(from, index)));
    } else {
      // A collapsed folder shows no rows to aim at, so the trade goes to its end.
      service.moveTrade(tradeId, target.id, expanded.get().includes(target.id) ? index : target.trades.length);
    }
  };

  const scrollerOf = (el: Element) => el.closest<HTMLElement>('.ptm-sidebar__panel') ?? el.closest<HTMLElement>('.ptm-bm');

  function TradeRow({ trade, folder, league, current, setDialog }: {
    trade: BookmarkTrade;
    folder: BookmarkFolder;
    league: string | null;
    current: CurrentSearch | null;
    setDialog: (dialog: Dialog) => void;
  }) {
    const tradeLeague = leagueFor(trade, league);
    const href = tradePath(trade, tradeLeague);
    return (
      <li class={trade.completedAt ? 'ptm-bm-trade ptm-bm-trade--completed' : 'ptm-bm-trade'} data-sort-kind="trades" data-sort-item={trade.id}>
        {trade.completedAt && (
          <span class="ptm-bm-trade__check" role="img" title={t('completed')} aria-label={t('completed')}>
            <IconCheck />
          </span>
        )}
        <a class="ptm-bm-trade__title" href={href} title={trade.title}>
          {trade.title}
        </a>
        {isFromOtherLeague(trade, tradeLeague) && (
          <span class="ptm-bm-badge" title={t('savedIn', { league: trade.savedLeague })}>
            {t('otherLeague')}
          </span>
        )}
        <Menu
          label={t('tradeMenu')}
          items={[
            { label: t('copyUrl'), icon: <IconLink />, onSelect: () => void copy(ctx.win.location.origin + href) },
            {
              label: t('live'),
              icon: <IconBolt />,
              hidden: trade.type !== 'search',
              onSelect: () => ctx.win.location.assign(tradePath(trade, tradeLeague, { live: true })),
            },
            {
              label: t('overwrite'),
              icon: <IconSave />,
              hidden: !current,
              onSelect: () => {
                const search = ctx.currentSearch.get();
                if (!search) return;
                service.overwriteTrade(trade.id, search);
                ctx.toast(t('overwritten', { title: trade.title }));
              },
            },
            {
              label: trade.completedAt ? t('markOpen') : t('markCompleted'),
              icon: <IconCheck />,
              onSelect: () => service.toggleCompleted(trade.id),
            },
            { label: t('rename'), icon: <IconEdit />, onSelect: () => setDialog({ kind: 'rename', trade }) },
            { label: t('check'), icon: <IconWarning />, onSelect: () => void checkTrade(trade, tradeLeague) },
            { label: t('delete'), icon: <IconTrash />, danger: true, onSelect: () => setDialog({ kind: 'deleteTrade', trade }) },
          ]}
        />
        <button
          type="button"
          class="ptm-icon-btn ptm-bm-handle"
          data-sort-handle={trade.id}
          title={t('dragTrade')}
          aria-label={t('dragTrade')}
          onPointerDown={(event) =>
            startPointerDrag(event, {
              kind: 'trades',
              scroller: scrollerOf(event.currentTarget),
              onDrop: (target) => dropTrade(trade.id, folder.id, target),
            })
          }
          onKeyDown={(event) =>
            handleSortKey(event, folder.trades.map((x) => x.id), trade.id, (ids) => service.reorderTrades(folder.id, ids))
          }
        >
          <IconGrip />
        </button>
      </li>
    );
  }

  function FolderItem({ folder, open, visibleIds, league, current, setDialog }: {
    folder: BookmarkFolder;
    open: boolean;
    visibleIds: string[];
    league: string | null;
    current: CurrentSearch | null;
    setDialog: (dialog: Dialog) => void;
  }) {
    const archived = !!folder.archivedAt;
    return (
      <li
        class="ptm-bm-folder"
        data-sort-kind="folders"
        data-sort-item={folder.id}
        data-sort-list={archived ? undefined : 'trades'}
        data-sort-list-id={folder.id}
      >
        <div class="ptm-bm-folder__header">
          <button
            type="button"
            class="ptm-bm-folder__toggle"
            aria-expanded={archived ? undefined : open}
            title={archived ? folder.title : open ? t('collapse') : t('expand')}
            onClick={() => !archived && toggleExpanded(folder.id)}
          >
            {folder.icon && <img class="ptm-bm-folder__icon" src={folderIconUrl(folder.icon)} alt="" />}
            <span class="ptm-bm-folder__title">{folder.title}</span>
            {archived ? (
              <span class="ptm-bm-badge">{t('archived')}</span>
            ) : (
              <span class={open ? 'ptm-bm-chevron ptm-bm-chevron--open' : 'ptm-bm-chevron'}>
                <IconChevronDown size={16} />
              </span>
            )}
          </button>
          <span class="ptm-bm-folder__divider" aria-hidden="true" />
          <Menu
            label={t('folderMenu')}
            items={[
              { label: t('edit'), icon: <IconEdit />, onSelect: () => setDialog({ kind: 'editFolder', folder }) },
              { label: t('archive'), icon: <IconArchive />, hidden: archived, onSelect: () => service.archiveFolder(folder.id) },
              { label: t('restore'), icon: <IconUndo />, hidden: !archived, onSelect: () => service.restoreFolder(folder.id) },
              { label: t('share'), icon: <IconUpload />, onSelect: () => setDialog({ kind: 'share', folder }) },
              {
                label: t('delete'),
                icon: <IconTrash />,
                danger: true,
                hidden: !archived,
                onSelect: () => setDialog({ kind: 'deleteFolder', folder }),
              },
            ]}
          />
          <button
            type="button"
            class="ptm-icon-btn ptm-bm-handle"
            data-sort-handle={folder.id}
            title={t('dragFolder')}
            aria-label={t('dragFolder')}
            onPointerDown={(event) =>
              startPointerDrag(event, {
                kind: 'folders',
                scroller: scrollerOf(event.currentTarget),
                onDrop: ({ index }) => {
                  const from = visibleIds.indexOf(folder.id);
                  service.reorderFolders(moveItem(visibleIds, from, finalIndex(from, index)));
                },
              })
            }
            onKeyDown={(event) => handleSortKey(event, visibleIds, folder.id, (ids) => service.reorderFolders(ids))}
          >
            <IconGrip />
          </button>
        </div>
        {open && !archived && (
          <div class="ptm-bm-folder__body">
            {folder.trades.length > 0 ? (
              <ul class="ptm-bm-trades">
                {folder.trades.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} folder={folder} league={league} current={current} setDialog={setDialog} />
                ))}
              </ul>
            ) : (
              <p class="ptm-bm-folder__empty">{t('emptyFolder')}</p>
            )}
            <span class="ptm-bm-save" title={current ? undefined : t('saveCurrentDisabled')}>
              <Button variant="gold" block icon={<IconSave />} disabled={!current} onClick={() => setDialog({ kind: 'save', folderId: folder.id })}>
                {t('saveCurrent')}
              </Button>
            </span>
          </div>
        )}
      </li>
    );
  }

  return function BookmarksPanel() {
    const { folders } = useStore(service.data);
    const openIds = useStore(expanded);
    const league = useStore(ctx.leagues.current);
    const current = useStore(ctx.currentSearch);
    const [archiveMode, setArchiveMode] = useState(false);
    const [dialog, setDialog] = useState<Dialog | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const close = () => setDialog(null);

    const archivedCount = folders.filter((f) => f.archivedAt).length;
    const showingArchive = archiveMode && archivedCount > 0;
    // Leave the archive view once it is empty, so archiving later does not jump back into it.
    useEffect(() => {
      if (archivedCount === 0) setArchiveMode(false);
    }, [archivedCount]);
    const visible = folders.filter((f) => !!f.archivedAt === showingArchive);
    const visibleIds = visible.map((f) => f.id);

    const saveBackup = () => {
      const url = URL.createObjectURL(new Blob([encodeBackup(service.data.get())], { type: 'application/json' }));
      const link = ctx.doc.createElement('a');
      link.href = url;
      link.download = backupFileName();
      ctx.doc.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const loadBackup = async (file: File) => {
      try {
        const { folders: imported, skipped } = decodeBackupFile(await file.text());
        const n = service.importFolders(imported);
        ctx.toast(t('backupLoaded', { n, skipped }), skipped > 0 ? 'warning' : 'success');
      } catch (error) {
        ctx.toast(error instanceof BookmarkImportError ? error.message : String(error), 'error');
      }
    };

    return (
      <div class="ptm-bm">
        {((!showingArchive && visible.length > 0) || archivedCount > 0) && (
          <div class="ptm-toolbar">
            <ButtonGroup>
              {!showingArchive && visible.length > 0 && (
                <Button variant="gold" size="sm" icon={<IconCompress />} onClick={() => expanded.set([])}>
                  {t('collapseFolders')}
                </Button>
              )}
              {archivedCount > 0 && (
                <Button
                  variant="gold"
                  size="sm"
                  active={showingArchive}
                  icon={showingArchive ? <IconUndo /> : <IconArchive />}
                  onClick={() => setArchiveMode(!showingArchive)}
                >
                  {showingArchive ? t('hideArchive') : t('showArchive')}
                </Button>
              )}
            </ButtonGroup>
          </div>
        )}

        {visible.length > 0 ? (
          <ul class="ptm-bm-folders" data-sort-list="folders" data-sort-list-id="folders">
            {visible.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                open={openIds.includes(folder.id)}
                visibleIds={visibleIds}
                league={league}
                current={current}
                setDialog={setDialog}
              />
            ))}
          </ul>
        ) : (
          <p class="ptm-empty">{showingArchive ? t('emptyArchive') : t('empty')}</p>
        )}

        <section class="ptm-actions ptm-bm-backup" aria-label={t('backup')}>
          {!showingArchive && (
            <ButtonGroup block>
              <Button icon={<IconFolderPlus />} onClick={() => setDialog({ kind: 'newFolder' })}>
                {t('newFolder')}
              </Button>
              <Button icon={<IconPlus />} onClick={() => setDialog({ kind: 'import' })}>
                {t('importFolder')}
              </Button>
            </ButtonGroup>
          )}
          <ButtonGroup block label={t('backup')}>
            <Button variant="plain" icon={<IconDownload />} onClick={saveBackup}>
              {t('saveBackup')}
            </Button>
            <Button variant="plain" icon={<IconUpload />} onClick={() => fileInput.current?.click()}>
              {t('loadBackup')}
            </Button>
          </ButtonGroup>
          <input
            ref={fileInput}
            type="file"
            accept=".json,.txt"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) void loadBackup(file);
            }}
          />
        </section>

        {dialog?.kind === 'newFolder' && (
          <FolderModal
            onClose={close}
            onSave={({ title, icon }) => {
              const id = service.addFolder(title, icon);
              expanded.update((ids) => [...ids, id]);
              close();
            }}
          />
        )}
        {dialog?.kind === 'editFolder' && (
          <FolderModal
            initial={dialog.folder}
            onClose={close}
            onSave={(changes) => {
              service.updateFolder(dialog.folder.id, changes);
              close();
            }}
          />
        )}
        {dialog?.kind === 'deleteFolder' && (
          <ConfirmDialog
            title={t('deleteFolderTitle')}
            message={t('deleteFolderMessage', { title: dialog.folder.title, n: dialog.folder.trades.length })}
            confirmLabel={t('delete')}
            onCancel={close}
            onConfirm={() => {
              service.deleteFolder(dialog.folder.id);
              close();
            }}
          />
        )}
        {dialog?.kind === 'share' && (
          <ShareModal code={encodeFolderCode(dialog.folder)} onCopy={() => void copy(encodeFolderCode(dialog.folder))} onClose={close} />
        )}
        {dialog?.kind === 'import' && (
          <ImportModal
            onClose={close}
            onImport={(folder) => {
              service.importFolders([folder], { archived: false });
              ctx.toast(t('imported', { title: folder.title }));
              close();
            }}
          />
        )}
        {dialog?.kind === 'save' && (
          <TitleModal
            title={t('saveTitle')}
            suggest={async () => {
              const search = ctx.currentSearch.get();
              return search ? resolveSearchTitle(ctx, search) : '';
            }}
            onClose={close}
            onSave={(title) => {
              const search = ctx.currentSearch.get();
              if (search) {
                service.addTrade(dialog.folderId, title, search);
                ctx.toast(t('saved'));
              }
              close();
            }}
          />
        )}
        {dialog?.kind === 'rename' && (
          <TitleModal
            title={t('renameTitle')}
            initial={dialog.trade.title}
            onClose={close}
            onSave={(title) => {
              service.updateTradeTitle(dialog.trade.id, title);
              close();
            }}
          />
        )}
        {dialog?.kind === 'deleteTrade' && (
          <ConfirmDialog
            title={t('deleteTradeTitle')}
            message={t('deleteTradeMessage', { title: dialog.trade.title })}
            confirmLabel={t('delete')}
            onCancel={close}
            onConfirm={() => {
              service.deleteTrade(dialog.trade.id);
              close();
            }}
          />
        )}
      </div>
    );
  };
}
