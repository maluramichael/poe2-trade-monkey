import type { FetchResult, PersistentState, SearchPayload, SearchResponse } from '../tradeTypes';
import type { TradeType } from '../tradeLocation';

/**
 * Messages between the userscript (content side) and the script injected into the page.
 * Both sides exchange JSON strings in `CustomEvent.detail`, which crosses the Firefox
 * sandbox boundary without Xray wrappers in every userscript manager.
 */
export const PAGE_TO_CONTENT = 'ptm:page';
export const CONTENT_TO_PAGE = 'ptm:content';

/** Fired by the page script. */
export type PageMessage =
  | { kind: 'ready' }
  | { kind: 'search'; captured: CapturedSearch }
  | { kind: 'listings'; results: FetchResult[] }
  | { kind: 'mutation'; type: string }
  | { kind: 'reply'; requestId: number; ok: true; value: unknown }
  | { kind: 'reply'; requestId: number; ok: false; error: string };

/** A search the site sent to the API, captured from its XHR. */
export interface CapturedSearch {
  type: TradeType;
  realm: string;
  league: string;
  request: SearchPayload;
  response: SearchResponse;
}

/** Sent by the userscript, answered with a `reply`. */
export type Command =
  | { kind: 'getState' }
  | { kind: 'commit'; mutation: string; payload: unknown };

export type CommandResult<C extends Command> = C extends { kind: 'getState' } ? PersistentState : null;

export type CommandEnvelope = Command & { requestId: number };
