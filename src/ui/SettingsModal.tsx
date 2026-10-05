import { useApp } from '../app/context';
import type { LanguageSetting } from '../app/settings';
import { isFeatureEnabled } from '../app/settings';
import { useStore } from '../core/store';
import type { Feature } from '../features/types';
import { Checkbox, Field } from './components/Form';
import { Modal } from './components/Modal';
import { t } from './messages';

export function SettingsModal({ features, onClose }: { features: readonly Feature[]; onClose: () => void }) {
  const { settings } = useApp();
  const current = useStore(settings);
  const setFeature = (id: string, enabled: boolean) =>
    settings.update((value) => ({ ...value, features: { ...value.features, [id]: enabled } }));

  return (
    <Modal title={t('settings')} onClose={onClose}>
      <Field label={t('language')}>
        <select
          class="ptm-input"
          value={current.language}
          onChange={(event) => {
            const language = event.currentTarget.value as LanguageSetting;
            settings.update((value) => ({ ...value, language }));
          }}
        >
          <option value="auto">{t('languageAuto')}</option>
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </Field>
      <h3 class="ptm-section-title">{t('features')}</h3>
      <div class="ptm-settings-grid">
        {features
          .filter((feature) => feature.toggleable)
          .map((feature) => (
            <Checkbox
              key={feature.id}
              checked={isFeatureEnabled(current, feature.id, feature.defaultEnabled)}
              onChange={(enabled) => setFeature(feature.id, enabled)}
              label={feature.label()}
              description={feature.description()}
            />
          ))}
      </div>
      <p class="ptm-meta">
        {t('version', { version: __VERSION__ })} ·{' '}
        <a href="https://github.com/maluramichael/poe2-trade-monkey" target="_blank" rel="noreferrer">
          {t('sourceCode')}
        </a>
      </p>
      <p class="ptm-meta">{t('disclaimer')}</p>
    </Modal>
  );
}
