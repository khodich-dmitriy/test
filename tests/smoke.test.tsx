import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '@/app/(private)/page';
import { HomePageTestId } from '@/src/shared/config/test-ids';

describe('главная страница', () => {
  it('рендерит базовый каркас приложения', () => {
    render(<HomePage />);
    expect(screen.getByTestId(HomePageTestId.TITLE)).toBeInTheDocument();
  });
});
