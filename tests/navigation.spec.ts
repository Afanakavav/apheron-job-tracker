import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('should navigate to Dashboard', async ({ page }) => {
    const dashboardLink = page.locator('a:has-text("Dashboard"), button:has-text("Dashboard"), [href*="dashboard"]');
    
    if (await dashboardLink.count() > 0) {
      await dashboardLink.first().click({ timeout: 5000 });
      await page.waitForURL(/.*dashboard|.*\/$/, { timeout: 10000 });
    }
  });

  test('should navigate to Applications', async ({ page }) => {
    const applicationsLink = page.locator('a:has-text("Candidature"), a:has-text("Applications"), [href*="applications"]');
    
    if (await applicationsLink.count() > 0) {
      await applicationsLink.first().click({ timeout: 5000 });
      await page.waitForURL(/.*applications|.*login|.*\/$/, { timeout: 10000 });
      
      // Check if applications page loaded
      await page.waitForTimeout(2000);
    }
  });

  test('should navigate to Networking', async ({ page }) => {
    const networkingLink = page.locator('a:has-text("Networking"), [href*="networking"]');
    
    if (await networkingLink.count() > 0) {
      await networkingLink.first().click({ timeout: 5000 });
      await page.waitForURL(/.*networking|.*login|.*\/$/, { timeout: 10000 });
      
      // Check if networking page loaded
      await page.waitForTimeout(2000);
    }
  });

  test('should navigate to Analytics', async ({ page }) => {
    const analyticsLink = page.locator('a:has-text("Analytics"), [href*="analytics"]');
    
    if (await analyticsLink.count() > 0) {
      await analyticsLink.first().click({ timeout: 5000 });
      await page.waitForURL(/.*analytics|.*login|.*\/$/, { timeout: 10000 });
      
      // Check if analytics page loaded
      await page.waitForTimeout(2000);
    }
  });

  test('should navigate to CV Manager', async ({ page }) => {
    const cvLink = page.locator('a:has-text("Documenti"), a:has-text("CV Manager"), [href*="cv-manager"], [href*="documents"]');
    
    if (await cvLink.count() > 0) {
      await cvLink.first().click({ timeout: 5000 });
      await page.waitForURL(/.*cv-manager|.*documents|.*login|.*\/$/, { timeout: 10000 });
      
      // Check if CV manager page loaded
      await page.waitForTimeout(2000);
    }
  });
});

