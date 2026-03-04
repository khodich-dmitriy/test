import { Controller, FieldValues, Path, useFormContext } from 'react-hook-form';

import Checkbox from '@/src/shared/ui/checkbox/checkbox';

interface ControlledCheckboxProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  id: string;
  label: string;
  disabled?: boolean;
  testId?: string;
  onValueChange?: (checked: boolean) => void;
}

export default function ControlledCheckbox<TFieldValues extends FieldValues>({
  name,
  id,
  label,
  disabled,
  testId,
  onValueChange
}: ControlledCheckboxProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const handleChange = (checked: boolean) => {
          field.onChange(checked);
          onValueChange?.(checked);
        };

        return (
          <Checkbox
            id={id}
            name={field.name}
            label={label}
            checked={Boolean(field.value)}
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
