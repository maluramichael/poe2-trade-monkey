import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Button } from '../../ui/components/Button';
import { Alert, Field, TextArea, TextInput } from '../../ui/components/Form';
import { Modal } from '../../ui/components/Modal';
import { IconCopy } from '../../ui/icons';
import { BookmarkImportError, decodeFolderCode } from './codec';
import { FOLDER_ICONS, folderIconUrl } from './icons';
import { t } from './messages';
import type { NewFolder } from './model';

/** Modal whose body is a form; Enter submits, the footer button submits too. */
function FormModal({ title, submitLabel, canSubmit, onSubmit, onClose, children }: {
  title: string;
  submitLabel: string;
  canSubmit: boolean;
  onSubmit: () => void;
  onClose: () => void;
  children: ComponentChildren;
}) {
  const formId = useMemo(() => `ptm-bm-form-${Math.random().toString(36).slice(2)}`, []);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => form.current?.querySelector<HTMLElement>('input, textarea')?.focus(), []);
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={<Button variant="gold" type="submit" form={formId} disabled={!canSubmit}>{submitLabel}</Button>}
    >
      <form
        id={formId}
        ref={form}
        class="ptm-bm-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit();
        }}
      >
        {children}
      </form>
    </Modal>
  );
}

/** Save search and rename: one title field. `suggest` fills the field unless the user typed already. */
export function TitleModal({ title, initial = '', suggest, onSave, onClose }: {
  title: string;
  initial?: string;
  suggest?: () => Promise<string>;
  onSave: (title: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const touched = useRef(false);
  useEffect(() => {
    void suggest?.().then((suggested) => {
      if (!touched.current && suggested) setValue(suggested);
    });
  }, []);
  return (
    <FormModal title={title} submitLabel={t('save')} canSubmit={value.trim() !== ''} onSubmit={() => onSave(value.trim())} onClose={onClose}>
      <Field label={t('title')}>
        <TextInput
          value={value}
          onValue={(next) => {
            touched.current = true;
            setValue(next);
          }}
        />
      </Field>
    </FormModal>
  );
}

const iconName = (id: string) => id.split('-').map((word) => word[0]!.toUpperCase() + word.slice(1)).join(' ');

export function IconPicker({ value, onChange }: { value: string | null; onChange: (icon: string | null) => void }) {
  return (
    <div class="ptm-bm-icons">
      {(['currency', 'ascendancy'] as const).map((group) => (
        <div key={group} class={`ptm-bm-icons__grid ptm-bm-icons__grid--${group}`}>
          {FOLDER_ICONS[group].map((id) => (
            <button
              key={id}
              type="button"
              class="ptm-bm-icons__cell"
              title={iconName(id)}
              aria-label={iconName(id)}
              aria-pressed={value === id}
              onClick={() => onChange(value === id ? null : id)}
            >
              <img src={folderIconUrl(id)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function FolderModal({ initial, onSave, onClose }: {
  initial?: { title: string; icon: string | null };
  onSave: (folder: { title: string; icon: string | null }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? null);
  return (
    <FormModal
      title={initial ? t('editFolder') : t('newFolder')}
      submitLabel={t('save')}
      canSubmit={title.trim() !== ''}
      onSubmit={() => onSave({ title: title.trim(), icon })}
      onClose={onClose}
    >
      <Field label={t('title')}>
        <TextInput value={title} onValue={setTitle} aria-required="true" />
      </Field>
      <div class="ptm-field">
        <span class="ptm-field__label">{t('icon')}</span>
        <IconPicker value={icon} onChange={setIcon} />
      </div>
    </FormModal>
  );
}

export function ImportModal({ onImport, onClose }: { onImport: (folder: NewFolder) => void; onClose: () => void }) {
  const [code, setCode] = useState('');
  const result = useMemo(() => {
    if (!code.trim()) return null;
    try {
      return { folder: decodeFolderCode(code) };
    } catch (error) {
      return { error: error instanceof BookmarkImportError ? error.message : String(error) };
    }
  }, [code]);
  const folder = result && 'folder' in result ? result.folder : null;
  return (
    <FormModal title={t('importFolder')} submitLabel={t('import')} canSubmit={!!folder} onSubmit={() => onImport(folder!)} onClose={onClose}>
      <Field label={t('importCode')} hint={t('importHint')}>
        <TextArea value={code} onValue={setCode} spellcheck={false} />
      </Field>
      {folder && <p class="ptm-bm-preview">{t('importPreview', { title: folder.title, n: folder.trades.length })}</p>}
      {result && 'error' in result && <Alert kind="error">{result.error}</Alert>}
    </FormModal>
  );
}

export function ShareModal({ code, onCopy, onClose }: { code: string; onCopy: () => void; onClose: () => void }) {
  return (
    <Modal
      title={t('shareTitle')}
      onClose={onClose}
      footer={<Button variant="gold" icon={<IconCopy />} onClick={onCopy}>{t('copy')}</Button>}
    >
      <Field label={t('importCode')} hint={t('shareHint')}>
        <textarea class="ptm-input ptm-textarea" value={code} readOnly onFocus={(event) => event.currentTarget.select()} />
      </Field>
    </Modal>
  );
}
