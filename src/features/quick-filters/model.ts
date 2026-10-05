import type { PersistentState } from '../../site/tradeTypes';

export type Filters = PersistentState['filters'];
export type Tri = 'any' | 'yes' | 'no';
export type Commit = { mutation: string; payload: unknown };

export const TOGGLES = ['corrupted', 'fractured_item', 'desecrated', 'mirrored', 'sanctified', 'identified'] as const;
export type ToggleId = (typeof TOGGLES)[number];

export interface NumberControl {
  key: string;
  group: string;
  id: string;
  bound: 'min' | 'max';
  quick: number[];
}

export const NUMBERS: NumberControl[] = [
  { key: 'ilvl', group: 'type_filters', id: 'ilvl', bound: 'min', quick: [65, 75, 80, 82] },
  { key: 'quality', group: 'type_filters', id: 'quality', bound: 'min', quick: [10, 15, 20] },
  { key: 'lvl', group: 'req_filters', id: 'lvl', bound: 'max', quick: [30, 45, 60, 70] },
  { key: 'rune_sockets', group: 'equipment_filters', id: 'rune_sockets', bound: 'min', quick: [1, 2, 3] },
];

const MISC = 'misc_filters';
const TYPE = 'type_filters';

type FilterValue = { option?: unknown; min?: number; max?: number };

function value(filters: Filters, group: string, id: string): FilterValue {
  return (filters[group]?.filters?.[id] as FilterValue | undefined) ?? {};
}

export interface View {
  toggles: Record<ToggleId, Tri>;
  numbers: Record<string, number | undefined>;
  rarity: string | null;
}

export function toView(filters: Filters): View {
  const toggles = {} as Record<ToggleId, Tri>;
  for (const id of TOGGLES) {
    const option = value(filters, MISC, id).option;
    toggles[id] = option === 'true' ? 'yes' : option === 'false' ? 'no' : 'any';
  }
  const numbers: View['numbers'] = {};
  for (const control of NUMBERS) {
    const n = value(filters, control.group, control.id)[control.bound];
    numbers[control.key] = typeof n === 'number' ? n : undefined;
  }
  const rarity = value(filters, TYPE, 'rarity').option;
  return { toggles, numbers, rarity: typeof rarity === 'string' ? rarity : null };
}

export const nextTri = (tri: Tri): Tri => (tri === 'any' ? 'yes' : tri === 'yes' ? 'no' : 'any');

/** Commits that set one property filter. A non-empty value enables (and expands) its group first. */
function setFilter(filters: Filters, group: string, index: string, next: FilterValue): Commit[] {
  const empty = Object.keys(next).length === 0;
  const commits: Commit[] = [];
  if (!empty && filters[group]?.disabled !== false) {
    commits.push({ mutation: 'setFilterGroupDisabled', payload: { type: 'filters', group, disable: false } });
  }
  commits.push({ mutation: 'setPropertyFilter', payload: { group, index, value: next } });
  return commits;
}

export function toggleCommits(filters: Filters, id: ToggleId, tri: Tri): Commit[] {
  return setFilter(filters, MISC, id, tri === 'any' ? {} : { option: tri === 'yes' ? 'true' : 'false' });
}

/** Sets or clears (`undefined`) our bound and keeps the other one the user typed in the form. */
export function numberCommits(filters: Filters, control: NumberControl, n: number | undefined): Commit[] {
  const { [control.bound]: _, ...rest } = value(filters, control.group, control.id);
  return setFilter(filters, control.group, control.id, n === undefined ? rest : { ...rest, [control.bound]: n });
}

export function rarityCommits(filters: Filters, option: string | null): Commit[] {
  return setFilter(filters, TYPE, 'rarity', option === null ? {} : { option });
}

/** Clears only what the strip shows; untouched filters produce no commits. */
export function clearCommits(filters: Filters): Commit[] {
  const view = toView(filters);
  return [
    ...TOGGLES.filter((id) => view.toggles[id] !== 'any').flatMap((id) => toggleCommits(filters, id, 'any')),
    ...NUMBERS.filter((c) => view.numbers[c.key] !== undefined).flatMap((c) => numberCommits(filters, c, undefined)),
    ...(view.rarity !== null ? rarityCommits(filters, null) : []),
  ];
}

export const isEmpty = (view: View) =>
  TOGGLES.every((id) => view.toggles[id] === 'any') &&
  NUMBERS.every((c) => view.numbers[c.key] === undefined) &&
  view.rarity === null;
