import { test, expect } from '@playwright/test';
const state = (page: import('@playwright/test').Page) => page.locator('.controls [role=status]');
async function code(page: import('@playwright/test').Page, source: string) {
  const editor = page.getByRole('textbox', { name: 'Qode source code' });
  await editor.fill(source);
}
test('starts with an editable blank file and optional templates', async ({ page }) => {
  await page.goto('/');
  await expect(state(page)).toContainText('Ready');
  await expect(page.getByRole('textbox', { name: 'Qode source code' })).toHaveText('// main.qc');
  await expect(page.getByRole('button', { name: 'Compile', exact: true })).toBeEnabled();
  await expect(page.getByRole('navigation', { name: 'Code templates' })).toBeHidden();
  await page.locator('.template-menu summary').click();
  await page.getByRole('button', { name: /Entanglement/ }).click();
  await expect(page.getByRole('textbox', { name: 'Qode source code' })).toContainText(
    'qubit alice;',
  );
});
test('compile validates without running and preserves a stepped checkpoint', async ({ page }) => {
  await page.goto('/');
  await expect(state(page)).toContainText('Ready');
  await code(page, 'qubit q; bit b; h q; print "hello"; measure q -> b;');
  await page.getByRole('button', { name: 'Compile', exact: true }).click();
  await expect(state(page)).toContainText('step 0');
  await expect(page.getByLabel('Build log', { exact: true })).toContainText('Compile successful');
  await expect(page.locator('.bit-values')).toContainText('b=?');
  await expect(page.locator('.amplitude').first()).toContainText('100.00');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(state(page)).toContainText('step 1');
  await page.getByRole('button', { name: 'Compile', exact: true }).click();
  await expect(state(page)).toContainText('step 1');
  await expect(page.locator('.amplitude').first()).toContainText('50.00');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(state(page)).toContainText('Execution complete');
  await page.getByRole('button', { name: /^Console/ }).click();
  await expect(page.getByLabel('Program console', { exact: true })).toContainText('hello');
});
test('compile diagnostics show a source location, then clear on correction', async ({ page }) => {
  await page.goto('/');
  await expect(state(page)).toContainText('Ready');
  await code(page, 'qubit q;\nh missing;');
  await page.getByRole('button', { name: 'Compile', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('main.qc:2:');
  await expect(page.getByRole('alert')).toContainText('missing');
  await code(page, 'qubit q;\nh q;');
  await page.getByRole('textbox', { name: 'Qode source code' }).press('ControlOrMeta+Shift+Enter');
  await expect(state(page)).toContainText('step 0');
  await page.getByRole('button', { name: /^Problems/ }).click();
  await expect(page.getByLabel('Problems', { exact: true })).toContainText('No diagnostics');
});
test('new file protects custom code and saved buffers restore', async ({ page }) => {
  await page.goto('/');
  await expect(state(page)).toContainText('Ready');
  await code(page, 'qubit mine;');
  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Qode source code' })).toContainText(
    'qubit mine;',
  );
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: 'New file', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Qode source code' })).toContainText(
    'qubit mine;',
  );
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'New file', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Qode source code' })).not.toContainText(
    'qubit mine;',
  );
});
