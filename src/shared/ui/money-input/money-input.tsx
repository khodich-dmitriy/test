import type { ChangeEvent } from 'react';

import styles from '@/src/shared/ui/money-input/money-input.module.css';

interface MoneyInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  label?: string;
  hasError?: boolean;
  testId?: string;
}

export function sanitizeMoneyInput(value: string): string {
  const withDots = value.replace(/,/g, '.');
  const filtered = withDots.replace(/[^\d.]/g, '');

  const [head, ...rest] = filtered.split('.');
  if (rest.length === 0) {
    return head;
  }

  const decimals = rest.join('').slice(0, 2);
  return `${head}.${decimals}`;
}

export function normalizeMoneyOnBlur(value: string): string {
  if (!value) {
    return '';
  }

  const sanitized = sanitizeMoneyInput(value);
  if (!sanitized) {
    return '';
  }

  if (!sanitized.includes('.')) {
    return `${sanitized}.00`;
  }

  const [intPart, decimalPart = ''] = sanitized.split('.');
  if (decimalPart.length === 0) {
    return `${intPart}.00`;
  }

  if (decimalPart.length === 1) {
    return `${intPart}.${decimalPart}0`;
  }

  return `${intPart}.${decimalPart}`;
}

export default function MoneyInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  disabled,
  label,
  hasError,
  testId
}: MoneyInputProps) {
  const handleBlur = () => {
    const normalized = normalizeMoneyOnBlur(value);
    if (normalized !== value) {
      onChange(normalized);
    }
    onBlur();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(sanitizeMoneyInput(event.target.value));
  };

  return (
    <div className={`${styles.fieldWrap} ${hasError ? styles.error : ''}`}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputShell}>
        <span className={styles.prefix}>USDT</span>
        <input
          id={id}
          name={name}
          data-testid={testId}
          aria-label={label ?? name}
          className={styles.input}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onBlur={handleBlur}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
