import { expect, test, enterEditMode } from './fixtures.js';

const PILLS = [
  {
    id: 'pill-light',
    type: 'conditional',
    entityId: 'light.kitchen',
    tapAction: 'auto',
    conditionEnabled: false,
    visible: true,
    showLabel: true,
    showSublabel: true,
  },
];

const seed = async (page) => {
  await page.setViewportSize({ width: 1180, height: 500 });
  await page.evaluate((pills) => {
    localStorage.setItem('tunet_status_pills_config', JSON.stringify(pills));
    localStorage.setItem('tunet_language', 'en');
    localStorage.setItem('tunet_theme', 'dark');
  }, PILLS);
  await page.goto('/#/page/home', { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Kitchen Light', { exact: true })).toBeVisible();
};

const serviceCalls = (page) =>
  page.evaluate(() => (window.__e2eServiceCalls || []).slice());

const longPress = async (page, locator) => {
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(750);
  await page.mouse.up();
};

test('a long press toggles the pill entity', async ({ authenticatedPage: page }) => {
  await seed(page);

  await longPress(page, page.getByText('Kitchen Light', { exact: true }));

  await expect
    .poll(async () => (await serviceCalls(page)).length, { timeout: 5000 })
    .toBeGreaterThan(0);

  const calls = await serviceCalls(page);
  expect(calls).toContainEqual({
    domain: 'homeassistant',
    service: 'toggle',
    service_data: { entity_id: 'light.kitchen' },
  });
});

test('a short press opens details without toggling', async ({ authenticatedPage: page }) => {
  await seed(page);

  await page.getByText('Kitchen Light', { exact: true }).click();

  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await serviceCalls(page)).toHaveLength(0);
});

test('a right click opens the entity details', async ({ authenticatedPage: page }) => {
  await seed(page);

  await page.getByText('Kitchen Light', { exact: true }).click({ button: 'right' });

  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await serviceCalls(page)).toHaveLength(0);
});

test('long press does not toggle while editing the dashboard', async ({
  authenticatedPage: page,
}) => {
  await seed(page);
  await enterEditMode(page);

  await longPress(page, page.getByText('Kitchen Light', { exact: true }));
  await page.waitForTimeout(300);

  expect(await serviceCalls(page)).toHaveLength(0);
});
