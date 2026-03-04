import type { SelectHTMLAttributes } from 'react';

import styles from '@/src/shared/ui/select/select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export default function Select({ options, className, ...props }: SelectProps) {
  const finalClassName = `${styles.select} ${className ?? ''}`.trim();

  return (
    <select {...props} className={finalClassName}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
