'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { useShallow } from 'zustand/react/shallow';

import { WithdrawRequestStatus } from '@/src/features/withdraw/create/model/request-status';
import { useWithdrawStore } from '@/src/features/withdraw/create/model/withdraw-store';
import styles from '@/src/features/withdraw/create/ui/withdraw-form.module.css';
import { WithdrawFormTestId } from '@/src/shared/config/test-ids';
import { getWithdrawDetailsRoute } from '@/src/shared/config/urls';
import Button from '@/src/shared/ui/button/button';
import ControlledCheckbox from '@/src/shared/ui/form/controlled-checkbox';
import ControlledMoneyInput from '@/src/shared/ui/form/controlled-money-input';
import ControlledTextInput from '@/src/shared/ui/form/controlled-text-input';
import Spinner from '@/src/shared/ui/spinner/spinner';
import Heading from '@/src/shared/ui/typography/heading';
import Text from '@/src/shared/ui/typography/text';

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
  const {
    amount,
    destination,
    confirm,
    status,
    errorMessage,
    withdrawal,
    setAmount,
    setDestination,
    setConfirm,
    submitWithdrawal,
    retryLastRequest,
    restoreLatestWithdrawal,
    resetStore
  } = useWithdrawStore(
    useShallow((state) => ({
      amount: state.amount,
      destination: state.destination,
      confirm: state.confirm,
      status: state.status,
      errorMessage: state.errorMessage,
      withdrawal: state.withdrawal,
      setAmount: state.setAmount,
      setDestination: state.setDestination,
      setConfirm: state.setConfirm,
      submitWithdrawal: state.submitWithdrawal,
      retryLastRequest: state.retryLastRequest,
      restoreLatestWithdrawal: state.restoreLatestWithdrawal,
      resetStore: state.reset
    }))
  );

  const methods = useForm<WithdrawFormValues>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      amount,
      destination,
      confirm
    }
  });
  const {
    handleSubmit,
    reset,
    formState: { isValid, isSubmitting }
  } = methods;

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

  const goToWithdrawDetails = (id: string) => {
    router.push(getWithdrawDetailsRoute(id));
  };

  const handleSubmitRequest = async () => {
    setIsRedirecting(true);
    const id = await submitWithdrawal();
    if (id) {
      resetFormState();
      goToWithdrawDetails(id);
      return;
    }
    setIsRedirecting(false);
  };

  const onSubmit = handleSubmit(handleSubmitRequest);

  const isBusy = isRedirecting || isSubmitting || status === WithdrawRequestStatus.LOADING;

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const handleDestinationChange = (value: string) => {
    setDestination(value);
  };

  const handleConfirmChange = (checked: boolean) => {
    setConfirm(checked);
  };

  const handleRetry = async () => {
    setIsRedirecting(true);
    const id = await retryLastRequest();
    if (id) {
      resetFormState();
      goToWithdrawDetails(id);
      return;
    }
    setIsRedirecting(false);
  };

  const handleOpenLastWithdrawal = () => {
    if (!withdrawal) {
      return;
    }

    goToWithdrawDetails(withdrawal.id);
  };

  return (
    <main className={styles.page}>
      <div className={`${styles.grid} ${isBusy ? styles.dimmed : ''}`}>
        <section className={styles.card}>
          <Heading as="h1" className={styles.title}>
            Withdraw
          </Heading>
          <Text className={styles.meta} variant="meta">
            State: {status}
          </Text>

          <FormProvider {...methods}>
            <form onSubmit={onSubmit} className={styles.form}>
              <ControlledMoneyInput
                name="amount"
                id="amount"
                label="Amount"
                testId={WithdrawFormTestId.AMOUNT_INPUT}
                disabled={isBusy}
                onValueChange={handleAmountChange}
                errorClassName={styles.errorText}
              />
              <ControlledTextInput
                name="destination"
                id="destination"
                label="Destination"
                disabled={isBusy}
                testId={WithdrawFormTestId.DESTINATION_INPUT}
                onValueChange={handleDestinationChange}
              />
              <ControlledCheckbox
                name="confirm"
                id="confirm"
                label="Confirm withdrawal"
                disabled={isBusy}
                testId={WithdrawFormTestId.CONFIRM_CHECKBOX}
                onValueChange={handleConfirmChange}
              />

              <div className={styles.actions}>
                <Button type="submit" disabled={!isValid || isBusy} block>
                  {isBusy ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </FormProvider>
        </section>

        <aside className={`${styles.card} ${styles.sideCard}`}>
          <Heading as="h2" className={styles.sideTitle}>
            Withdrawal Rules
          </Heading>
          <Text className={styles.sideText} variant="body">
            Amount must be greater than 0.
          </Text>
          <Text className={styles.sideText} variant="body">
            Destination is required.
          </Text>
          <Text className={styles.sideText} variant="body">
            You must confirm before submitting.
          </Text>
        </aside>
      </div>

      {status === WithdrawRequestStatus.ERROR && (
        <section
          className={`${styles.card} ${styles.feedback} ${styles.errorBox}`}
          aria-live="polite"
        >
          <Text className={styles.bannerTitle} variant="bannerTitle">
            Request error
          </Text>
          <Text className={styles.bannerText} variant="error">
            {errorMessage}
          </Text>
          <Button type="button" variant="secondary" onClick={handleRetry} disabled={isBusy}>
            Retry
          </Button>
        </section>
      )}

      {status === WithdrawRequestStatus.SUCCESS && withdrawal && (
        <section
          className={`${styles.card} ${styles.feedback} ${styles.successBox}`}
          aria-live="polite"
        >
          <Text className={styles.bannerTitle} variant="bannerTitle">
            Latest withdrawal is ready.
          </Text>
          <Text className={styles.bannerText} variant="banner">
            Open details page to review current status.
          </Text>
          <Button type="button" variant="secondary" onClick={handleOpenLastWithdrawal}>
            Open last withdrawal
          </Button>
        </section>
      )}

      {isBusy && (
        <div className={styles.overlay} aria-live="assertive" aria-label="Loading">
          <div className={styles.overlayCard}>
            <Spinner size={18} />
            <Text className={styles.overlayText} variant="overlay">
              Processing withdrawal...
            </Text>
          </div>
        </div>
      )}
    </main>
  );
}
