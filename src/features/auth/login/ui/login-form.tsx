'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { login, type LoginError } from '@/src/entities/session/api/auth-api';
import styles from '@/src/features/auth/login/ui/login-form.module.css';
import { LoginTestId } from '@/src/shared/config/test-ids';
import { AppRoute } from '@/src/shared/config/urls';
import Button from '@/src/shared/ui/button/button';
import ControlledTextInput from '@/src/shared/ui/form/controlled-text-input';
import Heading from '@/src/shared/ui/typography/heading';
import Text from '@/src/shared/ui/typography/text';

const schema = yup
  .object({
    username: yup.string().trim().required('Username is required'),
    password: yup.string().required('Password is required')
  })
  .required();

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

export default function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

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
      router.push(AppRoute.WITHDRAW);
    } catch (error) {
      if (isLoginError(error)) {
        setServerError(error.message || 'Login failed');
        return;
      }

      setServerError('Network error. Please retry.');
    }
  };

  const onSubmit = methods.handleSubmit(submitLogin);
  const {
    formState: { isValid, isSubmitting }
  } = methods;

  return (
    <section className={styles.card}>
      <Heading as="h1" className={styles.title}>
        Login
      </Heading>
      <Text className={styles.hint} variant="meta">
        Use demo credentials: demo / demo123
      </Text>

      <FormProvider {...methods}>
        <form onSubmit={onSubmit} className={styles.form}>
          <ControlledTextInput
            name="username"
            id="username"
            label="Username"
            testId={LoginTestId.USERNAME_INPUT}
            autoComplete="username"
          />
          <ControlledTextInput
            name="password"
            id="password"
            label="Password"
            type="password"
            testId={LoginTestId.PASSWORD_INPUT}
            autoComplete="current-password"
          />

          <Button type="submit" disabled={!isValid || isSubmitting} block>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
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
