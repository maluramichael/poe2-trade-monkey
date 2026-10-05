import type { FilterOption } from './tradeData';

/** The parts of a search that make a good title. Fits both `TradeQuery` and `PersistentState`. */
export interface TitleSource {
  name?: string | { option: string } | null;
  type?: string | { option: string } | null;
  term?: string | null;
  filters?: Record<string, { filters?: Record<string, unknown> } | undefined>;
}

/**
 * Suggests a human title for a search, the way Better Trading did:
 * unique name + base type, else base type, else search term, else "Category (Rarity)".
 */
export function suggestTitle(source: TitleSource, filterOptions?: Map<string, FilterOption[]>): string {
  const name = text(source.name);
  const type = text(source.type);
  if (name && type) return `${name} ${type}`;
  if (name || type) return (name || type)!;
  if (source.term) return source.term;

  const category = optionText(source, 'type_filters', 'category', filterOptions);
  const rarity = optionText(source, 'type_filters', 'rarity', filterOptions);
  if (category && rarity) return `${category} (${rarity})`;
  return category ?? rarity ?? '';
}

function text(value: TitleSource['name']): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.option || null;
}

function optionText(
  source: TitleSource,
  group: string,
  filter: string,
  filterOptions?: Map<string, FilterOption[]>,
): string | null {
  const selected = source.filters?.[group]?.filters?.[filter] as { option?: string } | undefined;
  const id = selected?.option;
  if (!id) return null;
  return filterOptions?.get(`${group}.${filter}`)?.find((option) => option.id === id)?.text ?? humanize(id);
}

/** "accessory.amulet" → "Amulet", "weapon.onemelee" → "Onemelee". */
function humanize(id: string): string {
  const last = id.split('.').pop() ?? id;
  return last.charAt(0).toUpperCase() + last.slice(1);
}
