import type { ComponentChildren, JSX } from 'preact';

export function Field({ label, children, hint }: { label: string; children: ComponentChildren; hint?: string }) {
  return (
    <label class="ptm-field">
      <span class="ptm-field__label">{label}</span>
      {children}
      {hint && <span class="ptm-field__hint">{hint}</span>}
    </label>
  );
}

export function TextInput(props: JSX.InputHTMLAttributes<HTMLInputElement> & { value: string; onValue: (value: string) => void }) {
  const { onValue, class: className, ...rest } = props;
  return (
    <input
      type="text"
      class={['ptm-input', className].filter(Boolean).join(' ')}
      onInput={(event) => onValue(event.currentTarget.value)}
      {...rest}
    />
  );
}

export function TextArea(props: JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; onValue: (value: string) => void }) {
  const { onValue, class: className, ...rest } = props;
  return (
    <textarea
      class={['ptm-input', 'ptm-textarea', className].filter(Boolean).join(' ')}
      onInput={(event) => onValue(event.currentTarget.value)}
      {...rest}
    />
  );
}

export function Checkbox({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label class="ptm-checkbox">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span class="ptm-checkbox__box" aria-hidden="true" />
      <span class="ptm-checkbox__text">
        <span class="ptm-checkbox__label">{label}</span>
        {description && <span class="ptm-checkbox__description">{description}</span>}
      </span>
    </label>
  );
}

export function Alert({ kind, children }: { kind: 'warning' | 'error' | 'success'; children: ComponentChildren }) {
  return <div class={`ptm-alert ptm-alert--${kind}`}>{children}</div>;
}
