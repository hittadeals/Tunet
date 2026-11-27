import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures.js';

const PAGES = { header: [], pages: ['home'], home: [], kitchen: [] };

test('main dashboard has no serious accessibility violations', async ({
  authenticatedPage: page,
}) => {
  await page.evaluate((pagesConfig) => {
    localStorage.setItem('tunet_pages_config', JSON.stringify(pagesConfig));
    localStorage.setItem('tunet_language', 'en');
    localStorage.setItem('tunet_theme', 'dark');
  }, PAGES);
  await page.goto('/#/page/home', { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByTestId('page-navigation-bar').waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // The palette is user-selectable; contrast is covered by the theme lint.
    .disableRules(['color-contrast'])
    .analyze();

  expect(results.violations).toEqual([]);
});
