import { render } from 'preact';
import type { AppContext } from '../../app/context';
import { createTranslator } from '../../core/i18n';
import { log } from '../../core/log';
import { Store, useStore } from '../../core/store';
import { sel } from '../../site/selectors';
import type { StatEntry } from '../../site/tradeData';
import { Menu } from '../../ui/components/Menu';
import { IconChevronDown } from '../../ui/icons';
import { errorText } from '../../ui/messages';
import type { Feature } from '../types';
import css from './feature.css';
import { PRESETS, presetGroup, presetText, type StatPreset } from './presets';

const t = createTranslator({
  de: {
    label: 'Stat-Vorlagen',
    description: 'Knopf neben „Add Stat Group“, der fertige Gruppen anlegt, z. B. Seltenheit aus allen Mod-Quellen als Weighted Sum.',
    trigger: '+ Stat-Vorlage',
    added: 'Gruppe hinzugefügt: {text} ({n} Quellen)',
    unknown: 'Diesen Stat kennt die Trade-Seite nicht mehr: {text}',
  },
  en: {
    label: 'Stat group presets',
    description: 'Button next to "Add Stat Group" that adds ready-made groups, e.g. rarity from every mod source as a weighted sum.',
    trigger: '+ Stat Group Preset',
    added: 'Group added: {text} ({n} sources)',
    unknown: 'The trade site no longer knows this stat: {text}',
  },
});

/** Appends the preset as a new Weighted Sum group to the search form. Never searches. */
export async function applyPreset(ctx: AppContext, preset: StatPreset): Promise<boolean> {
  try {
    const stats = await ctx.data.stats();
    const group = presetGroup(preset, stats);
    const text = presetText(preset, stats);
    if (!group) {
      ctx.toast(t('unknown', { text }), 'warning');
      return false;
    }
    const index = ((await ctx.bridge.getState()).stats ?? []).length;
    await ctx.bridge.commit('pushStatGroup', { type: group.type, filters: group.filters });
    await ctx.bridge.commit('setStatGroupValue', { group: index, value: group.value });
    ctx.toast(t('added', { text, n: group.filters.length }));
    return true;
  } catch (error) {
    log.error('stat-presets: adding the group failed', error);
    ctx.toast(errorText(error), 'error');
    return false;
  }
}

function PresetMenu({ stats, apply }: { stats: Store<Map<string, StatEntry> | null>; apply: (preset: StatPreset) => void }) {
  const map = useStore(stats);
  return (
    <Menu
      class="ptm-stat-presets__menu"
      label={t('trigger')}
      trigger={
        <>
          <span>{t('trigger')}</span>
          <IconChevronDown size={12} />
        </>
      }
      items={PRESETS.map((preset) => ({ label: presetText(preset, map), onSelect: () => apply(preset) }))}
    />
  );
}

function start(ctx: AppContext) {
  const { doc } = ctx;
  const stats = new Store<Map<string, StatEntry> | null>(null);
  let disposed = false;
  // Serialized so two quick picks get consecutive group indexes.
  let queue = Promise.resolve();

  ctx.data
    .stats()
    .then((map) => {
      if (!disposed) stats.set(map);
    })
    .catch(() => {
      // English texts stay; applyPreset retries the request.
    });

  const apply = (preset: StatPreset) => {
    queue = queue.then(async () => void (await applyPreset(ctx, preset)));
  };

  const host = doc.createElement('div');
  host.className = 'ptm-stat-presets';
  // Inside the right-half `.filter-body` of "+ Add Stat Group"; CSS moves it into the empty left half.
  const place = () => {
    const body = doc.querySelector(sel.statGroupSelect)?.parentElement;
    if (body && host.parentElement !== body) body.append(host);
  };
  // ponytail: watches the whole body because Vue re-renders the stat pane; the callback is one querySelector.
  const observer = new MutationObserver(place);
  observer.observe(doc.body, { childList: true, subtree: true });
  place();
  render(<PresetMenu stats={stats} apply={apply} />, host);

  return {
    dispose() {
      disposed = true;
      observer.disconnect();
      render(null, host);
      host.remove();
    },
  };
}

export const statPresetsFeature: Feature = {
  id: 'stat-presets',
  label: () => t('label'),
  description: () => t('description'),
  toggleable: true,
  defaultEnabled: true,
  css,
  start,
};
