import { expect, test } from './fixtures.js';

const PAGES = { header: [], pages: ['home', 'kitchen'], home: ['light.bedroom'], kitchen: [] };

const activePage = (page) => page.evaluate(() => localStorage.getItem('tunet_active_page'));

async function openHome(page) {
  await page.goto('/#/page/home', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/page\/home$/);
  // A goto to the URL we are already on is a no-op, so the app would never read
  // the seeded localStorage. Reload for real.
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Wait for the chrome (and with it the swipe handlers) to be up.
  await expect(page.getByTestId('settings-dropdown-trigger')).toBeVisible();
  await expect(page.getByTestId('page-navigation-bar')).toBeVisible();
  await expect.poll(() => activePage(page)).toBe('home');
  await page.waitForTimeout(300);
}

/** Real touch input, so browser gesture handling (and cancellations) apply. */
async function swipe(page, [fromX, fromY], [toX, toY], { steps = 8, stepDelay = 12 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const point = ([x, y]) => ({ x, y, radiusX: 12, radiusY: 12, force: 1 });

  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [point([fromX, fromY])],
  });
  for (let i = 1; i <= steps; i += 1) {
    const x = fromX + ((toX - fromX) * i) / steps;
    const y = fromY + ((toY - fromY) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point([x, y])] });
    if (stepDelay) await page.waitForTimeout(stepDelay);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test.describe('page swipe', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'uses CDP touch input');
  test.use({ hasTouch: true });

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate((pagesConfig) => {
      localStorage.setItem('tunet_pages_config', JSON.stringify(pagesConfig));
    }, PAGES);
    await openHome(page);
  });

  test('swipes to the next and previous page', async ({ authenticatedPage: page }) => {
    // The whole screen has to work, not just the top of the content box.
    await swipe(page, [330, 760], [90, 760]);
    await expect.poll(() => activePage(page), { timeout: 10000 }).toBe('kitchen');

    await swipe(page, [90, 300], [330, 300]);
    await expect.poll(() => activePage(page), { timeout: 10000 }).toBe('home');
  });

  test('accepts a deliberate, slightly diagonal swipe', async ({ authenticatedPage: page }) => {
    await swipe(page, [330, 620], [150, 720], { steps: 8, stepDelay: 60 });

    await expect.poll(() => activePage(page), { timeout: 10000 }).toBe('kitchen');
  });

  test('leaves scrolling and the page bar alone', async ({ authenticatedPage: page }) => {
    await swipe(page, [200, 300], [180, 700]);
    await page.waitForTimeout(500);
    expect(await activePage(page)).toBe('home');

    const bar = await page.getByTestId('page-navigation-bar').boundingBox();
    await swipe(page, [330, bar.y + bar.height / 2], [90, bar.y + bar.height / 2]);
    await page.waitForTimeout(500);
    expect(await activePage(page)).toBe('home');
  });

  test('does not swipe while editing, where touch drags cards', async ({
    authenticatedPage: page,
  }) => {
    await page.getByTestId('settings-dropdown-trigger').click();
    await page.getByTestId('settings-menu-edit').click();
    await expect(page.getByTestId('settings-menu-done')).toBeAttached();

    await swipe(page, [330, 700], [90, 700]);
    await page.waitForTimeout(600);

    expect(await activePage(page)).toBe('home');
  });
});
