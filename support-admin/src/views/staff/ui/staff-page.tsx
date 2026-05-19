'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { SupportStaffMember } from '../../../entities/support/model/types';
import { AddStaffForm } from '../../../features/staff/add/ui/add-staff-form';
import styles from './staff-page.module.css';

interface Props {
  initialStaff: SupportStaffMember[];
}

interface SupportStaffPayload {
  items: SupportStaffMember[];
}

const STAFF_LOAD_ERROR_MESSAGE = 'Failed to load staff';

async function fetchSupportStaff(): Promise<SupportStaffMember[]> {
  const response = await fetch('/v1/support/staff', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(STAFF_LOAD_ERROR_MESSAGE);
  }

  const payload = (await response.json()) as SupportStaffPayload;
  return payload.items;
}

export function StaffPage({ initialStaff }: Props) {
  const [staff, setStaff] = useState<SupportStaffMember[]>(initialStaff);
  const [error, setError] = useState<string | null>(null);

  async function loadStaff() {
    const nextStaff = await fetchSupportStaff();
    setStaff(nextStaff);
    setError(null);
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href="/users">
        Back to users
      </Link>

      <section className={styles.hero} aria-labelledby="staff-page-title">
        <p className={styles.kicker}>Operations console</p>
        <h1 className={styles.title} id="staff-page-title">
          Support staff
        </h1>
        <p className={styles.subtitle}>
          Create support accounts, reload the roster, and keep the team ready for incoming
          requests.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="add-support-user-title">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="add-support-user-title">
            Add support user
          </h2>
          <p className={styles.sectionSubtitle}>New accounts inherit the support role.</p>
        </div>
        <AddStaffForm
          onCreated={() => {
            void loadStaff().catch((loadError) => {
              setError(loadError instanceof Error ? loadError.message : STAFF_LOAD_ERROR_MESSAGE);
            });
          }}
        />
        {error && (
          <p className={styles.error} role="status">
            {error}
          </p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="current-staff-title">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="current-staff-title">
            Current staff
          </h2>
          <p className={styles.sectionSubtitle}>Reloaded automatically after each successful add.</p>
        </div>
        <ul className={styles.list}>
          {staff.map((member) => (
            <li key={member.id} className={styles.listItem}>
              {member.username} ({member.role})
            </li>
          ))}
        </ul>
      </section>

      <p className={styles.note}>New support users can login with password: support123</p>
    </main>
  );
}
