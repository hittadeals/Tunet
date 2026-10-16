import { expect, test } from './fixtures.js';

// The mock connection reports light.bedroom as "on", so the lights-on group pill
// counts 1 match while the openings group counts none.
const PILLS = [
  {
    id: 'pill-active',
    type: 'group_status',
    groupPreset: 'lights_on',
    animationPreset: 'glow-strong',
    iconColor: 'text-[var(--status-error-fg)]',
    hideWhenEmpty: true,
    showLabel: true,
    showSublabel: true,
    visible: true,
  },
  {
    id: 'pill-idle',
    type: 'group_status',
    groupPreset: 'openings_open',
    animationPreset: 'glow-strong',
    iconColor: 'text-[var(--status-error-fg)]',
    hideWhenEmpty: false,
    showLabel: true,
    showSublabel: true,
    visible: true,
  },
];

const readPills = (page) =>
  page.evaluate(() => {
    const read = (label) => {
      const span = Array.from(document.querySelectorAll('span')).find(
        (node) => node.textContent === label
      );
      const wrapper = span?.closest('div.rounded-2xl, button.rounded-2xl') || null;
      return {
        found: Boolean(wrapper),
        glowing: wrapper ? /status-pill-glow/.test(wrapper.className) : false,
        boxShadow: wrapper ? getComputedStyle(wrapper).boxShadow : null,
      };
    };

    return {
      active: read('Lights on'),
      idle: read('All doors/windows closed'),
      glowClassCount: document.querySelectorAll('[class*="status-pill-glow"]').length,
    };
  });

test('glows only the pill that is actually active', async ({ authenticatedPage: page }) => {
  await page.setViewportSize({ width: 1180, height: 500 });
  await page.evaluate((pills) => {
    localStorage.setItem('tunet_status_pills_config', JSON.stringify(pills));
    localStorage.setItem('tunet_language', 'en');
    localStorage.setItem('tunet_theme', 'dark');
  }, PILLS);
  await page.goto('/#/page/home', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/page\/home$/);
  // A goto to the current URL is a no-op, so reload to pick up the seeded pills.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Lights on', { exact: true })).toBeVisible();
  await expect(page.getByText('All doors/windows closed', { exact: true })).toBeVisible();

  const pills = await readPills(page);

  expect(pills.active.found, 'the active pill should render').toBe(true);
  expect(pills.active.glowing, 'the active pill should carry the glow class').toBe(true);
  expect(pills.active.boxShadow, 'the glow should paint a shadow').not.toBe('none');

  expect(pills.idle.found, 'the idle pill still renders while empty').toBe(true);
  expect(pills.idle.glowing, 'the idle pill must stay dark').toBe(false);
  expect(pills.idle.boxShadow).toBe('none');

  expect(pills.glowClassCount).toBe(1);
});
