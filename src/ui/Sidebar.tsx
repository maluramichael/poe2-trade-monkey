import { useState } from 'preact/hooks';
import { useApp } from '../app/context';
import type { FeatureHost } from '../app/featureHost';
import { useStore } from '../core/store';
import { IconChevronLeft, IconChevronRight, IconSettings } from './icons';
import { IconButton } from './components/Button';
import { Logo } from './components/Logo';
import { SettingsModal } from './SettingsModal';
import { t } from './messages';

/** Fixed panel on the right. Tabs come from running features that declare a `sidebarTab`. */
export function Sidebar({ host }: { host: FeatureHost }) {
  const { settings } = useApp();
  const { sidebarCollapsed, activeTab } = useStore(settings);
  const running = useStore(host.running);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const tabs = running
    .filter((entry) => entry.feature.sidebarTab && entry.Panel)
    .sort((a, b) => a.feature.sidebarTab!.order - b.feature.sidebarTab!.order);
  const active = tabs.find((entry) => entry.feature.id === activeTab) ?? tabs[0];
  const setCollapsed = (collapsed: boolean) => settings.update((value) => ({ ...value, sidebarCollapsed: collapsed }));

  return (
    <>
      {sidebarCollapsed && (
        <button type="button" class="ptm-expand-tab" title={t('expand')} aria-label={t('expand')} onClick={() => setCollapsed(false)}>
          <IconChevronLeft size={16} />
          <Logo size={24} />
        </button>
      )}
      <aside class="ptm-sidebar" aria-label={t('appName')} aria-hidden={sidebarCollapsed}>
        <header class="ptm-sidebar__header">
          <IconButton label={t('collapse')} onClick={() => setCollapsed(true)}>
            <IconChevronRight size={18} />
          </IconButton>
          <div class="ptm-sidebar__brand">
            <Logo />
            <span>{t('appName')}</span>
          </div>
          <IconButton label={t('settings')} onClick={() => setSettingsOpen(true)}>
            <IconSettings size={18} />
          </IconButton>
        </header>
        {tabs.length > 0 ? (
          <>
            <nav class="ptm-tabs" role="tablist">
              {tabs.map(({ feature }) => {
                const TabIcon = feature.sidebarTab!.icon;
                const selected = feature.id === active?.feature.id;
                return (
                  <button
                    key={feature.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    class={selected ? 'ptm-tab ptm-tab--active' : 'ptm-tab'}
                    onClick={() => settings.update((value) => ({ ...value, activeTab: feature.id }))}
                  >
                    <TabIcon />
                    <span>{feature.sidebarTab!.label()}</span>
                  </button>
                );
              })}
            </nav>
            <div class="ptm-sidebar__panel" role="tabpanel">
              {active?.Panel && <active.Panel />}
            </div>
          </>
        ) : (
          <p class="ptm-empty">{t('noTabs')}</p>
        )}
      </aside>
      {settingsOpen && <SettingsModal features={host.features} onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
