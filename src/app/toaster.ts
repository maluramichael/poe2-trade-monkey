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

const DURATION_MS = 4500;

export function createToaster(): Toaster {
  const toasts = new Store<Toast[]>([]);
  let nextId = 1;
  const dismiss = (id: number) => toasts.update((list) => list.filter((toast) => toast.id !== id));
  const toast = ((message: string, kind: ToastKind = 'success') => {
    const id = nextId++;
    toasts.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => dismiss(id), DURATION_MS);
  }) as Toaster;
  toast.toasts = toasts;
  toast.dismiss = dismiss;
  return toast;
}
