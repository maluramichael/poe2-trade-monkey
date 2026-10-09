import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
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
  const expandRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  // Only move focus after a click on collapse/expand, never on the first render.
  const focusAfterToggle = useRef(false);
  const setCollapsed = (collapsed: boolean) => {
    focusAfterToggle.current = true;
    settings.update((value) => ({ ...value, sidebarCollapsed: collapsed }));
  };
  useEffect(() => {
    if (!focusAfterToggle.current) return;
    focusAfterToggle.current = false;
    (sidebarCollapsed ? expandRef.current : headerRef.current?.querySelector('button'))?.focus();
  }, [sidebarCollapsed]);

  const selectTab = (id: string) => settings.update((value) => ({ ...value, activeTab: id }));
  const onTabKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const id = tabs[next]!.feature.id;
    selectTab(id);
    tablistRef.current?.querySelector<HTMLElement>(`#ptm-tab-${id}`)?.focus();
  };

  return (
    <>
      {sidebarCollapsed && (
        <button ref={expandRef} type="button" class="ptm-expand-tab" title={t('expand')} aria-label={t('expand')} onClick={() => setCollapsed(false)}>
          <IconChevronLeft size={16} />
          <Logo size={24} />
        </button>
      )}
      <aside class="ptm-sidebar" aria-label={t('appName')} {...(sidebarCollapsed ? { inert: true } : {})}>
        <header ref={headerRef} class="ptm-sidebar__header">
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
            <div ref={tablistRef} role="tablist" class="ptm-tabs" aria-label={t('appName')}>
              {tabs.map(({ feature }, index) => {
                const TabIcon = feature.sidebarTab!.icon;
                const selected = feature.id === active?.feature.id;
                return (
                  <button
                    key={feature.id}
                    type="button"
                    role="tab"
                    id={`ptm-tab-${feature.id}`}
                    aria-controls="ptm-tabpanel"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    class={selected ? 'ptm-tab ptm-tab--active' : 'ptm-tab'}
                    onClick={() => selectTab(feature.id)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                  >
                    <TabIcon />
                    <span>{feature.sidebarTab!.label()}</span>
                  </button>
                );
              })}
            </div>
            <div class="ptm-sidebar__panel" role="tabpanel" id="ptm-tabpanel" aria-labelledby={active && `ptm-tab-${active.feature.id}`}>
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
