import type { ChangeEvent } from 'react';

import styles from '@/src/shared/ui/input/text-input.module.css';
import Text from '@/src/shared/ui/typography/text';

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  type?: 'text' | 'password';
  autoComplete?: string;
  disabled?: boolean;
  testId?: string;
  errorMessage?: string;
}

export default function TextInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  autoComplete,
  disabled,
  testId,
  errorMessage
}: TextInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onBlur={onBlur}
        autoComplete={autoComplete}
        data-testid={testId}
        disabled={disabled}
        className={styles.input}
        onChange={handleChange}
      />
      {errorMessage && (
        <Text className={styles.errorText} variant="inputError">
          {errorMessage}
        </Text>
      )}
    </div>
  );
}
