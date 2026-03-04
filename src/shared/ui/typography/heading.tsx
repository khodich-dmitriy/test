import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type HeadingProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children'>;

export default function Heading<T extends ElementType = 'h2'>({
  as,
  children,
  ...props
}: HeadingProps<T>) {
  const Component = as ?? 'h2';
  return <Component {...props}>{children}</Component>;
}
