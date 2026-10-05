import { useApp } from '../app/context';
import { useStore } from '../core/store';

export function Toasts() {
  const { toast } = useApp();
  const toasts = useStore(toast.toasts);
  return (
    <div class="ptm-toasts" role="status" aria-live="polite">
      {toasts.map((entry) => (
        <button key={entry.id} type="button" class={`ptm-toast ptm-toast--${entry.kind}`} onClick={() => toast.dismiss(entry.id)}>
          {entry.message}
        </button>
      ))}
    </div>
  );
}
