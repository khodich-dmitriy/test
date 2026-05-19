import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StaffPage } from '@/support-admin/src/views/staff/ui/staff-page';

function createStaffItem(id: string, username: string) {
  return {
    id,
    username,
    role: 'support' as const,
    created_at: '2026-04-19T00:00:00.000Z'
  };
}

describe('support-admin staff page', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears load error after a successful staff reload', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createStaffItem('staff_2', 'support_agent_2')), { status: 201 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Load failed' }), { status: 500 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(createStaffItem('staff_3', 'support_agent_3')), { status: 201 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [
              createStaffItem('staff_3', 'support_agent_3'),
              createStaffItem('staff_1', 'support')
            ]
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal('fetch', fetchMock);

    render(<StaffPage initialStaff={[createStaffItem('staff_1', 'support')]} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Support staff' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Add support user' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Current staff' })).toBeInTheDocument();
    const user = userEvent.setup();
    const usernameInput = screen.getByPlaceholderText('support username');

    await user.type(usernameInput, 'support_agent_2');
    await user.click(screen.getByRole('button', { name: 'Add support' }));

    expect(await screen.findByText('Failed to load staff')).toBeInTheDocument();

    await user.clear(usernameInput);
    await user.type(usernameInput, 'support_agent_3');
    await user.click(screen.getByRole('button', { name: 'Add support' }));

    await waitFor(() => {
      expect(screen.queryByText('Failed to load staff')).not.toBeInTheDocument();
    });

    expect(screen.getByText('support_agent_3 (support)')).toBeInTheDocument();
  });
});
