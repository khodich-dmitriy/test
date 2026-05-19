import { expect, test } from '@playwright/test';

import {
  LoginTestId,
  WithdrawDetailsTestId,
  WithdrawFormTestId
} from '@/src/shared/config/test-ids';
import { AppRoute, WithdrawalApiRoute } from '@/src/shared/config/urls';

test('retry после сетевой ошибки не теряет данные формы', async ({ page }) => {
  await page.goto(AppRoute.LOGIN);
  await page.getByTestId(LoginTestId.USERNAME_INPUT).fill('demo');
  await page.getByTestId(LoginTestId.PASSWORD_INPUT).fill('demo123');
  await page.getByTestId(LoginTestId.SUBMIT_BUTTON).click();
  await expect(page).toHaveURL(AppRoute.WITHDRAW);

  let firstFail = true;
  await page.route(`**${WithdrawalApiRoute.LIST}`, async (route) => {
    if (route.request().method() === 'POST' && firstFail) {
      firstFail = false;
      await route.abort('failed');
      return;
    }
    await route.continue();
  });

  await page.getByTestId(WithdrawFormTestId.AMOUNT_INPUT).fill('55');
  await page.getByTestId(WithdrawFormTestId.DESTINATION_INPUT).fill('wallet-retry');
  await page.getByTestId(WithdrawFormTestId.CONFIRM_CHECKBOX).click();
  await page.getByTestId(WithdrawFormTestId.SUBMIT_BUTTON).click();

  await expect(page.getByTestId(WithdrawFormTestId.ERROR_BANNER)).toBeVisible();
  await expect(page.getByTestId(WithdrawFormTestId.AMOUNT_INPUT)).toHaveValue('55.00');
  await expect(page.getByTestId(WithdrawFormTestId.DESTINATION_INPUT)).toHaveValue('wallet-retry');

  await page.getByTestId(WithdrawFormTestId.ERROR_RETRY_BUTTON).click();
  await expect(
    page.locator('[data-testid^="withdraw-feed-item-"]').filter({ hasText: 'wallet-retry' })
  ).toBeVisible();
});

test('если access истек, используется refresh и заявка отправляется без потери данных', async ({
  context,
  page
}) => {
  await page.goto(AppRoute.LOGIN);
  await page.getByTestId(LoginTestId.USERNAME_INPUT).fill('demo');
  await page.getByTestId(LoginTestId.PASSWORD_INPUT).fill('demo123');
  await page.getByTestId(LoginTestId.SUBMIT_BUTTON).click();
  await expect(page).toHaveURL(AppRoute.WITHDRAW);

  const cookies = await context.cookies();
  const refresh = cookies.find((cookie) => cookie.name === 'mock_refresh_token');
  if (!refresh) {
    throw new Error('Refresh cookie is missing after login');
  }

  await context.clearCookies();
  await context.addCookies([
    {
      name: refresh.name,
      value: refresh.value,
      domain: refresh.domain,
      path: refresh.path,
      expires: refresh.expires,
      httpOnly: refresh.httpOnly,
      secure: refresh.secure,
      sameSite: refresh.sameSite
    }
  ]);

  await page.goto(AppRoute.WITHDRAW);
  await page.getByTestId(WithdrawFormTestId.AMOUNT_INPUT).fill('77');
  await page.getByTestId(WithdrawFormTestId.DESTINATION_INPUT).fill('wallet-refresh');
  await page.getByTestId(WithdrawFormTestId.CONFIRM_CHECKBOX).click();
  await page.getByTestId(WithdrawFormTestId.SUBMIT_BUTTON).click();

  const createdRow = page.locator('[data-testid^="withdraw-feed-item-"]').filter({
    hasText: 'wallet-refresh'
  });
  await expect(createdRow).toBeVisible();
  await createdRow.locator('a[href^="/withdraw/w_"]').click();
  await expect(page).toHaveURL(/\/withdraw\/w_/);
  await expect(page.getByTestId(WithdrawDetailsTestId.AMOUNT)).toContainText('77');
});
