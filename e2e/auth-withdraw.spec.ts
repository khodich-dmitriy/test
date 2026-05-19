import { expect, test } from '@playwright/test';

import {
  LoginTestId,
  WithdrawDetailsTestId,
  WithdrawFormTestId
} from '@/src/shared/config/test-ids';
import { AppRoute } from '@/src/shared/config/urls';

test('сценарий: логин -> создание заявки -> просмотр заявки', async ({ page }) => {
  await page.goto(AppRoute.LOGIN);

  await page.getByTestId(LoginTestId.USERNAME_INPUT).fill('demo');
  await page.getByTestId(LoginTestId.PASSWORD_INPUT).fill('demo123');
  await page.getByTestId(LoginTestId.SUBMIT_BUTTON).click();

  await expect(page).toHaveURL(AppRoute.WITHDRAW);

  await page.getByTestId(WithdrawFormTestId.AMOUNT_INPUT).fill('125');
  await page.getByTestId(WithdrawFormTestId.DESTINATION_INPUT).fill('wallet-e2e');
  await page.getByTestId(WithdrawFormTestId.CONFIRM_CHECKBOX).click();
  await page.getByTestId(WithdrawFormTestId.SUBMIT_BUTTON).click();

  await expect(page).toHaveURL(AppRoute.WITHDRAW);
  const createdRow = page.locator('[data-testid^="withdraw-feed-item-"]').filter({
    hasText: 'wallet-e2e'
  });
  await expect(createdRow).toBeVisible();

  // Явно проверяем сценарий просмотра ранее созданной заявки.
  await createdRow.locator('a[href^="/withdraw/w_"]').click();
  await expect(page).toHaveURL(/\/withdraw\/w_/);
  await expect(page.getByTestId(WithdrawDetailsTestId.AMOUNT)).toContainText('125');
  await expect(page.getByText(/wallet-e2e/i)).toBeVisible();
  await expect(page.getByTestId(WithdrawDetailsTestId.STATUS)).toBeVisible();
});
