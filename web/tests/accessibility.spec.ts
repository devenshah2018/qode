import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('workbench and documentation pass automated WCAG 2.1 AA checks', async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/docs/', '/docs/#gates']) {
      await page.goto(path);
      if (path === '/')
        await expect(page.locator('.controls [role=status]')).toContainText('Ready');
      else await expect(page.locator('#doc-title')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        audit.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      ).toEqual([]);
    }
  }
});
