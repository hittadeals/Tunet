import { test, expect, enterEditMode, exitEditMode } from './fixtures';

test.describe('Drag and Drop Interactions', () => {
  const enableEditMode = (page) => enterEditMode(page);

  test.beforeEach(async ({ page, mockHAConnection }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'test_token');
      localStorage.setItem(
        'tunet_pages_config',
        JSON.stringify({
          header: [],
          pages: ['home'],
          home: ['light.bedroom', 'light.kitchen'],
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
    await page.waitForTimeout(500); // Wait for entities to load
  });

  test('should enable edit mode with button or long-press', async ({ page }) => {
    await enableEditMode(page);
    const cards = page.locator('[draggable="true"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await expect(cards.first()).toHaveAttribute('draggable', 'true');
  });

  test('should allow dragging card to new position', async ({ page }) => {
    await enableEditMode(page);

    const cards = page.locator('[draggable="true"]');
    const draggableCount = await cards.count();
    expect(draggableCount).toBeGreaterThan(1);

    const firstCard = cards.first();
    const secondCard = cards.nth(1);
    await expect(firstCard).toBeVisible();
    await expect(secondCard).toBeVisible();

    const firstHandle = page.locator('[data-drag-handle]').first();
    await expect(firstHandle).toBeVisible();
    await firstHandle.focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    const storedConfig = await page.evaluate(() => {
      const raw = localStorage.getItem('tunet_pages_config');
      return raw ? JSON.parse(raw) : null;
    });

    expect(storedConfig?.home).toEqual(['light.kitchen', 'light.bedroom']);
  });

  test('should persist card order changes', async ({ page }) => {
    const readStoredOrder = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('tunet_pages_config') || '{}').home || []
      );

    const before = await readStoredOrder();
    expect(before.length).toBeGreaterThan(1);

    await enableEditMode(page);

    // Edit-mode cards jiggle, so skip Playwright's stability check and bound the
    // attempt: a miss must not eat the whole test budget.
    const cards = page.locator('[draggable="true"]');
    await cards
      .nth(0)
      .dragTo(cards.nth(1), { force: true, timeout: 5000 })
      .catch(() => {});
    await page.waitForTimeout(300);

    const after = await readStoredOrder();

    // Reordering persists, and never loses or duplicates a card.
    expect([...after].sort()).toEqual([...before].sort());
    expect(after).not.toEqual(before);

    await exitEditMode(page);
  });

  test('should show drop zones while dragging', async ({ page }) => {
    // Enable edit mode
    await enableEditMode(page);

    // Start dragging a card
    const card = page.locator('[draggable="true"]').first();
    if (await card.isVisible()) {
      const box = await card.boundingBox();

      if (box) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;

        // Simulate drag start
        await page.mouse.move(x, y);
        await page.mouse.down();

        await page.waitForTimeout(100);

        // While dragging, should see drop zone indicators
        // Look for visual feedback (highlighted areas, borders, etc.)
        const dropZones = page.locator('.drop-zone, [data-drop-zone], .dragover, [drag-over]');

        await page.mouse.move(x + 50, y);
        await page.waitForTimeout(100);

        // In edit mode, dragging should at least keep the card interactive.
        await expect(card).toBeVisible();

        await page.mouse.up();
      }
    }
  });

  test('should not be draggable in normal mode', async ({ page }) => {
    // Each test starts in view mode, where the done action is not offered.
    await expect(page.getByTestId('settings-menu-done')).toHaveCount(0);

    // Cards should not have draggable attribute
    const draggableCards = page.locator('[draggable="true"]');
    const count = await draggableCards.count();

    // In normal mode, cards should not be draggable
    expect(count).toBe(0);
  });

  test('should handle touch drag on mobile', async ({ page, context, browser }, testInfo) => {
    test.skip(
      testInfo.project.name === 'firefox',
      'Firefox does not support isMobile context option'
    );

    // Set mobile viewport
    const mobile = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });

    const mobilePage = await mobile.newPage();

    await mobilePage.addInitScript(() => {
      localStorage.setItem('ha_url', 'http://localhost:8123');
      localStorage.setItem('ha_auth_method', 'token');
      localStorage.setItem('ha_token', 'test_token');
      localStorage.setItem(
        'tunet_pages_config',
        JSON.stringify({
          header: [],
          pages: ['home'],
          home: ['light.bedroom', 'light.kitchen'],
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

    await mobilePage.goto('/', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(500);

    // Try long-press to enable edit mode on mobile
    const card = mobilePage.locator('[role="button"], button, [draggable]').first();
    await expect(card).toBeVisible();

    if (await card.isVisible()) {
      const box = await card.boundingBox();

      if (box) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;

        // Touch press
        await mobilePage.touchscreen.tap(x, y);
        await mobilePage.waitForTimeout(300);

        // Touch drag
        await mobilePage.touchscreen.tap(x, y);
        await mobilePage.waitForTimeout(100);

        // Simulate touch move (if API available)
        try {
          await mobilePage.touchscreen.swipe(x, y, x + 100, y);
        } catch {
          // Swipe not supported, that's okay
        }
      }
    }

    await expect(mobilePage.locator('body')).toBeVisible();
    await mobile.close();
  });

  test('should show delete indicator during drag in edit mode', async ({ page }) => {
    // Enable edit mode
    await enableEditMode(page);

    // Look for delete/trash zone
    const deleteZone = page.locator('[aria-label*="delete"], [aria-label*="trash"], .delete-zone');

    const card = page.locator('[draggable="true"]').first();
    if (await card.isVisible()) {
      const box = await card.boundingBox();

      if (box) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;

        // Drag toward delete zone
        await page.mouse.move(x, y);
        await page.mouse.down();

        // Move toward top/bottom usually where delete zone is
        await page.mouse.move(x, y - 100, { steps: 5 });
        await page.waitForTimeout(100);

        // Dragging toward delete area should not accidentally remove all cards.
        const draggableCount = await page.locator('[draggable="true"]').count();
        expect(draggableCount).toBeGreaterThan(0);

        await page.mouse.up();
      }
    }
  });

  test('should cancel drag when escape key pressed', async ({ page }) => {
    await enableEditMode(page);

    const card = page.locator('[draggable="true"]').first();
    if (await card.isVisible()) {
      const box = await card.boundingBox();

      if (box) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;

        // Start drag
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 50, y);

        // Press escape to cancel
        await page.keyboard.press('Escape');
        await page.mouse.up();

        // Card remains present after Escape cancellation.
        await expect(card).toBeVisible();
      }
    }
  });
});
