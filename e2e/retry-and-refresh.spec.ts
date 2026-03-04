import { expect, test } from '@playwright/test';

import { LoginTestId, WithdrawFormTestId } from '@/src/shared/config/test-ids';
import { AppRoute, WithdrawalApiRoute } from '@/src/shared/config/urls';

test('retry после сетевой ошибки не теряет данные формы', async ({ page }) => {
  await page.goto(AppRoute.LOGIN);
  await page.getByTestId(LoginTestId.USERNAME_INPUT).fill('demo');
  await page.getByTestId(LoginTestId.PASSWORD_INPUT).fill('demo123');
  await page.getByRole('button', { name: 'Sign in' }).click();
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
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText(/Network error/i)).toBeVisible();
  await expect(page.getByTestId(WithdrawFormTestId.AMOUNT_INPUT)).toHaveValue('55.00');
  await expect(page.getByTestId(WithdrawFormTestId.DESTINATION_INPUT)).toHaveValue('wallet-retry');

  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page).toHaveURL(/\/withdraw\/w_/);
});

test('если access истек, используется refresh и заявка отправляется без потери данных', async ({
  context,
  page
}) => {
  await page.goto(AppRoute.LOGIN);
  await page.getByTestId(LoginTestId.USERNAME_INPUT).fill('demo');
  await page.getByTestId(LoginTestId.PASSWORD_INPUT).fill('demo123');
  await page.getByRole('button', { name: 'Sign in' }).click();
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
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page).toHaveURL(/\/withdraw\/w_/);
  await expect(page.getByText(/Amount: 77.00 USDT/i)).toBeVisible();
});
