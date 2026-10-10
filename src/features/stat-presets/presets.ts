import type { StatEntry } from '../../site/tradeData';
import type { StatGroup } from '../../site/tradeTypes';

/**
 * Stats that roll on several mod sources but have no pseudo stat on trade2 (checked against
 * /api/trade2/data/stats on 2026-10-10). A preset sums all sources in one Weighted Sum group.
 */
export interface StatPreset {
  /** Stat hash without source, e.g. "stat_3917489142". */
  stat: string;
  /** English stat text, shown until the site's (translated) stat list has loaded. */
  text: string;
}

export const PRESETS: StatPreset[] = [
  { stat: 'stat_3917489142', text: '#% increased Rarity of Items found' },
  { stat: 'stat_3981240776', text: '# to Spirit' },
  { stat: 'stat_2891184298', text: '#% increased Cast Speed' },
  { stat: 'stat_681332047', text: '#% increased Attack Speed' },
  { stat: 'stat_2974417149', text: '#% increased Spell Damage' },
  { stat: 'stat_2694482655', text: '#% to Critical Damage Bonus' },
  { stat: 'stat_983749596', text: '#% increased maximum Life' },
  { stat: 'stat_789117908', text: '#% increased Mana Regeneration Rate' },
  { stat: 'stat_803737631', text: '# to Accuracy Rating' },
  { stat: 'stat_124131830', text: '# to Level of all Spell Skills' },
  { stat: 'stat_2162097452', text: '# to Level of all Minion Skills' },
];

/** Mod sources in the order the site lists them ("rune" is shown as "Augment"). */
export const SOURCES = ['explicit', 'implicit', 'fractured', 'crafted', 'enchant', 'rune', 'desecrated'] as const;

/** Group type of "Weighted Sum" in the search query. */
export const WEIGHTED_SUM = 'weight';

/** Text of the first source the site knows, e.g. the translated explicit text. */
export function presetText(preset: StatPreset, stats: Map<string, StatEntry> | null): string {
  for (const source of SOURCES) {
    const entry = stats?.get(`${source}.${preset.stat}`);
    if (entry) return entry.text;
  }
  return preset.text;
}

/**
 * Weighted Sum group with weight 1 for every source the site knows and a group minimum of 1, so
 * an item matches with the stat from any source. `null` if no source exists (stat removed).
 */
export function presetGroup(preset: StatPreset, stats: Map<string, StatEntry>): StatGroup | null {
  const filters = SOURCES.map((source) => `${source}.${preset.stat}`)
    .filter((id) => stats.has(id))
    .map((id) => ({ id, value: { weight: 1 } }));
  return filters.length ? { type: WEIGHTED_SUM, filters, value: { min: 1 } } : null;
}
