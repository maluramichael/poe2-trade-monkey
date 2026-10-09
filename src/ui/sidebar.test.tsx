import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { FeatureHost, RunningFeature } from '../app/featureHost';
import { AppContextValue } from '../app/context';
import { Store } from '../core/store';
import type { Feature } from '../features/types';
import { createTestContext, type TestContext } from '../test/context';
import type { Settings } from '../app/settings';
import { Sidebar } from './Sidebar';

const feature = (id: string, order: number): Feature =>
  ({ id, sidebarTab: { label: () => id, icon: () => null, order }, start: () => {} }) as unknown as Feature;

const features = [feature('alpha', 1), feature('beta', 2)];
const running: RunningFeature[] = features.map((f) => ({ feature: f, Panel: () => <p>{f.id} panel</p> }));
const host = { running: new Store(running), features } as unknown as FeatureHost;

let ctx: TestContext;
let root: HTMLElement;

function mount(settings: Partial<Settings> = {}) {
  ctx = createTestContext({ settings });
  root = document.createElement('div');
  document.body.appendChild(root);
  act(() => {
    render(
      <AppContextValue.Provider value={ctx}>
        <Sidebar host={host} />
      </AppContextValue.Provider>,
      root,
    );
  });
}

const tabs = () => [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

afterEach(() => {
  act(() => render(null, root));
  root.remove();
});

describe('Sidebar', () => {
  it('makes the collapsed sidebar inert', () => {
    mount({ sidebarCollapsed: true });
    expect(root.querySelector('aside')!.hasAttribute('inert')).toBe(true);
  });

  it('is not inert when expanded', () => {
    mount({ sidebarCollapsed: false });
    expect(root.querySelector('aside')!.hasAttribute('inert')).toBe(false);
  });

  it('moves focus between collapse and expand buttons', () => {
    mount({ sidebarCollapsed: false });
    act(() => root.querySelector<HTMLButtonElement>('.ptm-sidebar__header button')!.click());
    const expand = root.querySelector<HTMLButtonElement>('.ptm-expand-tab')!;
    expect(document.activeElement).toBe(expand);
    act(() => expand.click());
    expect(document.activeElement).toBe(root.querySelector('.ptm-sidebar__header button'));
  });

  it('switches tabs with the arrow keys', () => {
    mount({ sidebarCollapsed: false, activeTab: 'alpha' });
    act(() => {
      tabs()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(ctx.settings.get().activeTab).toBe('beta');
    expect(document.activeElement).toBe(tabs()[1]);
    act(() => {
      tabs()[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(ctx.settings.get().activeTab).toBe('alpha');
  });

  it('gives only the active tab tabIndex 0 and labels the panel', () => {
    mount({ sidebarCollapsed: false, activeTab: 'beta' });
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([-1, 0]);
    const panel = root.querySelector('[role="tabpanel"]')!;
    expect(panel.getAttribute('aria-labelledby')).toBe('ptm-tab-beta');
    expect(document.getElementById('ptm-tab-beta')!.getAttribute('aria-controls')).toBe(panel.id);
  });
});
