import { test, expect } from '@playwright/test';

// SmartCV is a fully client-side app (IndexedDB + localStorage, no account), so every test
// gets a clean slate for free from Playwright's per-test browser context — no server-side
// fixtures or backend to reset.

async function createResumeFromScratch(page: import('@playwright/test').Page, name: string) {
  await page.goto('/app');
  await page.getByRole('button', { name: /create from scratch/i }).click();
  await page.getByPlaceholder(/software engineer resume/i).fill(name);
  await page.getByRole('button', { name: /^create resume$/i }).click();
  await page.waitForURL(/\/editor\?id=/);
}

test.describe('resume editor', () => {
  test('creates a resume and autosaves personal info edits', async ({ page }) => {
    await createResumeFromScratch(page, 'Playwright Test Resume');

    await page.locator('input[placeholder="John Doe"]').fill('Ada Lovelace');
    await page.locator('input[placeholder="john@example.com"]').fill('ada@example.com');

    // The live preview reflects edits immediately, before autosave even fires.
    await expect(page.getByText('Ada Lovelace').first()).toBeVisible();

    // Autosave is debounced ~1.5s after the last edit; wait it out before reloading.
    await page.waitForTimeout(2500);

    await page.reload();
    await expect(page.locator('input[placeholder="John Doe"]')).toHaveValue('Ada Lovelace');
    await expect(page.locator('input[placeholder="john@example.com"]')).toHaveValue('ada@example.com');
  });

  test('undo reverts the most recent edit', async ({ page }) => {
    await createResumeFromScratch(page, 'Undo Test Resume');

    const nameInput = page.locator('input[placeholder="John Doe"]');
    await nameInput.fill('First Name');
    await page.waitForTimeout(1500); // let the edit coalesce into undo history
    await nameInput.fill('Second Name');
    await expect(nameInput).toHaveValue('Second Name');

    // Match by the title attribute rather than accessible name: the resume title button
    // ("Undo Test Resume") also matches an /undo/i name filter and makes the locator ambiguous.
    await page.locator('button[title^="Undo"]').click();

    await expect(nameInput).toHaveValue('First Name');
  });
});
