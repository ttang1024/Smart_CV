import { test, expect } from '@playwright/test';

test('creating a job version shows up as a comparison in the base resume\'s Insights tab', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: /create from scratch/i }).click();
  await page.getByPlaceholder(/software engineer resume/i).fill('Job Versions Test');
  await page.getByRole('button', { name: /^create resume$/i }).click();
  await page.waitForURL(/\/editor\?id=/);

  // Give the base resume a distinct score before forking it.
  await page.locator('input[placeholder="John Doe"]').fill('Grace Hopper');
  await page.waitForTimeout(2200); // debounced autosave + score snapshot

  await page.getByRole('button', { name: /^tools$/i }).click();
  await page.getByText('Jobs', { exact: true }).click();
  await page.getByPlaceholder('Role').fill('Backend Engineer');
  await page.getByPlaceholder('Company').fill('Acme Corp');
  await page.getByRole('button', { name: /create version for this job/i }).click();

  // Creating a version navigates straight into it.
  await expect(page).toHaveURL(/\/editor\?id=/);
  await expect(page.getByText('Job Versions', { exact: true })).toBeVisible();
  await expect(page.getByText('Targeted', { exact: true })).toBeVisible();

  // Diverge the version's score from the base resume's.
  await page.locator('input[placeholder="john@example.com"]').fill('grace@acme.com');
  await page.waitForTimeout(2200);

  await page.getByText('Insights', { exact: true }).click();
  await expect(page.getByText('Current ATS score', { exact: true })).toBeVisible();
  await expect(page.getByText('Compare with other versions', { exact: true })).toBeVisible();
  await expect(page.getByText('Job Versions Test', { exact: true })).toBeVisible();
});
