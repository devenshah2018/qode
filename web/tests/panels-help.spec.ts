import { test, expect } from '@playwright/test';
async function ready(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.locator('.controls [role=status]')).toContainText('Ready');
}
test('collapsing panels releases space and preserves sample settings and runtime', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await ready(page);
  await page.locator('.template-menu summary').click();
  await page.getByRole('button', { name: /Entanglement/ }).click();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.controls [role=status]')).toContainText('step 1');
  await page.getByLabel('Shot count').fill('456');
  const before = await page.locator('#state-body').evaluate((e) => e.clientHeight);
  await page.getByRole('button', { name: 'Collapse Sample', exact: true }).click();
  await expect(page.getByLabel('Shot count')).toBeHidden();
  await expect
    .poll(() => page.locator('#state-body').evaluate((e) => e.clientHeight))
    .toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Collapse State', exact: true }).click();
  await expect(page.getByTestId('norm')).toBeHidden();
  await page.getByRole('button', { name: 'Collapse Circuit', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Quantum circuit diagram' })).toBeHidden();
  for (const name of ['Circuit', 'State', 'Sample'])
    await page.getByRole('button', { name: `Expand ${name}`, exact: true }).click();
  await expect(page.getByLabel('Shot count')).toHaveValue('456');
  await expect(page.locator('.controls [role=status]')).toContainText('step 1');
  await expect(page.locator('.amplitude').first()).toContainText('50.00');
});
test('gate and measurement hovers explain syntax and dismiss cleanly', async ({ page }) => {
  await ready(page);
  await page
    .getByRole('textbox', { name: 'Qode source code' })
    .fill('qubit q;\nbit b;\nh q;\nmeasure q -> b;');
  const h = page.locator('.cm-line').filter({ hasText: /^h q;$/ });
  await h.hover({ position: { x: 10, y: 10 } });
  await expect(page.getByRole('tooltip')).toContainText('Hadamard');
  await expect(page.getByRole('tooltip')).toContainText('h target;');
  await page.getByRole('textbox', { name: 'Qode source code' }).press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  await page
    .locator('.cm-line')
    .filter({ hasText: /^measure q/ })
    .hover({ position: { x: 10, y: 10 } });
  await expect(page.getByRole('tooltip')).toContainText('collapses');
  await expect(page.getByRole('tooltip').getByRole('link')).toHaveAttribute(
    'href',
    '/docs/#syntax',
  );
});
test('F1 gives keyboard help and comments and strings never show gate help', async ({ page }) => {
  await ready(page);
  const editor = page.getByRole('textbox', { name: 'Qode source code' });
  await editor.fill('// h\nprint "h";\nh q;');
  await editor.press('ControlOrMeta+End');
  await editor.press('Home');
  await editor.press('ArrowRight');
  await editor.press('F1');
  await expect(page.getByRole('tooltip')).toContainText('Hadamard');
  await editor.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  for (const text of ['// h', 'print "h";']) {
    const line = page.locator('.cm-line').filter({ hasText: text });
    await line.locator('span').last().hover();
    await page.waitForTimeout(400);
    await expect(page.getByRole('tooltip')).toBeHidden();
  }
  await editor.fill('constructor');
  await editor.press('ControlOrMeta+End');
  await editor.press('F1');
  await expect(page.getByRole('tooltip')).toBeHidden();
});

test('documentation shares the workbench palette and retains readable document navigation', async ({
  page,
}) => {
  await ready(page);
  const color = await page
    .locator('.app-shell')
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  await page.goto('/docs/');
  await expect(page.locator('#doc-title')).toBeVisible();
  expect(
    await page.locator('.docs-shell').evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe(color);
  await page.getByRole('searchbox', { name: 'Search documentation' }).fill('Hadamard');
  await expect(page.locator('.doc-search-results a').first()).toBeVisible();
});
