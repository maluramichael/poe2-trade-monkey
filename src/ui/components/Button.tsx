import type { ComponentChildren, JSX } from 'preact';

export type ButtonVariant = 'blue' | 'gold' | 'red' | 'plain';

type ButtonProps = Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon'> & {
  variant?: ButtonVariant;
  icon?: ComponentChildren;
  /** Stretches the button to the full width of its container. */
  block?: boolean;
  type?: 'button' | 'submit';
};

export function Button({ variant = 'blue', icon, block, children, class: className, type = 'button', ...rest }: ButtonProps) {
  const classes = ['ptm-btn', `ptm-btn--${variant}`, block && 'ptm-btn--block', className].filter(Boolean).join(' ');
  return (
    <button type={type} class={classes} {...rest}>
      {icon}
      {children !== undefined && <span>{children}</span>}
    </button>
  );
}

type IconButtonProps = JSX.HTMLAttributes<HTMLButtonElement> & { label: string; children: ComponentChildren };

/** Icon-only button for list rows and headers. `label` is the tooltip and accessible name. */
export function IconButton({ label, children, class: className, ...rest }: IconButtonProps) {
  return (
    <button type="button" class={['ptm-icon-btn', className].filter(Boolean).join(' ')} title={label} aria-label={label} {...rest}>
      {children}
    </button>
  );
}
