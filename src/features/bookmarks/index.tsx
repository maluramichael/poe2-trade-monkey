import { persistedStore } from '../../core/storage';
import { IconFolder } from '../../ui/icons';
import type { Feature } from '../types';
import css from './feature.css';
import { t } from './messages';
import { bookmarksPanel } from './Panel';
import { createBookmarksService } from './service';

export const EXPANDED_KEY = 'bookmarks:expanded';

export const bookmarksFeature: Feature = {
  id: 'bookmarks',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  sidebarTab: { label: () => t('label'), icon: IconFolder, order: 1 },
  async start(ctx) {
    const service = await createBookmarksService(ctx);
    const expanded = await persistedStore<string[]>(ctx.storage, EXPANDED_KEY, { defaultValue: [], schema: 1 });
    return { dispose: () => service.dispose(), Panel: bookmarksPanel(ctx, service, expanded) };
  },
};
