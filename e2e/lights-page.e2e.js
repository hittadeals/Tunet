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
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Customize devices', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Appearance' }).first().click();
    await expect(page.getByText('Icon', { exact: true })).toBeVisible();
    await expect(page.getByText('Illustration', { exact: true })).toBeVisible();

    await page.locator('button[title="Choose image"]').first().click();
    await expect(page.locator('button[title="Pendant"]')).toBeVisible();
  });

  test('group lamps use the same amber accent as single lamps', async ({ page }) => {
    const group = page.locator('[data-lights-tile="light.hall_group"]');
    await expect(
      group.getByRole('button', { name: /Hall Group.*Open controls/i }).locator('svg')
    ).toHaveCSS('color', 'rgb(246, 166, 35)');
    await expect(group.getByRole('button', { name: /Hall Group: Off/i })).toHaveCSS(
      'color',
      'rgb(246, 166, 35)'
    );

    const whiteOnlyGroup = page.locator('[data-lights-tile="light.white_group"]');
    await expect(
      whiteOnlyGroup.getByRole('button', { name: /White Group.*Open controls/i }).locator('svg')
    ).toHaveCSS('color', 'rgb(246, 166, 35)');
    await expect(whiteOnlyGroup.getByRole('button', { name: /White Group: Off/i })).toHaveCSS(
      'color',
      'rgb(246, 166, 35)'
    );
  });

  test('group lamps can be toggled like a single lamp', async ({ page }) => {
    const group = page.locator('[data-lights-tile="light.hall_group"]');
    await group.getByRole('button', { name: /Hall Group: Off/i }).click();
    await expect(group.getByRole('button', { name: /Hall Group: On/i })).toBeVisible();
  });

  test('switches between gallery and compact views', async ({ page }) => {
    await page.getByRole('button', { name: 'Compact view' }).click();
    await expect(page.locator('[data-lights-tile="light.bedroom"]')).toBeVisible();
    await page.getByRole('button', { name: 'Gallery view' }).click();
    await expect(page.locator('[data-lights-tile="light.bedroom"]')).toBeVisible();
  });

  test('favorites and multi-select modes', async ({ page }) => {
    await page.getByRole('button', { name: 'Favorite' }).first().click();
    await expect(page.getByText('Favorites', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Select', exact: true }).click();
    await page
      .locator('[data-lights-tile="light.bedroom"]')
      .click({ position: { x: 220, y: 80 } });
    await expect(page.getByText('1 selected', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('1 selected', { exact: true })).toHaveCount(0);
  });
});
