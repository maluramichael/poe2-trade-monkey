import { Store } from '../core/store';
import type { TradeLocation } from '../site/tradeLocation';

/** Knows the league of the trade page the user is on. */
export class LeagueService {
  /** League of the trade page the user is on. Remembered when visiting history or settings. */
  readonly current: Store<string | null>;

  constructor(location: Store<TradeLocation | null>) {
    this.current = new Store(location.get()?.league ?? null);
    location.subscribe((next) => {
      if (next) this.current.set(next.league);
    });
  }
}
