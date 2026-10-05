import type { AppContext } from './context';
import type { CurrentSearch } from './currentSearch';
import { suggestTitle } from '../site/searchTitle';

/**
 * Name of a search: the user-given name (bookmarks), else a title suggested from the query with
 * localized filter labels, else ''. Shared by history and tab-title.
 */
export async function resolveSearchTitle(ctx: Pick<AppContext, 'searchNames' | 'data'>, search: CurrentSearch): Promise<string> {
  const named = ctx.searchNames.get()[search.location.id];
  if (named) return named;
  const query = search.payload?.query;
  if (!query) return '';
  try {
    return suggestTitle(query, await ctx.data.filterOptions());
  } catch {
    return suggestTitle(query);
  }
}
