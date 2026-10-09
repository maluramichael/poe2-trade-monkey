import type { ButtonHTMLAttributes, ComponentChildren } from 'preact';

export type ButtonVariant = 'blue' | 'gold' | 'red' | 'plain';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'type'> & {
  variant?: ButtonVariant;
  icon?: ComponentChildren;
  /** Stretches the button to the full width of its container. */
  block?: boolean;
  /** Pressed state for toggle buttons (gold highlight, aria-pressed). */
  active?: boolean;
  size?: 'md' | 'sm';
  type?: 'button' | 'submit';
};

export function Button({ variant = 'blue', icon, block, active, size = 'md', children, class: className, type = 'button', ...rest }: ButtonProps) {
  const classes = [
    'ptm-btn',
    `ptm-btn--${variant}`,
    size === 'sm' && 'ptm-btn--sm',
    block && 'ptm-btn--block',
    active && 'ptm-btn--active',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} class={classes} aria-pressed={active === undefined ? undefined : active} {...rest}>
      {icon}
      {children !== undefined && <span>{children}</span>}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ComponentChildren };

/** Icon-only button for list rows and headers. `label` is the tooltip and accessible name. */
export function IconButton({ label, children, class: className, ...rest }: IconButtonProps) {
  return (
    <button type="button" class={['ptm-icon-btn', className].filter(Boolean).join(' ')} title={label} aria-label={label} {...rest}>
      {children}
    </button>
  );
}

/**
 * Joined buttons (segmented control). `block` stretches the group to the container and gives every
 * button the same width. Use it whenever two or more related actions sit next to each other.
 */
export function ButtonGroup({ children, block, label, class: className }: {
  children: ComponentChildren;
  block?: boolean;
  /** Accessible name of the group. */
  label?: string;
  class?: string;
}) {
  return (
    <div role="group" aria-label={label} class={['ptm-btn-group', block && 'ptm-btn-group--block', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
