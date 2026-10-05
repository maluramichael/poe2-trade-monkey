import { Button } from './Button';
import { Modal } from './Modal';
import { t } from '../messages';

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={420}
      footer={
        <>
          <Button variant="plain" onClick={onCancel}>{t('cancel')}</Button>
          <Button variant="red" onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p class="ptm-text">{message}</p>
    </Modal>
  );
}
