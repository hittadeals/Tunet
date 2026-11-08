import { test, expect } from './fixtures.js';

const seedLightsPage = () => {
  localStorage.setItem('ha_url', 'http://localhost:8123');
  localStorage.setItem('ha_auth_method', 'token');
  localStorage.setItem('ha_token', 'test_token');
  localStorage.setItem('tunet_active_page', 'lights');
  localStorage.setItem(
    'tunet_pages_config',
    JSON.stringify({ header: [], pages: ['home', 'lights'], home: [], lights: [] })
  );
  localStorage.setItem(
    'tunet_page_settings',
    JSON.stringify({
      lights: { type: 'lights', label: 'Lights', icon: 'Lightbulb' },
    })
  );
  localStorage.setItem('tunet_card_settings', JSON.stringify({}));
};

test.describe('lights page', () => {
  test.beforeEach(async ({ page, mockHAConnection }) => {
    await page.addInitScript(seedLightsPage);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/#/page/lights');
    await expect(page.getByText('Bedroom Light', { exact: true })).toBeVisible();
  });

  test('opens the full light controls when a lamp is tapped', async ({ page }) => {
    await page
      .locator('[data-lights-tile="light.bedroom"]')
      .click({ position: { x: 220, y: 60 } });
    await expect(page.getByRole('heading', { name: /Bedroom Light/i })).toBeVisible();
    await expect(page.getByText('Brightness', { exact: false }).first()).toBeVisible();
  });

  test('includes virtual switches and scenes', async ({ page }) => {
    await expect(page.locator('[data-lights-tile="input_boolean.movie_mode"]')).toBeVisible();
    await expect(page.locator('[data-lights-tile="scene.movie_night"]')).toBeVisible();
    await expect(page.locator('[data-lights-tile="scene.movie_night"]')).toContainText('Scene');
  });

  test('customize panel lets you pick icon and illustration', async ({ page }) => {
    await page.getByRole('button', { name: /Customize devices/i }).click();
    await expect(page.getByText('Customize devices', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Appearance' }).first().click();
    await expect(page.getByText('Icon', { exact: true })).toBeVisible();
    await expect(page.getByText('Illustration', { exact: true })).toBeVisible();

    await page.locator('button[title="Choose image"]').first().click();
    await expect(page.locator('button[title="Pendant"]')).toBeVisible();
  });
});
