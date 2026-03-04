import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { WithdrawFormTestId } from '@/src/shared/config/test-ids';
import MoneyInput from '@/src/shared/ui/money-input/money-input';

describe('денежный инпут', () => {
  it('оставляет только цифры и максимум два знака после точки', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    function Wrapper() {
      const [value, setValue] = useState('');
      return (
        <MoneyInput
          id="amount"
          name="amount"
          testId={WithdrawFormTestId.AMOUNT_INPUT}
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
          onBlur={() => {}}
        />
      );
    }

    render(<Wrapper />);

    await user.type(screen.getByTestId(WithdrawFormTestId.AMOUNT_INPUT), '12a,3.4b5');

    expect(onChange).toHaveBeenLastCalledWith('12.34');
  });

  it('добавляет .00 на blur если пользователь не ввел дробную часть', async () => {
    const user = userEvent.setup();

    function Wrapper() {
      const [value, setValue] = useState('');
      return (
        <MoneyInput
          id="amount"
          name="amount"
          testId={WithdrawFormTestId.AMOUNT_INPUT}
          value={value}
          onChange={setValue}
          onBlur={() => {}}
        />
      );
    }

    render(<Wrapper />);

    const input = screen.getByTestId(WithdrawFormTestId.AMOUNT_INPUT);
    await user.type(input, '15');
    await user.tab();

    expect(input).toHaveValue('15.00');
  });
});
