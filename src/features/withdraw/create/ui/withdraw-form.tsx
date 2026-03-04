'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { useWithdrawStore } from '@/src/features/withdraw/create/model/withdraw-store';
import styles from '@/src/features/withdraw/create/ui/withdraw-form.module.css';
import { WithdrawFormTestId } from '@/src/shared/config/test-ids';
import buttonStyles from '@/src/shared/ui/button/button.module.css';
import MoneyInput from '@/src/shared/ui/money-input/money-input';

type WithdrawFormValues = {
  amount: string;
  destination: string;
  confirm: boolean;
};

const schema: yup.ObjectSchema<WithdrawFormValues> = yup
  .object({
    amount: yup
      .string()
      .required('Amount is required')
      .test('positive', 'Amount must be greater than 0', (value) => Number(value) > 0),
    destination: yup.string().trim().required('Destination is required'),
    confirm: yup.boolean().defined().oneOf([true], 'Please confirm withdrawal')
  })
  .required();

export default function WithdrawForm() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const amount = useWithdrawStore((s) => s.amount);
  const destination = useWithdrawStore((s) => s.destination);
  const confirm = useWithdrawStore((s) => s.confirm);
  const status = useWithdrawStore((s) => s.status);
  const errorMessage = useWithdrawStore((s) => s.errorMessage);
  const withdrawal = useWithdrawStore((s) => s.withdrawal);
  const setAmount = useWithdrawStore((s) => s.setAmount);
  const setDestination = useWithdrawStore((s) => s.setDestination);
  const setConfirm = useWithdrawStore((s) => s.setConfirm);
  const submitWithdrawal = useWithdrawStore((s) => s.submitWithdrawal);
  const retryLastRequest = useWithdrawStore((s) => s.retryLastRequest);
  const restoreLatestWithdrawal = useWithdrawStore((s) => s.restoreLatestWithdrawal);
  const resetStore = useWithdrawStore((s) => s.reset);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting }
  } = useForm<WithdrawFormValues>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      amount,
      destination,
      confirm
    }
  });

  useEffect(() => {
    restoreLatestWithdrawal();
  }, [restoreLatestWithdrawal]);

  const resetFormState = () => {
    resetStore();
    reset({
      amount: '',
      destination: '',
      confirm: false
    });
  };

  const onSubmit = handleSubmit(async () => {
    setIsRedirecting(true);
    const id = await submitWithdrawal();
    if (id) {
      resetFormState();
      router.push(`/withdraw/${id}`);
      return;
    }
    setIsRedirecting(false);
  });

  const isBusy = isRedirecting || isSubmitting || status === 'loading';

  return (
    <main className={styles.page}>
      <div className={`${styles.grid} ${isBusy ? styles.dimmed : ''}`}>
        <section className={styles.card}>
          <h1 className={styles.title}>Withdraw</h1>
          <p className={styles.meta}>State: {status}</p>

          <form onSubmit={onSubmit} className={styles.form}>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <MoneyInput
                  id="amount"
                  name="amount"
                  testId={WithdrawFormTestId.AMOUNT_INPUT}
                  label="Amount"
                  value={field.value}
                  onBlur={field.onBlur}
                  hasError={Boolean(errors.amount)}
                  disabled={isBusy}
                  onChange={(nextValue) => {
                    field.onChange(nextValue);
                    setAmount(nextValue);
                  }}
                />
              )}
            />
            {errors.amount && <p className={styles.errorText}>{errors.amount.message}</p>}

            <div className={styles.field}>
              <label htmlFor="destination" className={styles.label}>
                Destination
              </label>
              <input
                id="destination"
                type="text"
                data-testid={WithdrawFormTestId.DESTINATION_INPUT}
                className={styles.input}
                {...register('destination', {
                  onChange: (event) => setDestination(event.target.value)
                })}
              />
              {errors.destination && (
                <p className={styles.errorText}>{errors.destination.message}</p>
              )}
            </div>

            <Controller
              control={control}
              name="confirm"
              render={({ field }) => (
                <label htmlFor="confirm" className={styles.checkboxRow}>
                  <input
                    id="confirm"
                    name={field.name}
                    type="checkbox"
                    data-testid={WithdrawFormTestId.CONFIRM_CHECKBOX}
                    className={styles.checkbox}
                    checked={field.value}
                    onBlur={field.onBlur}
                    onChange={(event) => {
                      field.onChange(event.target.checked);
                      setConfirm(event.target.checked);
                    }}
                  />
                  <span className={styles.checkboxText}>Confirm withdrawal</span>
                </label>
              )}
            />
            {errors.confirm && <p className={styles.errorText}>{errors.confirm.message}</p>}

            <div className={styles.actions}>
              <button
                type="submit"
                disabled={!isValid || isBusy}
                className={`${buttonStyles.button} ${buttonStyles.primary} ${buttonStyles.block}`}
              >
                {isBusy ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </section>

        <aside className={`${styles.card} ${styles.sideCard}`}>
          <h2 className={styles.sideTitle}>Withdrawal Rules</h2>
          <p className={styles.sideText}>Amount must be greater than 0.</p>
          <p className={styles.sideText}>Destination is required.</p>
          <p className={styles.sideText}>You must confirm before submitting.</p>
        </aside>
      </div>

      {status === 'error' && (
        <section
          className={`${styles.card} ${styles.feedback} ${styles.errorBox}`}
          aria-live="polite"
        >
          <p className={styles.bannerTitle}>Request error</p>
          <p className={styles.bannerText}>{errorMessage}</p>
          <button
            type="button"
            onClick={async () => {
              setIsRedirecting(true);
              const id = await retryLastRequest();
              if (id) {
                resetFormState();
                router.push(`/withdraw/${id}`);
                return;
              }
              setIsRedirecting(false);
            }}
            disabled={isBusy}
            className={`${buttonStyles.button} ${buttonStyles.secondary}`}
          >
            Retry
          </button>
        </section>
      )}

      {status === 'success' && withdrawal && (
        <section
          className={`${styles.card} ${styles.feedback} ${styles.successBox}`}
          aria-live="polite"
        >
          <p className={styles.bannerTitle}>Latest withdrawal is ready.</p>
          <p className={styles.bannerText}>Open details page to review current status.</p>
          <button
            type="button"
            className={`${buttonStyles.button} ${buttonStyles.secondary}`}
            onClick={() => router.push(`/withdraw/${withdrawal.id}`)}
          >
            Open last withdrawal
          </button>
        </section>
      )}

      {isBusy && (
        <div className={styles.overlay} aria-live="assertive" aria-label="Loading">
          <div className={styles.overlayCard}>
            <div className={styles.spinner} />
            <p className={styles.overlayText}>Processing withdrawal...</p>
          </div>
        </div>
      )}
    </main>
  );
}
