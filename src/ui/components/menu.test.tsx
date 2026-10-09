import { render } from 'preact';
import { act } from 'preact/test-utils';
import { Menu } from './Menu';

let host: HTMLElement;
const trigger = () => host.querySelector<HTMLButtonElement>('.ptm-icon-btn')!;
const items = () => [...host.querySelectorAll<HTMLButtonElement>('.ptm-menu__item')];
const key = (k: string) =>
  act(() => {
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  });

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  act(() =>
    render(
      <Menu label="More" items={[{ label: 'One', onSelect: () => {} }, { label: 'Two', onSelect: () => {} }, { label: 'Three', onSelect: () => {} }]} />,
      host,
    ),
  );
  act(() => trigger().click());
});

afterEach(() => {
  act(() => render(null, host));
  document.body.innerHTML = '';
});

describe('Menu', () => {
  it('focuses the first item when opened', () => {
    expect(document.activeElement).toBe(items()[0]);
  });

  it('moves focus with arrow keys, cyclic, and Home/End', () => {
    key('ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    key('ArrowUp');
    key('ArrowUp');
    expect(document.activeElement).toBe(items()[2]);
    key('Home');
    expect(document.activeElement).toBe(items()[0]);
    key('End');
    expect(document.activeElement).toBe(items()[2]);
  });

  it('Escape closes and focuses the trigger', () => {
    key('Escape');
    expect(items()).toHaveLength(0);
    expect(document.activeElement).toBe(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('uses no menu roles', () => {
    expect(host.querySelector('[role="menu"], [role="menuitem"], [role="none"]')).toBeNull();
    expect(trigger().hasAttribute('aria-haspopup')).toBe(false);
  });
});
