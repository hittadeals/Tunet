import { test, expect, enterEditMode } from './fixtures';

test.describe('Page management', () => {
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
          pages: ['home', 'page2'],
          home: ['light.bedroom'],
          page2: ['light.kitchen'],
        })
      );
      localStorage.setItem('tunet_card_settings', JSON.stringify({}));
      localStorage.setItem(
        'tunet_page_settings',
        JSON.stringify({ page2: { label: 'Page 2', icon: 'Sparkles' } })
      );
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
    await page.waitForTimeout(400);
  });

  test('shows page actions and deletes a page on mobile', async ({ page }) => {
    await enterEditMode(page);
    await page.getByTestId('page-manager-trigger').click();

    const deleteButton = page.getByRole('button', { name: /Delete page|Ta bort sida/ }).first();
    await expect(deleteButton).toBeVisible();
    const box = await deleteButton.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(36);
    expect(box?.height).toBeGreaterThanOrEqual(36);

    page.once('dialog', (dialog) => dialog.accept());
    await deleteButton.click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const config = JSON.parse(localStorage.getItem('tunet_pages_config') || '{}');
          return config.pages;
        })
      )
      .toEqual(['home']);
  });

  test('shows the page manager in edit mode on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await enterEditMode(page);
    await expect(page.getByTestId('page-manager-trigger')).toBeVisible();
    await expect(page.getByTestId('page-manager-trigger')).toContainText(/Pages|Sidor/);
  });
});
