import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { memo } from 'react';

import buttonStyles from '@/src/shared/ui/button/button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface FormButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
  children: ReactNode;
}

function ButtonComponent({
  variant = 'primary',
  block = false,
  className,
  children,
  ...props
}: FormButtonProps) {
  const variantClass = buttonStyles[variant];
  const blockClass = block ? buttonStyles.block : '';
  const finalClassName = `${buttonStyles.button} ${variantClass} ${blockClass} ${className ?? ''}`.trim();

  return (
    <button {...props} className={finalClassName}>
      {children}
    </button>
  );
}

const Button = memo(ButtonComponent);

export default Button;
