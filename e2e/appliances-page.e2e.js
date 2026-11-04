import { test, expect } from './fixtures';

test.describe('Consumption page', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page, mockHAConnection }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'test_token');
      localStorage.setItem(
        'tunet_pages_config',
        JSON.stringify({
          header: [],
          pages: ['home', 'appliances'],
          home: [],
          appliances: [],
        })
      );
      localStorage.setItem(
        'tunet_page_settings',
        JSON.stringify({
          appliances: { type: 'appliances', label: 'Consumption', icon: 'Zap' },
        })
      );
      localStorage.setItem('tunet_card_settings', JSON.stringify({}));
      localStorage.setItem(
        'tunet_auth_cache_v1',
        JSON.stringify({
          access_token: 'test_token',
          refresh_token: 'test_refresh_token',
          expires_in: 1800,
          token_type: 'Bearer',
        })
      );
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Consumption' }).click();
  });

  test('shows power and energy in the same appliance card with animated art', async ({
    page,
  }) => {
    await expect(page.getByText('Dishwasher', { exact: true })).toBeVisible();
    await expect(page.getByText('1.8 kW').first()).toBeVisible();
    await expect(page.getByText('1.42 kWh', { exact: true })).toBeVisible();

    const illustration = page.locator('[data-device-art="dishwasher"]');
    await expect(illustration).toHaveCount(1);
    await expect(illustration).toHaveClass(/active/);
    const animationName = await illustration.evaluate((element) => {
      const drum = element.querySelector('.drum');
      return drum ? getComputedStyle(drum).animationName : null;
    });
    expect(animationName).not.toBe('none');

    await expect(page.getByRole('progressbar')).toHaveCount(4);
    await page.getByRole('button', { name: /Choose devices|Välj enheter/ }).click();
    const switches = page.getByRole('switch');
    await expect(switches).toHaveCount(2);
    await switches.nth(1).click();
    await expect(page.getByRole('progressbar')).toHaveCount(2);
  });
});
