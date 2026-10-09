import { useApp } from '../app/context';
import type { Toast } from '../app/toaster';
import { useStore } from '../core/store';
import { t } from './messages';

export function Toasts() {
  const { toast } = useApp();
  const toasts = useStore(toast.toasts);
  const list = (entries: Toast[]) =>
    entries.map((entry) => (
      <button
        key={entry.id}
        type="button"
        class={`ptm-toast ptm-toast--${entry.kind}`}
        title={t('close')}
        onClick={() => toast.dismiss(entry.id)}
      >
        {entry.message}
      </button>
    ));
  return (
    <div class="ptm-toasts">
      <div role="status" aria-live="polite">
        {list(toasts.filter((entry) => entry.kind !== 'error'))}
      </div>
      <div role="alert">{list(toasts.filter((entry) => entry.kind === 'error'))}</div>
    </div>
  );
}
