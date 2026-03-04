import type { ChangeEvent } from 'react';

import styles from '@/src/shared/ui/checkbox/checkbox.module.css';
import Text from '@/src/shared/ui/typography/text';

interface CheckboxProps {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onBlur: () => void;
  disabled?: boolean;
  testId?: string;
  errorMessage?: string;
}

export default function Checkbox({
  id,
  name,
  label,
  checked,
  onChange,
  onBlur,
  disabled,
  testId,
  errorMessage
}: CheckboxProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  return (
    <div className={styles.wrapper}>
      <label htmlFor={id} className={styles.checkboxRow}>
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onBlur={onBlur}
          disabled={disabled}
          data-testid={testId}
          className={styles.checkbox}
          onChange={handleChange}
        />
        <span className={styles.checkboxText}>{label}</span>
      </label>
      {errorMessage && (
        <Text className={styles.errorText} variant="inputError">
          {errorMessage}
        </Text>
      )}
    </div>
  );
}
