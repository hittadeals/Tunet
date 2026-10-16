import { expect, test } from './fixtures.js';

const PAGES = { header: [], pages: ['home', 'kitchen'], home: [], kitchen: [] };

const geometry = (page) =>
  page.evaluate(() => {
    const bar = document.querySelector('[data-testid="page-navigation-bar"]');
    const pill = bar?.querySelector('button');
    const barRect = bar.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    return {
      viewport: window.innerHeight,
      barBottom: barRect.bottom,
      barTop: barRect.top,
      abovePill: pillRect.top - barRect.top,
      belowPill: barRect.bottom - pillRect.bottom,
    };
  });

test.describe('page navigation bar', () => {
  for (const size of [
    { label: 'mobile', width: 390, height: 844 },
    { label: 'desktop', width: 1180, height: 820 },
  ]) {
    test(`sits flush at the bottom with even padding (${size.label})`, async ({
      authenticatedPage: page,
    }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.evaluate((pagesConfig) => {
        localStorage.setItem('tunet_pages_config', JSON.stringify(pagesConfig));
      }, PAGES);
      await page.goto('/#/page/home', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/#\/page\/home$/);
      // A goto to the current URL is a no-op, so reload to pick up the seeded
      // page list.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('page-navigation-bar')).toBeVisible();

      const info = await geometry(page);

      expect(Math.abs(info.barBottom - info.viewport)).toBeLessThanOrEqual(1);
      // No dead band under the pills, and they are not pushed up inside the bar.
      expect(info.belowPill).toBeLessThanOrEqual(10);
      expect(Math.abs(info.abovePill - info.belowPill)).toBeLessThanOrEqual(2);
    });
  }

  test('opens the page manager inside the viewport, above the bar', async ({
    authenticatedPage: page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.evaluate((pagesConfig) => {
      localStorage.setItem('tunet_pages_config', JSON.stringify(pagesConfig));
    }, PAGES);
    await page.goto('/#/page/home', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/#\/page\/home$/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('page-navigation-bar')).toBeVisible();

    await page.getByTestId('settings-dropdown-trigger').click();
    await page.getByTestId('settings-menu-edit').click();
    await page.getByTestId('page-manager-trigger').click();

    const popover = page.getByTestId('page-manager-popover');
    await expect(popover).toBeVisible();

    const box = await popover.evaluate((el) => el.getBoundingClientRect().toJSON());
    const bar = await page
      .getByTestId('page-navigation-bar')
      .evaluate((el) => el.getBoundingClientRect().toJSON());

    // The popover renders above the trigger and stays on screen.
    expect(box.height).toBeGreaterThan(0);
    expect(box.bottom).toBeLessThanOrEqual(bar.top + 1);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(1024);
  });
});
