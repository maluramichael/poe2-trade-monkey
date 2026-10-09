import { UNKNOWN_MUTATION, type CommandEnvelope, type PageMessage } from '../bridge/protocol';
import type { TradeApp } from './vue';

export function handleCommand(app: TradeApp, command: CommandEnvelope): PageMessage {
  const { requestId } = command;
  try {
    switch (command.kind) {
      case 'getState':
        return { kind: 'reply', requestId, ok: true, value: JSON.parse(JSON.stringify(app.$store.state.persistent)) };
      case 'commit': {
        // Vuex only logs unknown mutation names, so a renamed mutation would otherwise report success.
        const known = app.$store._mutations;
        if (known && !(command.mutation in known)) {
          return { kind: 'reply', requestId, ok: false, error: `${UNKNOWN_MUTATION}: ${command.mutation}` };
        }
        app.$store.commit(command.mutation, command.payload);
        return { kind: 'reply', requestId, ok: true, value: null };
      }
    }
  } catch (error) {
    return { kind: 'reply', requestId, ok: false, error: String(error) };
  }
}
