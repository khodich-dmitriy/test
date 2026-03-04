import LoginForm from '@/src/features/auth/login/ui/login-form';
import styles from '@/src/features/auth/login/ui/login-form.module.css';

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <LoginForm />
    </main>
  );
}
