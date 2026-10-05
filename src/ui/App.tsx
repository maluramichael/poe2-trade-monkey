import { AppContextValue, type AppContext } from '../app/context';
import type { FeatureHost } from '../app/featureHost';
import { Sidebar } from './Sidebar';
import { Toasts } from './Toasts';

export function App({ ctx, host }: { ctx: AppContext; host: FeatureHost }) {
  return (
    <AppContextValue.Provider value={ctx}>
      <Sidebar host={host} />
      <Toasts />
    </AppContextValue.Provider>
  );
}
