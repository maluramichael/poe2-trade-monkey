import { render } from 'preact';
import { act } from 'preact/test-utils';
import { t } from '../messages';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';

let host: HTMLElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  act(() => render(null, host));
  document.body.innerHTML = '';
});

const mount = (vnode: preact.ComponentChild) => act(() => render(vnode, host));
const key = (target: EventTarget, k: string, shiftKey = false) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true }));
  });

describe('Modal', () => {
  it('focuses the first element in the body on mount', () => {
    mount(
      <Modal title="T" onClose={() => {}} footer={<button>ok</button>}>
        <input id="first" />
        <input id="second" />
      </Modal>,
    );
    expect(document.activeElement?.id).toBe('first');
  });

  it('focuses Cancel in a ConfirmDialog', () => {
    mount(<ConfirmDialog title="T" message="m" confirmLabel="Delete" onConfirm={() => {}} onCancel={() => {}} />);
    expect(document.activeElement?.textContent).toBe(t('cancel'));
  });

  it('wraps Tab from the last element to the first and back', () => {
    mount(
      <Modal title="T" onClose={() => {}} footer={<button id="last">ok</button>}>
        <input id="first" />
      </Modal>,
    );
    const last = document.getElementById('last')!;
    last.focus();
    key(last, 'Tab');
    expect(document.activeElement).toBe(host.querySelector('.ptm-icon-btn'));
    key(document.activeElement!, 'Tab', true);
    expect(document.activeElement).toBe(last);
  });

  it('returns focus to the previously focused element on unmount', () => {
    const before = document.createElement('button');
    document.body.appendChild(before);
    before.focus();
    mount(<Modal title="T" onClose={() => {}}><input /></Modal>);
    expect(document.activeElement).not.toBe(before);
    mount(null);
    expect(document.activeElement).toBe(before);
  });

  it('Escape closes only the top modal', () => {
    const lower = vi.fn();
    const upper = vi.fn();
    mount(
      <>
        <Modal title="A" onClose={lower}><input /></Modal>
        <Modal title="B" onClose={upper}><input /></Modal>
      </>,
    );
    key(document, 'Escape');
    expect(upper).toHaveBeenCalledTimes(1);
    expect(lower).not.toHaveBeenCalled();
  });

  it('labels the close button with the translated text', () => {
    mount(<Modal title="T" onClose={() => {}}><p>x</p></Modal>);
    expect(host.querySelector('.ptm-modal__header .ptm-icon-btn')?.getAttribute('aria-label')).toBe(t('close'));
  });
});
