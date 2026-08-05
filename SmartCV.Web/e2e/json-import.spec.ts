import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

test('importing a SmartCV JSON export adds the resume to the list and opens it', async ({ page }) => {
  const exportPayload = {
    app: 'SmartCV',
    resumes: [{
      id: 'imported-resume-1',
      name: 'Imported From JSON',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      personalInfo: { fullName: 'Grace Hopper', email: 'grace@example.com', phone: '', location: '' },
      summary: '',
      coreHighlights: [],
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      interests: [],
      achievements: [],
      referees: [],
    }],
  };

  const fixturePath = path.join(os.tmpdir(), `smartcv-import-${Date.now()}.json`);
  await fs.writeFile(fixturePath, JSON.stringify(exportPayload));

  await page.goto('/app');
  // "Import JSON Data" opens a native file picker via a hidden <input type="file">; Playwright
  // can't drive that OS dialog, so set the file directly on the input instead of clicking.
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(fixturePath);

  await expect(page.getByText('Imported From JSON')).toBeVisible();

  await page.getByText('Imported From JSON').click();
  await page.waitForURL(/\/editor\?id=imported-resume-1/);
  await expect(page.locator('input[placeholder="John Doe"]')).toHaveValue('Grace Hopper');

  await fs.unlink(fixturePath);
});
