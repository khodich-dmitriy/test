'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { SupportTicket, SupportUser } from '../../../entities/support/model/types';
import styles from './users-page.module.css';

interface Props {
  activeTickets: SupportTicket[];
  users: SupportUser[];
}

export function UsersPage({ activeTickets, users }: Props) {
  const [ticketSearch, setTicketSearch] = useState('');
  const visibleTickets = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase();
    if (!query) {
      return activeTickets;
    }

    return activeTickets.filter((ticket) =>
      [ticket.id, ticket.subject, ticket.withdrawal_id ?? '', ticket.assigned_staff_username ?? '']
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [activeTickets, ticketSearch]);

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
      <section className={styles.card} aria-label="Active tickets">
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Active tickets</h2>
            <p className={styles.sectionSubtitle}>Assigned conversations active in the last 20 minutes.</p>
          </div>
          <label className={styles.searchLabel}>
            <span>Search ticket</span>
            <input
              className={styles.searchInput}
              value={ticketSearch}
              onChange={(event) => setTicketSearch(event.target.value)}
              placeholder="Ticket, withdrawal, subject"
              type="search"
            />
          </label>
        </div>
        {visibleTickets.length > 0 ? (
          <ul className={styles.list}>
            {visibleTickets.map((ticket) => (
              <li key={ticket.id} className={styles.listItem}>
                <Link className={styles.ticketLink} href={`/tickets/${ticket.id}`}>
                  <span>{ticket.subject}</span>
                  <span className={styles.ticketMeta}>{ticket.id}</span>
                  {(ticket.unread_support_count ?? 0) > 0 ? (
                    <span className={styles.unreadBadge}>{ticket.unread_support_count}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No active tickets.</p>
        )}
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
