import { Store } from '../core/store';

export type ToastKind = 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface Toaster {
  (message: string, kind?: ToastKind): void;
  toasts: Store<Toast[]>;
  dismiss(id: number): void;
}

/** How long a toast stays; errors stay until clicked. */
export const DURATIONS = { success: 4500, warning: 8000, error: undefined } as const satisfies Record<ToastKind, number | undefined>;

export function createToaster(): Toaster {
  const toasts = new Store<Toast[]>([]);
  let nextId = 1;
  const dismiss = (id: number) => toasts.update((list) => list.filter((toast) => toast.id !== id));
  const toast = ((message: string, kind: ToastKind = 'success') => {
    if (toasts.get().some((entry) => entry.kind === kind && entry.message === message)) return;
    const id = nextId++;
    toasts.update((list) => [...list, { id, kind, message }]);
    const duration: number | undefined = DURATIONS[kind];
    if (duration !== undefined) setTimeout(() => dismiss(id), duration);
  }) as Toaster;
  toast.toasts = toasts;
  toast.dismiss = dismiss;
  return toast;
}
