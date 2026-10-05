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

/** "…" button that opens a small context menu below it. Closes on outside click and Escape. */
export function Menu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div class="ptm-menu" ref={root}>
      <button
        type="button"
        class="ptm-icon-btn"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
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
        <ul class="ptm-menu__list" role="menu">
          {items
            .filter((item) => !item.hidden)
            .map((item) => (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
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
