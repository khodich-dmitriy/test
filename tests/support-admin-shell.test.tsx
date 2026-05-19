import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AdminShell } from '@/support-admin/src/widgets/admin-shell/ui/admin-shell';

const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock
  }),
  usePathname: () => '/users'
}));

describe('support-admin shell', () => {
  it('renders authenticated navigation, session context, and content', () => {
    render(
      <AdminShell session={{ username: 'agent@example.test', role: 'support' }}>
        <section>
          <h1>Users</h1>
          <p>dashboard content</p>
        </section>
      </AdminShell>
    );

    expect(screen.getByText('Support Admin')).toBeInTheDocument();
    expect(screen.getByText('agent@example.test')).toBeInTheDocument();
    expect(screen.getByText('support')).toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { name: 'Admin navigation' });
    expect(within(navigation).getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users');
    expect(within(navigation).getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).queryByRole('link', { name: 'Staff' })).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByText('dashboard content')).toBeInTheDocument();
  });

  it('shows staff navigation only to admins', () => {
    render(
      <AdminShell session={{ username: 'admin@example.test', role: 'admin' }}>
        <section>
          <h1>Users</h1>
        </section>
      </AdminShell>
    );

    const navigation = screen.getByRole('navigation', { name: 'Admin navigation' });
    expect(within(navigation).getByRole('link', { name: 'Staff' })).toHaveAttribute('href', '/staff');
  });

  it('logs out and returns to the login page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );

    render(
      <AdminShell session={{ username: 'agent@example.test', role: 'admin' }}>
        <div>admin content</div>
      </AdminShell>
    );

    await userEvent.setup().click(screen.getByRole('button', { name: 'Logout' }));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
    expect(replaceMock).toHaveBeenCalledWith('/login');
    expect(refreshMock).toHaveBeenCalled();
  });
});
