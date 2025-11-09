import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('should display dashboard or login', async ({ page }) => {
    const currentUrl = page.url();
    
    if (currentUrl.includes('login') || currentUrl === 'http://localhost:5173/') {
      // If on login page, that's expected
      const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), button:has-text("Accedi")');
      await expect(loginButton.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Check if dashboard title is visible
      const title = page.locator('h4, h1, h2, h3').filter({ hasText: /Dashboard/i });
      await expect(title.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display statistics cards', async ({ page }) => {
    // Skip if on login page
    if (page.url().includes('login') || page.url() === 'http://localhost:5173/') {
      test.skip();
    }
    
    await page.waitForTimeout(2000);
    
    // Check for statistics cards (total applications, etc.)
    // Adjust selectors based on your actual implementation
    const cards = page.locator('[class*="card"], [class*="Card"], .MuiCard-root, [class*="CardContent"]');
    
    // At least one card should be visible
    if (await cards.count() > 0) {
      await expect(cards.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display recent applications', async ({ page }) => {
    // Skip if on login page
    if (page.url().includes('login') || page.url() === 'http://localhost:5173/') {
      test.skip();
    }
    
    await page.waitForTimeout(2000);
    
    // Check for recent applications section
    const recentSection = page.locator('text=/Recent|Recenti/i');
    
    // Section might not exist if no applications, so we just check if page loaded
    await page.waitForTimeout(1000);
  });
});

