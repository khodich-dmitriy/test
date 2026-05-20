import Link from 'next/link';

import type { SupportTicket, SupportUser } from '../../../entities/support/model/types';
import styles from './user-details-page.module.css';

interface Props {
  user: SupportUser;
  tickets: SupportTicket[];
}

export function UserDetailsPage({ user, tickets }: Props) {
  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href="/users">
        Back to users
      </Link>
      <section className={styles.hero}>
        <p className={styles.kicker}>Customer profile</p>
        <h1 className={styles.title}>User {user.username}</h1>
        <p className={styles.subtitle}>{user.email}</p>
      </section>
      <section className={styles.card} aria-label="Tickets">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tickets</h2>
          <p className={styles.sectionSubtitle}>Open the linked conversation for each request.</p>
        </div>
        <ul className={styles.list}>
          {tickets.map((ticket) => (
            <li key={ticket.id} className={styles.listItem}>
              <Link className={styles.ticketLink} href={`/tickets/${ticket.id}`}>
                <span>{ticket.subject} ({ticket.status})</span>
                {(ticket.unread_support_count ?? 0) > 0 ? (
                  <span className={styles.unreadBadge}>{ticket.unread_support_count}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
