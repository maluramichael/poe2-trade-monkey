import { Store } from '../core/store';
import { parseTradeLocation, type TradeLocation } from './tradeLocation';

/**
 * Tracks the current trade location. The site changes the URL through the History API without
 * any event we could listen to from a sandbox, so the URL is polled. Cheap and robust.
 */
export function trackLocation(win: Window = window, intervalMs = 400): {
  location: Store<TradeLocation | null>;
  href: Store<string>;
  stop(): void;
} {
  const href = new Store(win.location.href);
  const location = new Store<TradeLocation | null>(parseTradeLocation(win.location.href));
  const check = () => {
    if (win.location.href === href.get()) return;
    href.set(win.location.href);
    const next = parseTradeLocation(win.location.href);
    if (!sameLocation(next, location.get())) location.set(next);
  };
  const timer = win.setInterval(check, intervalMs);
  win.addEventListener('popstate', check);
  return {
    location,
    href,
    stop: () => {
      win.clearInterval(timer);
      win.removeEventListener('popstate', check);
    },
  };
}

function sameLocation(a: TradeLocation | null, b: TradeLocation | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
