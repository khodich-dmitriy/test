import { Controller, FieldValues, Path, useFormContext } from 'react-hook-form';

import MoneyInput from '@/src/shared/ui/money-input/money-input';
import Text from '@/src/shared/ui/typography/text';

interface ControlledMoneyInputProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  id: string;
  label: string;
  disabled?: boolean;
  testId?: string;
  onValueChange?: (value: string) => void;
  errorClassName?: string;
}

export default function ControlledMoneyInput<TFieldValues extends FieldValues>({
  name,
  id,
  label,
  disabled,
  testId,
  onValueChange,
  errorClassName
}: ControlledMoneyInputProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const handleChange = (value: string) => {
          field.onChange(value);
          onValueChange?.(value);
        };

        return (
          <>
            <MoneyInput
              id={id}
              name={field.name}
              label={label}
              value={String(field.value ?? '')}
              onBlur={field.onBlur}
              onChange={handleChange}
              hasError={Boolean(fieldState.error)}
              disabled={disabled}
              testId={testId}
            />
            {fieldState.error?.message && (
              <Text className={errorClassName} variant="inputError">
                {fieldState.error.message}
              </Text>
            )}
          </>
        );
      }}
    />
  );
}
