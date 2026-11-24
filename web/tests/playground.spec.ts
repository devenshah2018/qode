import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { test, expect, type Page } from '@playwright/test';
const bellSource = readFileSync(new URL('../../examples/bell.qc', import.meta.url), 'utf8');
test.beforeEach(async ({ page }) => {
  await page.addInitScript((source) => {
    if (!localStorage.getItem('qode.workspace.v1'))
      localStorage.setItem(
        'qode.workspace.v1',
        JSON.stringify({ source, seed: '42', shots: 1024 }),
      );
  }, bellSource);
});
async function ready(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('status').first()).toContainText('Ready');
}
async function edit(page: Page, source: string) {
  const editor = page.getByRole('textbox', { name: 'Qode source code' });
  await editor.click();
  await editor.press('ControlOrMeta+A');
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (i) await editor.press('Enter');
    await editor.pressSequentially(lines[i]);
  }
  await expect(editor).toContainText(source.split('\n')[0]);
}
test('steps, reverses measurement, and replays the identical state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('step 1');
  await expect(page.locator('.amplitude').first()).toContainText('50.00');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await page.getByRole('tab', { name: 'Qubits', exact: true }).click();
  await expect(page.locator('.badge.mixed')).toHaveCount(2);
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Execution complete');
  const before = await page.locator('.bit-values').textContent();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('step 4');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Execution complete');
  await expect(page.locator('.bit-values')).toHaveText(before!);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('step 0');
  expect(errors).toEqual([]);
});
test('samples Bell correlations and exports all counts', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Sample', exact: true }).click();
  await expect(page.getByTestId('histogram')).toBeVisible();
  const outcomes = await page.locator('.histogram-row code').allTextContents();
  expect(outcomes.sort()).toEqual(['00', '11']);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export results' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('qode-results.json');
});
test('reports syntax errors and recovers after an edit', async ({ page }) => {
  await ready(page);
  await edit(page, 'qubit a;\nbogus a;');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('main.qc:2:1');
  await edit(page, 'qubit a; h a; h a;');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Execution complete');
  await expect(page.locator('.amplitude').first()).toContainText('100.00');
});
test('checkpoint replay crosses branches and retains observation history', async ({ page }) => {
  await ready(page);
  const source =
    'qubit a;bit b;' + 'h a;h a;'.repeat(40) + 'h a;measure a->b;if b==1{x a;}inspect state;';
  await edit(page, source);
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Execution complete');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Ready');
  await page.getByRole('tab', { name: 'Output', exact: true }).click();
  await expect(page.locator('.observation')).toHaveCount(0);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Execution complete');
  await expect(page.locator('.observation')).toHaveCount(1);
});
test('enforces browser limits and seed validation', async ({ page }) => {
  await ready(page);
  await page.getByLabel('Random seed').fill('-1');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('unsigned 64-bit');
  await page.getByLabel('Random seed').fill('42');
  await edit(page, Array.from({ length: 17 }, (_, i) => `qubit q${i};`).join(''));
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('16 qubits');
});
test('loads a shared Unicode program, autosaves, and imports files', async ({ page }) => {
  const source = 'qubit a;print "Hello λ world";x a;';
  const encoded = btoa(
    String.fromCharCode(
      ...new TextEncoder().encode(JSON.stringify({ source, seed: '99', shots: 100 })),
    ),
  );
  await page.goto(`./#code=${encoded}`);
  await expect(page.getByRole('status').first()).toContainText('Ready');
  await expect(page.getByLabel('Random seed')).toHaveValue('99');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Execution complete');
  await page.getByRole('tab', { name: 'Output (1)', exact: true }).click();
  await expect(page.locator('.observation')).toContainText('Hello λ world');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('input[type=file]').setInputFiles({
    name: 'import.qc',
    mimeType: 'text/plain',
    buffer: Buffer.from('qubit coin;h coin;'),
  });
  await expect(page.getByRole('textbox', { name: 'Qode source code' })).toContainText(
    'qubit coin;',
  );
});
test('mobile layout fits and all examples execute', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  for (const title of [
    'Superposition',
    'Interference',
    'Three-way correlation',
    'Grover search',
    'Teleportation',
  ]) {
    await page.locator('.template-menu summary').click();
    await page.getByRole('button', { name: new RegExp(title) }).click();
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    await expect(page.getByRole('status').first()).toContainText('Execution complete');
    await expect(page.getByTestId('norm')).toHaveText('1.000000');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('stops a worker during an expensive circuit and recreates it safely', async ({ page }) => {
  await ready(page);
  const source =
    Array.from({ length: 16 }, (_, i) => `qubit q${i};`).join('') + 'h q0;'.repeat(20000);
  await page.locator('input[type=file]').setInputFiles({
    name: 'large.qc',
    mimeType: 'text/plain',
    buffer: Buffer.from(source),
  });
  await expect(page.getByRole('status').first()).toContainText('Edited');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Stopped');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('step 0');
  await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeDisabled();
});

test('persists edits and safely compiles source larger than the Wasm stack margin', async ({
  page,
}) => {
  await ready(page);
  const source = '// a bounded source line with spaces\n'.repeat(18000) + 'qubit a;h a;';
  await page.locator('input[type=file]').setInputFiles({
    name: 'large.qc',
    mimeType: 'text/plain',
    buffer: Buffer.from(source),
  });
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Execution complete');
  await page.waitForFunction(() =>
    JSON.parse(localStorage.getItem('qode.workspace.v1') || '{}').source?.endsWith('qubit a;h a;'),
  );
  await page.reload();
  await expect(page.getByRole('status').first()).toContainText('Ready');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Execution complete');
  await expect(page.locator('.amplitude').first()).toContainText('50.00');
});

test('rejects invalid UTF-8 imports without changing the experiment', async ({ page }) => {
  await ready(page);
  const before = await page.getByRole('textbox', { name: 'Qode source code' }).textContent();
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.qc',
    mimeType: 'text/plain',
    buffer: Buffer.from([112, 114, 105, 110, 116, 32, 34, 255, 34, 59]),
  });
  await expect(page.getByRole('status').filter({ hasText: 'valid UTF-8' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Qode source code' })).toHaveText(before!);
});
