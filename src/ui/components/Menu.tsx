import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { IconEllipsis } from '../icons';

export interface MenuItem {
  label: string;
  icon?: ComponentChildren;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/**
 * "…" button that opens a small list of actions below it (disclosure pattern). Arrow keys, Home and
 * End move between entries. Closes on outside click, Escape and when focus leaves.
 */
export function Menu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>('.ptm-menu__item')?.focus();
    const close = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    const entries = [...list.current!.querySelectorAll<HTMLElement>('.ptm-menu__item')];
    const index = entries.indexOf(document.activeElement as HTMLElement);
    const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: entries.length - 1 }[event.key];
    if (next === undefined || !entries.length) return;
    event.preventDefault();
    entries[(next + entries.length) % entries.length]?.focus();
  };

  return (
    <div
      class="ptm-menu"
      ref={root}
      onFocusOut={(event) => {
        if (open && !root.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        class="ptm-icon-btn"
        title={label}
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(!open);
        }}
      >
        <IconEllipsis size={16} />
      </button>
      {open && (
        <ul class="ptm-menu__list" ref={list} onKeyDown={onKeyDown}>
          {items
            .filter((item) => !item.hidden)
            .map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  class={item.danger ? 'ptm-menu__item ptm-menu__item--danger' : 'ptm-menu__item'}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen(false);
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
