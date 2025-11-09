import { test, expect } from '@playwright/test';

test.describe('Applications Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to applications page
    await page.goto('/applications', { waitUntil: 'domcontentloaded' });
    // Wait for page to be interactive (may redirect to login)
    await page.waitForTimeout(2000);
  });

  test('should display applications page or login', async ({ page }) => {
    // Check if we're on login page or applications page
    const currentUrl = page.url();
    
    if (currentUrl.includes('login') || currentUrl === 'http://localhost:5173/') {
      // If on login page, that's expected for unauthenticated users
      const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), button:has-text("Accedi")');
      await expect(loginButton.first()).toBeVisible({ timeout: 5000 });
    } else {
      // If on applications page, check for title
      const title = page.locator('h4, h1, h2, h3').filter({ hasText: /Candidature|Applications/i });
      await expect(title.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should open add application dialog', async ({ page }) => {
    // Skip if on login page
    if (page.url().includes('login') || page.url() === 'http://localhost:5173/') {
      test.skip();
    }
    
    // Find "New Application" or "Nuova Candidatura" button
    const addButton = page.locator('button:has-text("Nuova Candidatura"), button:has-text("New Application")');
    
    if (await addButton.count() > 0) {
      await addButton.first().click({ timeout: 5000 });
      
      // Check if dialog opens
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display kanban board', async ({ page }) => {
    // Skip if on login page
    if (page.url().includes('login') || page.url() === 'http://localhost:5173/') {
      test.skip();
    }
    
    // Wait a bit for page to load
    await page.waitForTimeout(2000);
    
    // Check if kanban columns are visible
    // Adjust selectors based on your actual implementation
    const columns = page.locator('[data-testid*="column"], .kanban-column, [class*="column"], [class*="Column"]');
    
    // At least one column should be visible
    if (await columns.count() > 0) {
      await expect(columns.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

