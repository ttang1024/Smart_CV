import { test, expect } from '@playwright/test';

test('ATS checker score improves as the resume gets filled in', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: /create from scratch/i }).click();
  await page.getByPlaceholder(/software engineer resume/i).fill('ATS Checker Test');
  await page.getByRole('button', { name: /^create resume$/i }).click();
  await page.waitForURL(/\/editor\?id=/);

  await page.getByRole('button', { name: /^tools$/i }).click();
  await page.getByText('ATS', { exact: true }).click();
  await expect(page.getByText('ATS Checker', { exact: true })).toBeVisible();

  // Only the ATS panel is mounted at this point, so its verdict badge is unambiguous.
  await expect(page.getByText('At risk')).toBeVisible();
  await expect(page.getByText('Missing candidate name', { exact: true })).toBeVisible();

  await page.locator('input[placeholder="John Doe"]').fill('Ada Lovelace');

  // The ATS score recomputes live off the in-memory resume, no save required: the
  // name-specific issue clears immediately and its "passed" counterpart appears.
  await expect(page.getByText('Missing candidate name', { exact: true })).not.toBeVisible();
  await expect(page.getByText('Candidate name found', { exact: true })).toBeVisible();
});
