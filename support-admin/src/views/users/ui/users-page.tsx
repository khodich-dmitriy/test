import Link from 'next/link';

import type { SupportUser } from '../../../entities/support/model/types';
import styles from './users-page.module.css';

interface Props {
  users: SupportUser[];
}

export function UsersPage({ users }: Props) {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Support directory</p>
        <div className={styles.heroRow}>
          <h1 className={styles.title}>System users</h1>
          <Link className={styles.action} href="/staff">
            Staff management
          </Link>
        </div>
        <p className={styles.subtitle}>Browse customers and open their linked support tickets.</p>
      </section>
      <section className={styles.card} aria-label="System users">
        <ul className={styles.list}>
          {users.map((user) => (
            <li key={user.id} className={styles.listItem}>
              <Link className={styles.userLink} href={`/users/${user.id}`}>
                {user.username} ({user.email})
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
