import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import styles from '@/src/shared/ui/typography/text.module.css';

type TextVariant =
  | 'body'
  | 'meta'
  | 'muted'
  | 'error'
  | 'banner'
  | 'bannerTitle'
  | 'overlay'
  | 'inputError';

type TextProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  variant?: TextVariant;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children'>;

export default function Text<T extends ElementType = 'p'>({
  as,
  children,
  variant = 'body',
  className,
  ...props
}: TextProps<T>) {
  const Component = as ?? 'p';
  const finalClassName = `${styles.text} ${styles[variant]} ${className ?? ''}`.trim();
  return (
    <Component {...props} className={finalClassName}>
      {children}
    </Component>
  );
}
