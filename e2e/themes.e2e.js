import { expect, test } from './fixtures.js';

const PAGES = { header: [], pages: ['home'], home: ['light.bedroom'] };

const readCard = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('[data-dashboard-card] .touch-feedback');
    const parse = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    return parse(card ? getComputedStyle(card).backgroundColor : '');
  });

const distance = (a, b) =>
  Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));

/** Picks a theme through the real picker, the way a user would. */
const pickTheme = async (page, label) => {
  await page.getByTestId('settings-dropdown-trigger').click();
  await page.getByTestId('settings-menu-theme').click();
  await page.getByRole('button', { name: /^theme:/i }).click();
  await page.getByRole('option', { name: label, exact: true }).click();
  await page.keyboard.press('Escape');

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const card = document.querySelector('[data-dashboard-card] .touch-feedback');
          const parse = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).join(',');
          const cardColor = parse(card ? getComputedStyle(card).backgroundColor : '');
          const themeColor = parse(
            getComputedStyle(document.documentElement).getPropertyValue('--card-bg')
          );
          return cardColor !== '' && cardColor === themeColor;
        }),
      { message: `${label} never reached the card` }
    )
    .toBe(true);
};

test.beforeEach(async ({ authenticatedPage: page }) => {
  await page.setViewportSize({ width: 1180, height: 620 });
  await page.evaluate((pagesConfig) => {
    localStorage.setItem('tunet_pages_config', JSON.stringify(pagesConfig));
    localStorage.setItem('tunet_language', 'en');
  }, PAGES);
  await page.goto('/#/page/home', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/page\/home$/);
  // A goto to the URL we are already on is a no-op, so reload for real.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-dashboard-card]')).toHaveCount(1);
});

test('the theme paints the cards, and different themes paint them differently', async ({
  authenticatedPage: page,
}) => {
  const samples = {};
  for (const [theme, label] of [
    ['dark', 'Dark'],
    ['nordlys', 'Nordlys'],
    ['moss', 'Mossa'],
    ['amethyst', 'Ametyst'],
  ]) {
    await pickTheme(page, label);
    samples[theme] = await readCard(page);
    expect(samples[theme], `${label} did not paint a card`).toHaveLength(3);
  }

  const themes = Object.keys(samples);
  for (let i = 0; i < themes.length; i += 1) {
    for (let j = i + 1; j < themes.length; j += 1) {
      expect(
        distance(samples[themes[i]], samples[themes[j]]),
        `${themes[i]} and ${themes[j]} give the cards the same colour`
      ).toBeGreaterThan(10);
    }
  }
});

test('offers every theme in the picker', async ({ authenticatedPage: page }) => {
  await page.getByTestId('settings-dropdown-trigger').click();
  await page.getByTestId('settings-menu-theme').click();
  await page.getByRole('button', { name: /^theme:/i }).click();

  const options = await page.getByRole('option').allTextContents();

  expect(options).toEqual(
    expect.arrayContaining([
      'Dark',
      'Light',
      'Smart (Auto)',
      'Nordlys',
      'Glöd',
      'Mossa',
      'Orkidé',
      'Karmosin',
      'Gryning',
      'Grafitt',
      'Ametyst',
      'Flat',
    ])
  );
});
