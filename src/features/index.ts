import { bookmarksFeature } from './bookmarks';
import { historyFeature } from './history';
import { pinsFeature } from './pins';
import { tabTitleFeature } from './tab-title';
import { highlightModsFeature } from './highlight-mods';
import { regroupSimilarFeature } from './regroup-similar';
import { priceEquivalentFeature } from './price-equivalent';
import { modActionsFeature } from './mod-actions';
import { autoLoadMoreFeature } from './auto-load-more';
import { layoutFeature } from './layout';
import { quickFiltersFeature } from './quick-filters';
import { statFavoritesFeature } from './stat-favorites';
import { searchClearFeature } from './search-clear';
import type { Feature } from './types';

/** All features in sidebar/settings order. Adding a feature = one import and one entry here. */
export const features: Feature[] = [
  bookmarksFeature,
  historyFeature,
  pinsFeature,
  tabTitleFeature,
  highlightModsFeature,
  regroupSimilarFeature,
  priceEquivalentFeature,
  modActionsFeature,
  autoLoadMoreFeature,
  layoutFeature,
  quickFiltersFeature,
  statFavoritesFeature,
  searchClearFeature,
];
