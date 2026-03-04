import { expect, test } from '@playwright/test';

import { LoginTestId, WithdrawFormTestId } from '@/src/shared/config/test-ids';
import { AppRoute, getWithdrawDetailsRoute } from '@/src/shared/config/urls';

test('сценарий: логин -> создание заявки -> просмотр заявки', async ({ page }) => {
  await page.goto(AppRoute.LOGIN);

  await page.getByTestId(LoginTestId.USERNAME_INPUT).fill('demo');
  await page.getByTestId(LoginTestId.PASSWORD_INPUT).fill('demo123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(AppRoute.WITHDRAW);

  await page.getByTestId(WithdrawFormTestId.AMOUNT_INPUT).fill('125');
  await page.getByTestId(WithdrawFormTestId.DESTINATION_INPUT).fill('wallet-e2e');
  await page.getByTestId(WithdrawFormTestId.CONFIRM_CHECKBOX).click();
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page).toHaveURL(/\/withdraw\/w_/);
  const detailsUrl = page.url();
  const withdrawId = detailsUrl.split('/').pop();
  expect(withdrawId).toBeTruthy();

  // Явно проверяем сценарий просмотра ранее созданной заявки.
  await page.goto(getWithdrawDetailsRoute(String(withdrawId)));
  await expect(page.getByText('Withdrawal details')).toBeVisible();
  await expect(page.getByText(/Amount: 125.00 USDT/i)).toBeVisible();
  await expect(page.getByText(/Destination: wallet-e2e/i)).toBeVisible();
  await expect(page.getByText('Pending')).toBeVisible();
});
