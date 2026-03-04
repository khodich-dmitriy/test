'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

import styles from '@/src/features/auth/login/ui/login-form.module.css';
import { LoginTestId } from '@/src/shared/config/test-ids';
import { AppRoute, AuthApiRoute } from '@/src/shared/config/urls';
import buttonStyles from '@/src/shared/ui/button/button.module.css';

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

export default function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      password: ''
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    try {
      const response = await fetch(AuthApiRoute.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ message: 'Login failed' }))) as {
          message?: string;
        };
        setServerError(payload.message || 'Login failed');
        return;
      }

      router.push(AppRoute.WITHDRAW);
    } catch {
      setServerError('Network error. Please retry.');
    }
  });

  return (
    <section className={styles.card}>
      <h1 className={styles.title}>Login</h1>
      <p className={styles.hint}>Use demo credentials: demo / demo123</p>

      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="username" className={styles.label}>
            Username
          </label>
          <input
            id="username"
            type="text"
            data-testid={LoginTestId.USERNAME_INPUT}
            autoComplete="username"
            className={styles.input}
            {...register('username')}
          />
          {errors.username && <p className={styles.errorText}>{errors.username.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input
            id="password"
            type="password"
            data-testid={LoginTestId.PASSWORD_INPUT}
            autoComplete="current-password"
            className={styles.input}
            {...register('password')}
          />
          {errors.password && <p className={styles.errorText}>{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className={`${buttonStyles.button} ${buttonStyles.primary} ${buttonStyles.block}`}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {serverError && <p className={styles.serverError}>{serverError}</p>}
    </section>
  );
}
