import { Controller, FieldValues, Path, useFormContext } from 'react-hook-form';

import TextInput from '@/src/shared/ui/input/text-input';

interface ControlledTextInputProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  id: string;
  label: string;
  type?: 'text' | 'password';
  autoComplete?: string;
  disabled?: boolean;
  testId?: string;
  onValueChange?: (value: string) => void;
}

export default function ControlledTextInput<TFieldValues extends FieldValues>({
  name,
  id,
  label,
  type = 'text',
  autoComplete,
  disabled,
  testId,
  onValueChange
}: ControlledTextInputProps<TFieldValues>) {
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
          <TextInput
            id={id}
            label={label}
            type={type}
            autoComplete={autoComplete}
            value={String(field.value ?? '')}
            onBlur={field.onBlur}
            onChange={handleChange}
            disabled={disabled}
            testId={testId}
            errorMessage={fieldState.error?.message}
          />
        );
      }}
    />
  );
}
