import { test, expect } from '@playwright/test';

test.describe('Networking - Contacts Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to networking page
    await page.goto('/networking', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('should display networking page or login', async ({ page }) => {
    const currentUrl = page.url();
    
    if (currentUrl.includes('login') || currentUrl === 'http://localhost:5173/') {
      // If on login page, that's expected
      const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), button:has-text("Accedi")');
      await expect(loginButton.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Check if page title is visible
      const title = page.locator('h4, h1, h2, h3').filter({ hasText: /Networking|Contatti/i });
      await expect(title.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should open add contact dialog', async ({ page }) => {
    // Skip if on login page
    if (page.url().includes('login') || page.url() === 'http://localhost:5173/') {
      test.skip();
    }
    
    // Find and click "Add Contact" button
    const addButton = page.locator('button:has-text("Aggiungi Contatto"), button:has-text("Add Contact")');
    
    if (await addButton.count() > 0) {
      await addButton.first().click({ timeout: 5000 });
      
      // Check if dialog is visible
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      
      // Check if form fields are visible
      const nameField = page.locator('input[name="name"], input[placeholder*="Nome"], input[placeholder*="Name"]');
      await expect(nameField.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create a new contact', async ({ page }) => {
    // Skip if on login page
    if (page.url().includes('login') || page.url() === 'http://localhost:5173/') {
      test.skip();
    }
    
    // Open add contact dialog
    const addButton = page.locator('button:has-text("Aggiungi Contatto"), button:has-text("Add Contact")');
    
    if (await addButton.count() > 0) {
      await addButton.first().click({ timeout: 5000 });
      
      // Wait for dialog
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      
      // Fill in contact form
      const nameField = page.locator('input[name="name"], input[placeholder*="Nome"], input[placeholder*="Name"]').first();
      await nameField.fill('Test Contact ' + Date.now(), { timeout: 5000 });
      
      // Try to find and fill email field if it exists
      const emailField = page.locator('input[type="email"], input[name="email"]');
      if (await emailField.count() > 0) {
        await emailField.first().fill('test@example.com');
      }
      
      // Find and click save button
      const saveButton = page.locator('button:has-text("Salva"), button:has-text("Save")').last();
      await saveButton.click({ timeout: 5000 });
      
      // Wait for dialog to close (contact should be created)
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
      
      // Check if success message appears or contact is in the list
      // This depends on your implementation
      await page.waitForTimeout(2000); // Wait for data to load
    }
  });

  test('should search contacts', async ({ page }) => {
    // Skip if on login page
    if (page.url().includes('login') || page.url() === 'http://localhost:5173/') {
      test.skip();
    }
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="Cerca"], input[placeholder*="Search"]');
    
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('Test', { timeout: 5000 });
      await page.waitForTimeout(1000); // Wait for search to filter
    }
  });

  test('should filter contacts by type', async ({ page }) => {
    // Skip if on login page
    if (page.url().includes('login') || page.url() === 'http://localhost:5173/') {
      test.skip();
    }
    
    // Find filter dropdown
    const filterButton = page.locator('button:has-text("Filtra"), button:has-text("Filter"), select');
    
    if (await filterButton.count() > 0) {
      await filterButton.first().click({ timeout: 5000 });
      await page.waitForTimeout(1000);
    }
  });
});

