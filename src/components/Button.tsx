import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

type Variant = 'dark' | 'outline' | 'light' | 'link';
type Size = 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Растянуть на всю ширину контейнера. */
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'outline',
  size = 'md',
  block = false,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], block ? styles.block : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}
