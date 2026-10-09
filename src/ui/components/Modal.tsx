import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { IconClose } from '../icons';
import { t } from '../messages';
import { IconButton } from './Button';
import { focusables } from './focus';
import { Logo } from './Logo';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  footer?: ComponentChildren;
  width?: number;
}

/** Open modals, topmost last. Only the topmost one reacts to Escape. */
const stack: object[] = [];

export function Modal({ title, onClose, children, footer, width = 650 }: ModalProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const token = useRef({});
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = dialog.current!;
    const body = el.querySelector('.ptm-modal__body');
    const foot = el.querySelector('.ptm-modal__footer');
    const start =
      el.querySelector<HTMLElement>('[data-autofocus]') ??
      (body && focusables(body)[0]) ??
      (foot && focusables(foot)[0]) ??
      el;
    start.focus();

    stack.push(token.current);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || stack[stack.length - 1] !== token.current) return;
      event.stopPropagation();
      close.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token.current), 1);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const trapTab = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const items = focusables(dialog.current!);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey ? document.activeElement === first || document.activeElement === dialog.current : document.activeElement === last) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  };

  return (
    <div class="ptm-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialog}
        class="ptm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={trapTab}
        style={{ width: `min(${width}px, 92vw)` }}
      >
        <header class="ptm-modal__header">
          <Logo size={26} />
          <h2 class="ptm-modal__title">{title}</h2>
          <IconButton label={t('close')} onClick={onClose}>
            <IconClose />
          </IconButton>
        </header>
        <div class="ptm-modal__body">{children}</div>
        {footer && <footer class="ptm-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
