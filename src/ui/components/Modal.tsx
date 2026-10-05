import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { IconClose } from '../icons';
import { Logo } from './Logo';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  footer?: ComponentChildren;
  width?: number;
}

export function Modal({ title, onClose, children, footer, width = 650 }: ModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div class="ptm-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div class="ptm-modal" role="dialog" aria-modal="true" aria-label={title} style={{ width: `min(${width}px, 92vw)` }}>
        <header class="ptm-modal__header">
          <Logo size={26} />
          <h2 class="ptm-modal__title">{title}</h2>
          <button type="button" class="ptm-icon-btn" aria-label="Close" onClick={onClose}>
            <IconClose />
          </button>
        </header>
        <div class="ptm-modal__body">{children}</div>
        {footer && <footer class="ptm-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
