import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '@/app/(private)/page';

describe('главная страница', () => {
  it('рендерит базовый каркас приложения', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'Withdraw Dashboard' })).toBeInTheDocument();
  });
});
