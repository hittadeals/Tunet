import { test, expect, enterEditMode } from './fixtures';

test.describe('Duplicate card', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'test_token');
      localStorage.setItem(
        'tunet_pages_config',
        JSON.stringify({
          header: [],
          pages: ['home'],
          home: ['light.bedroom'],
        })
      );
      localStorage.setItem('tunet_card_settings', JSON.stringify({}));
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  });

  test('duplicates a card with its settings and keeps the same entity', async ({ page }) => {
    await enterEditMode(page);

    const card = page.locator('[data-dashboard-card]').first();
    await expect(card).toBeVisible();

    const duplicateButton = card.getByRole('button', { name: 'Duplicate card' });
    await expect(duplicateButton).toBeVisible();
    // The cards wiggle in edit mode, so the button never becomes "stable".
    await duplicateButton.click({ force: true });

    await expect(page.locator('[data-dashboard-card]')).toHaveCount(2);

    const stored = await page.evaluate(() => ({
      pages: JSON.parse(localStorage.getItem('tunet_pages_config') || '{}'),
      settings: JSON.parse(localStorage.getItem('tunet_card_settings') || '{}'),
    }));

    const cards = stored.pages.home;
    expect(cards).toHaveLength(2);
    expect(cards[0]).toBe('light.bedroom');
    expect(cards[1]).not.toBe('light.bedroom');

    const copiedSettings = stored.settings[`home::${cards[1]}`];
    expect(copiedSettings).toBeDefined();
    expect(copiedSettings.entityId).toBe('light.bedroom');
  });
});
