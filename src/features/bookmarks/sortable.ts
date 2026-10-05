/**
 * Pointer-based drag sorting that works in Firefox (no HTML5 drag and drop, which breaks with
 * links and inside userscript shadows). DOM contract:
 *
 *   <ul data-sort-list="trades" data-sort-list-id="<folder id>">    a drop target
 *     <li data-sort-kind="trades" data-sort-item="<trade id>">      a sortable item
 *       <button data-sort-handle="<trade id>">                      the grip
 *
 * Lists of one kind may nest inside items of another kind (trades inside folders).
 */

export interface DropTarget {
  listId: string;
  /** Insertion slot among the list's items as rendered, counting the dragged item if it is there. */
  index: number;
}

/** Slot for pointer `y`: the number of items whose vertical middle lies above it. */
export function insertionIndex(rects: readonly { top: number; bottom: number }[], y: number): number {
  return rects.filter((rect) => (rect.top + rect.bottom) / 2 < y).length;
}

/** Final index of an item moved from `from` into slot `insertion` of the same list (`from` = -1 for another list). */
export function finalIndex(from: number, insertion: number): number {
  return from >= 0 && insertion > from ? insertion - 1 : insertion;
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

const DRAG_THRESHOLD = 4;
const EDGE = 40;
const SCROLL_STEP = 12;

const listsOf = (doc: Document, kind: string) => [...doc.querySelectorAll<HTMLElement>(`[data-sort-list="${kind}"]`)];
const itemsOf = (list: HTMLElement, kind: string) => [...list.querySelectorAll<HTMLElement>(`[data-sort-kind="${kind}"][data-sort-item]`)];

/**
 * Call from the handle's pointerdown. Follows the pointer, shows a drop line, scrolls `scroller`
 * near its edges and calls `onDrop` on release. Escape or pointercancel aborts.
 */
export function startPointerDrag(
  event: PointerEvent,
  { kind, scroller, onDrop }: { kind: string; scroller: HTMLElement | null; onDrop: (target: DropTarget) => void },
): void {
  if (event.button !== 0) return;
  const handle = event.currentTarget as HTMLElement;
  const doc = handle.ownerDocument;
  const win = doc.defaultView!;
  const item = handle.closest<HTMLElement>('[data-sort-item]');
  if (!item) return;
  event.preventDefault();
  handle.focus();

  const startY = event.clientY;
  let lastX = event.clientX;
  let lastY = event.clientY;
  let dragging = false;
  let target: DropTarget | null = null;
  const line = doc.createElement('div');
  line.className = 'ptm-bm-drop-line';

  const locate = () => {
    const list = listsOf(doc, kind).find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return lastY >= rect.top && lastY <= rect.bottom && lastX >= rect.left && lastX <= rect.right;
    });
    if (!list) {
      target = null;
      line.remove();
      return;
    }
    const items = itemsOf(list, kind);
    const rects = items.map((el) => el.getBoundingClientRect());
    const index = insertionIndex(rects, lastY);
    const listRect = list.getBoundingClientRect();
    const y = rects[index]?.top ?? rects[rects.length - 1]?.bottom ?? listRect.bottom;
    target = { listId: list.dataset.sortListId ?? '', index };
    Object.assign(line.style, { top: `${y - 1}px`, left: `${listRect.left}px`, width: `${listRect.width}px` });
    if (!line.isConnected) doc.body.append(line);
  };

  const autoScroll = win.setInterval(() => {
    if (!dragging || !scroller) return;
    const rect = scroller.getBoundingClientRect();
    const delta = lastY < rect.top + EDGE ? -SCROLL_STEP : lastY > rect.bottom - EDGE ? SCROLL_STEP : 0;
    if (delta) {
      scroller.scrollTop += delta;
      locate();
    }
  }, 16);

  const onMove = (move: PointerEvent) => {
    lastX = move.clientX;
    lastY = move.clientY;
    if (!dragging && Math.abs(lastY - startY) < DRAG_THRESHOLD) return;
    if (!dragging) {
      dragging = true;
      item.classList.add('ptm-bm-dragging');
      doc.documentElement.classList.add('ptm-bm-sorting');
    }
    locate();
  };
  const finish = (drop: boolean) => {
    win.clearInterval(autoScroll);
    win.removeEventListener('pointermove', onMove);
    win.removeEventListener('pointerup', onUp);
    win.removeEventListener('pointercancel', onCancel);
    doc.removeEventListener('keydown', onKey, true);
    line.remove();
    item.classList.remove('ptm-bm-dragging');
    doc.documentElement.classList.remove('ptm-bm-sorting');
    if (drop && dragging && target) onDrop(target);
  };
  const onUp = () => finish(true);
  const onCancel = () => finish(false);
  const onKey = (key: KeyboardEvent) => {
    if (key.key !== 'Escape') return;
    key.preventDefault();
    key.stopPropagation();
    finish(false);
  };

  win.addEventListener('pointermove', onMove);
  win.addEventListener('pointerup', onUp);
  win.addEventListener('pointercancel', onCancel);
  doc.addEventListener('keydown', onKey, true);
}

/**
 * ArrowUp/ArrowDown on a focused handle: moves the item by one and keeps the focus on its handle.
 * Returns true when the key was handled.
 */
export function handleSortKey(event: KeyboardEvent, ids: readonly string[], id: string, apply: (ids: string[]) => void): boolean {
  const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
  const from = ids.indexOf(id);
  if (!step || from < 0) return false;
  event.preventDefault();
  const to = from + step;
  if (to < 0 || to >= ids.length) return true;
  apply(moveItem(ids, from, to));
  const doc = (event.currentTarget as HTMLElement).ownerDocument;
  setTimeout(() => doc.querySelector<HTMLElement>(`[data-sort-handle="${CSS.escape(id)}"]`)?.focus());
  return true;
}
