'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as yup from 'yup';

import { login, type LoginError } from '@/src/entities/session/api/auth-api';
import styles from '@/src/features/auth/login/ui/login-form.module.css';
import { LoginTestId } from '@/src/shared/config/test-ids';
import { AppRoute } from '@/src/shared/config/urls';
import Button from '@/src/shared/ui/button/button';
import ControlledTextInput from '@/src/shared/ui/form/controlled-text-input';
import Heading from '@/src/shared/ui/typography/heading';
import Text from '@/src/shared/ui/typography/text';

type LoginFormValues = {
  username: string;
  password: string;
};

function isLoginError(error: unknown): error is LoginError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as Partial<LoginError>).status === 'number'
  );
}

function resolvePostLoginUrl(redirectTo: string | null): string {
  if (!redirectTo) {
    return AppRoute.WITHDRAW;
  }

  if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
    return AppRoute.WITHDRAW;
  }

  return redirectTo;
}

export default function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = yup
    .object({
      username: yup.string().trim().required(t('login.errors.usernameRequired')),
      password: yup.string().required(t('login.errors.passwordRequired'))
    })
    .required();

  const methods = useForm<LoginFormValues>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      password: ''
    }
  });

  const submitLogin = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      await login(values);
      router.push(resolvePostLoginUrl(searchParams.get('redirectTo')));
      router.refresh();
    } catch (error) {
      if (isLoginError(error)) {
        setServerError(error.message || t('login.errors.failed'));
        return;
      }

      setServerError(t('login.errors.network'));
    }
  };

  const onSubmit = methods.handleSubmit(submitLogin);
  const {
    formState: { isValid, isSubmitting }
  } = methods;

  return (
    <section className={styles.card}>
      <Heading as="h1" className={styles.title}>
        {t('login.title')}
      </Heading>
      <Text className={styles.hint} variant="meta">
        {t('login.hint')}
      </Text>

      <FormProvider {...methods}>
        <form onSubmit={onSubmit} className={styles.form}>
          <ControlledTextInput
            name="username"
            id="username"
            label={t('login.username')}
            testId={LoginTestId.USERNAME_INPUT}
            autoComplete="username"
          />
          <ControlledTextInput
            name="password"
            id="password"
            label={t('login.password')}
            type="password"
            testId={LoginTestId.PASSWORD_INPUT}
            autoComplete="current-password"
          />

          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
            block
            data-testid={LoginTestId.SUBMIT_BUTTON}
          >
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      </FormProvider>

      {serverError && (
        <Text className={styles.serverError} variant="error">
          {serverError}
        </Text>
      )}
    </section>
  );
}
