import { test, expect, type Page } from '@playwright/test';
const status = (page: Page) => page.locator('.controls [role=status]');
async function experiment(page: Page, source: string) {
  await page.goto('/docs/');
  await page.evaluate(
    (value) =>
      localStorage.setItem(
        'qode.workspace.v1',
        JSON.stringify({ source: value, seed: '42', shots: 1024 }),
      ),
    source,
  );
  await page.goto('/');
  await expect(status(page)).toContainText(/Ready|Execution complete/);
}
async function run(page: Page) {
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(status(page)).toContainText('Execution complete');
}

test('root paths and Source/Documentation have separate destinations', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await expect(status(page)).toContainText('Ready');
  await expect(
    page.getByRole('link', { name: 'Source on GitHub (opens in a new tab)', exact: true }),
  ).toHaveAttribute('href', 'https://github.com/devenshah2018/qode');
  await expect(page.getByRole('link', { name: 'Documentation', exact: true })).toHaveAttribute(
    'href',
    '/docs/',
  );
  expect(requests.some((url) => new URL(url).pathname.startsWith('/qode/'))).toBe(false);
  expect(requests.some((url) => new URL(url).pathname === '/wasm/qode.wasm')).toBe(true);
  const alignment = await page.evaluate(() => {
    const line = document.querySelector('.cm-line')!.getBoundingClientRect();
    const number = document
      .querySelectorAll('.cm-lineNumbers .cm-gutterElement')[1]
      .getBoundingClientRect();
    return Math.abs(line.top - number.top);
  });
  expect(alignment).toBeLessThan(1);
});

test('documentation searches content, deep-links, and reloads without an engine', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/docs/');
  await page.getByRole('searchbox', { name: 'Search documentation' }).fill('Fredkin');
  await page.locator('.doc-search-results a').filter({ hasText: 'Every quantum gate' }).click();
  await expect(page.getByRole('heading', { name: 'Gate reference', exact: true })).toBeVisible();
  await page
    .getByRole('complementary', { name: 'On this page' })
    .getByRole('link', { name: 'Rotations', exact: true })
    .click();
  await expect(page).toHaveURL(/#gates\/rotations$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Rotations', exact: true })).toBeInViewport();
  expect(requests.some((url) => /\.wasm(?:\?|$)/.test(url))).toBe(false);
});

test('skip link and repeated section navigation preserve the docs route', async ({ page }) => {
  await page.goto('/docs/#gates');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#gates$/);
  await expect(page.locator('#main-content')).toBeFocused();
  const rotations = page
    .getByRole('complementary', { name: 'On this page' })
    .getByRole('link', { name: 'Rotations', exact: true });
  await rotations.click();
  await expect(page.getByRole('heading', { name: 'Rotations', exact: true })).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await rotations.click();
  await expect(page.getByRole('heading', { name: 'Rotations', exact: true })).toBeInViewport();
});

test('all chapters render and complete Qode snippets launch runnable experiments', async ({
  page,
}) => {
  await page.goto('/docs/');
  const links = await page
    .locator('nav[aria-label="Documentation chapters"] a')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')!));
  expect(links).toHaveLength(17);
  for (const href of links) {
    await page.goto(`/docs/${href}`);
    await expect(page.locator('#doc-title')).toBeVisible();
    await expect(page.getByText('CHAPTER NOT FOUND', { exact: true })).toHaveCount(0);
  }
  await page.goto('/docs/#patterns');
  await page.getByRole('link', { name: 'Open in workbench', exact: true }).first().click();
  await expect(status(page)).toContainText('Ready');
  await run(page);
  await expect(page.getByTestId('norm')).toHaveText('1.000000');
});

test('navigation flushes source and settings, while returning starts a fresh runtime', async ({
  page,
}) => {
  const source = 'qubit custom; print "Keep this experiment"; h custom;';
  await experiment(page, source);
  await page.getByLabel('Random seed').fill('819');
  await page.getByLabel('Shot count').fill('2048');
  await page.getByRole('link', { name: 'Documentation', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/$/);
  await page.getByRole('link', { name: 'Workbench', exact: true }).click();
  await expect(status(page)).toContainText('Ready');
  await expect(page.getByRole('textbox', { name: 'Qode source code' })).toContainText(
    'Keep this experiment',
  );
  await expect(page.getByLabel('Random seed')).toHaveValue('819');
  await expect(page.getByLabel('Shot count')).toHaveValue('2048');
});

test('malformed shares preserve saved source and valid shares are consumed after import', async ({
  page,
}) => {
  const source = 'qubit saved; x saved;';
  await experiment(page, source);
  await page.goto('/#code=not-valid-base64!');
  await expect(status(page)).toContainText('Ready');
  await expect(page.getByRole('textbox', { name: 'Qode source code' })).toContainText(
    'qubit saved;',
  );
  await expect(
    page.getByRole('status').filter({ hasText: 'saved experiment was kept' }),
  ).toBeVisible();
  await page.reload();
  await expect(status(page)).toContainText('Ready');
  await run(page);
  await expect(page.locator('.amplitude').first()).toContainText('|1⟩');
});

test('invalid sample counts do not block execution or reset', async ({ page }) => {
  await experiment(page, 'qubit a; h a; h a;');
  await page.getByLabel('Shot count').fill('');
  await expect(page.getByRole('button', { name: 'Sample', exact: true })).toBeDisabled();
  await expect(
    page.getByText('Enter 1–100,000 shots to sample. Run and Step remain available.', {
      exact: true,
    }),
  ).toBeVisible();
  await run(page);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(status(page)).toContainText('step 0');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(status(page)).toContainText('step 1');
});

test('stopped sessions disable Back and errors recover with a fresh execution', async ({
  page,
}) => {
  await experiment(page, 'qubit a; h a; h a;');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  // Stop is available only while a command is in flight; the long circuit is tested elsewhere.
  await page.getByRole('button', { name: 'Sample', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sampling failed');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled();
  await run(page);
  await expect(page.getByTestId('norm')).toHaveText('1.000000');
});

test('Run shortcut on a completed or empty program always completes', async ({ page }) => {
  for (const source of ['qubit a; h a; h a;', '']) {
    await experiment(page, source);
    if (source) await run(page);
    const editor = page.getByRole('textbox', { name: 'Qode source code' });
    await editor.click();
    await editor.press('ControlOrMeta+Enter');
    await expect(status(page)).toContainText('Execution complete');
    await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled();
  }
});

test('state inspections retain complex amplitudes and Bloch projection stays in its sphere', async ({
  page,
}) => {
  await experiment(
    page,
    'qubit q; ry(pi/2) q; rz(.4) q; inspect state; rz(-.4) q; inspect probabilities;',
  );
  await run(page);
  await page.getByRole('tab', { name: 'Output (2)', exact: true }).click();
  await expect(page.locator('.observation').first()).toContainText('Complex state');
  await expect(page.locator('.observation').first()).toContainText('0.693 − 0.140i');
  await expect(page.locator('.observation').nth(1)).toContainText('Measurement probabilities');
  await expect(
    page.locator('.observation').nth(1).getByRole('columnheader', { name: 'Amplitude' }),
  ).toHaveCount(0);
  await page.getByRole('tab', { name: 'Qubits', exact: true }).click();
  const endpoint = await page
    .locator('.bloch-body svg circle')
    .last()
    .evaluate((node) => ({
      x: Number(node.getAttribute('cx')),
      y: Number(node.getAttribute('cy')),
    }));
  expect(Math.hypot(endpoint.x - 50, endpoint.y - 44)).toBeLessThanOrEqual(29.00000001);
});

test('stepping reveals execution lines below the editor viewport', async ({ page }) => {
  const source = 'qubit q;\n' + '\n'.repeat(60) + 'h q;\n' + '\n'.repeat(60) + 'x q;';
  await experiment(page, source);
  const editor = page.locator('.cm-scroller');
  const before = await editor.evaluate((node) => node.scrollTop);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(status(page)).toContainText('step 1');
  await expect(page.locator('.executing-line')).toContainText('x q;');
  expect(await editor.evaluate((node) => node.scrollTop)).toBeGreaterThan(before);
});

test('mobile navigation, documentation menu and keyboard tabs fit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/docs/');
  await page.getByRole('button', { name: 'Contents', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search documentation' }).fill('feed-forward');
  await page.locator('.doc-search-results a').filter({ hasText: 'Circuit patterns' }).click();
  await expect(page.getByRole('heading', { name: 'Circuit patterns', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Workbench', exact: true }).click();
  await expect(status(page)).toContainText('Ready');
  await page.getByRole('tab', { name: 'Amplitudes', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Qubits', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Output', exact: true })).toBeFocused();
  const header = await page.locator('.topbar').boundingBox(),
    source = await page
      .getByRole('link', { name: 'Source on GitHub (opens in a new tab)', exact: true })
      .boundingBox();
  expect(source!.y + source!.height).toBeLessThanOrEqual(header!.y + header!.height);
});

test('a same-page shared URL imports fresh code instead of retaining the prior session', async ({
  page,
}) => {
  await experiment(page, 'qubit old; x old;');
  await run(page);
  const shared = { source: 'qubit replacement; h replacement;', seed: '777', shots: 500 };
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(shared))));
  await page.evaluate((value) => {
    location.hash = `code=${value}`;
  }, encoded);
  await expect(status(page)).toContainText('Ready');
  await expect(page.getByRole('textbox', { name: 'Qode source code' })).toContainText(
    'qubit replacement;',
  );
  await expect(page.getByLabel('Random seed')).toHaveValue('777');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeDisabled();
  await run(page);
  await expect(page.locator('.amplitude').first()).toContainText('50.00');
});
