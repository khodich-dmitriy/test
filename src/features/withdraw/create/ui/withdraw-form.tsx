'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import Link from 'next/link';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as yup from 'yup';
import { useShallow } from 'zustand/react/shallow';

import type { Withdrawal } from '@/src/entities/withdrawal/model/types';
import { WithdrawRequestStatus } from '@/src/features/withdraw/create/model/request-status';
import { useWithdrawStore } from '@/src/features/withdraw/create/model/withdraw-store';
import styles from '@/src/features/withdraw/create/ui/withdraw-form.module.css';
import { WithdrawFormTestId } from '@/src/shared/config/test-ids';
import { getWithdrawDetailsRoute } from '@/src/shared/config/urls';
import Button from '@/src/shared/ui/button/button';
import buttonStyles from '@/src/shared/ui/button/button.module.css';
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

interface WithdrawFormProps {
  onCreated?: (withdrawal: Withdrawal) => void;
}

export default function WithdrawForm({ onCreated }: WithdrawFormProps) {
  const { t } = useTranslation();
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
      resetStore: state.reset
    }))
  );
  const schema: yup.ObjectSchema<WithdrawFormValues> = yup
    .object({
      amount: yup
        .string()
        .required(t('withdraw.validation.amountRequired'))
        .test('positive', t('withdraw.validation.amountPositive'), (value) => Number(value) > 0),
      destination: yup.string().trim().required(t('withdraw.validation.destinationRequired')),
      confirm: yup.boolean().defined().oneOf([true], t('withdraw.validation.confirmRequired'))
    })
    .required();

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

  const resetFormState = () => {
    resetStore();
    reset({
      amount: '',
      destination: '',
      confirm: false
    });
  };

  const notifyCreated = (created: Withdrawal) => {
    if (onCreated) {
      onCreated(created);
    }
  };

  const handleSubmitRequest = async () => {
    const created = await submitWithdrawal();
    if (created) {
      resetFormState();
      notifyCreated(created);
      return;
    }
  };

  const onSubmit = handleSubmit(handleSubmitRequest);

  const isBusy = isSubmitting || status === WithdrawRequestStatus.LOADING;

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
    const created = await retryLastRequest();
    if (created) {
      resetFormState();
      notifyCreated(created);
      return;
    }
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.grid} ${isBusy ? styles.dimmed : ''}`}>
        <section className={styles.card}>
          <Heading as="h1" className={styles.title}>
            {t('withdraw.title')}
          </Heading>
          <Text className={styles.meta} variant="meta">
            {t('withdraw.formState', { status: t(`withdraw.formStatus.${status}`) })}
          </Text>

          <FormProvider {...methods}>
            <form onSubmit={onSubmit} className={styles.form}>
              <ControlledMoneyInput
                name="amount"
                id="amount"
                label={t('withdraw.amount')}
                testId={WithdrawFormTestId.AMOUNT_INPUT}
                disabled={isBusy}
                onValueChange={handleAmountChange}
                errorClassName={styles.errorText}
              />
              <ControlledTextInput
                name="destination"
                id="destination"
                label={t('withdraw.destination')}
                disabled={isBusy}
                testId={WithdrawFormTestId.DESTINATION_INPUT}
                onValueChange={handleDestinationChange}
              />
              <ControlledCheckbox
                name="confirm"
                id="confirm"
                label={t('withdraw.confirm')}
                disabled={isBusy}
                testId={WithdrawFormTestId.CONFIRM_CHECKBOX}
                onValueChange={handleConfirmChange}
              />

              <div className={styles.actions}>
                <Button
                  type="submit"
                  disabled={!isValid || isBusy}
                  block
                  data-testid={WithdrawFormTestId.SUBMIT_BUTTON}
                >
                  {isBusy ? t('withdraw.submitting') : t('withdraw.submit')}
                </Button>
              </div>
            </form>
          </FormProvider>
        </section>

        <aside className={`${styles.card} ${styles.sideCard}`}>
          <Heading as="h2" className={styles.sideTitle}>
            {t('withdraw.rulesTitle')}
          </Heading>
          <Text className={styles.sideText} variant="body">
            {t('withdraw.rules.amount')}
          </Text>
          <Text className={styles.sideText} variant="body">
            {t('withdraw.rules.destination')}
          </Text>
          <Text className={styles.sideText} variant="body">
            {t('withdraw.rules.confirm')}
          </Text>
        </aside>
      </div>

      {status === WithdrawRequestStatus.ERROR && (
        <section
          className={`${styles.card} ${styles.feedback} ${styles.errorBox}`}
          aria-live="polite"
          data-testid={WithdrawFormTestId.ERROR_BANNER}
        >
          <Text className={styles.bannerTitle} variant="bannerTitle">
            {t('withdraw.error.title')}
          </Text>
          <Text className={styles.bannerText} variant="error">
            {errorMessage}
          </Text>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRetry}
            disabled={isBusy}
            data-testid={WithdrawFormTestId.ERROR_RETRY_BUTTON}
          >
            {t('withdraw.error.retry')}
          </Button>
        </section>
      )}

      {status === WithdrawRequestStatus.SUCCESS && withdrawal && (
        <section
          className={`${styles.card} ${styles.feedback} ${styles.successBox}`}
          aria-live="polite"
          data-testid={WithdrawFormTestId.SUCCESS_BANNER}
        >
          <Text className={styles.bannerTitle} variant="bannerTitle">
            {t('withdraw.success.title')}
          </Text>
          <Text className={styles.bannerText} variant="banner">
            {t('withdraw.success.text')}
          </Text>
          <Link
            className={`${buttonStyles.button} ${buttonStyles.secondary}`}
            href={getWithdrawDetailsRoute(withdrawal.id)}
            data-testid={WithdrawFormTestId.SUCCESS_LINK}
          >
            {t('withdraw.success.action')}
          </Link>
        </section>
      )}

      {isBusy && (
        <div className={styles.overlay} aria-live="assertive" aria-label={t('withdraw.overlay.label')}>
          <div className={styles.overlayCard}>
            <Spinner size={18} />
            <Text className={styles.overlayText} variant="overlay">
              {t('withdraw.overlay.text')}
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}
