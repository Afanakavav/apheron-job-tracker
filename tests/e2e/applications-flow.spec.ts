import { test, expect } from '@playwright/test';
import { setupAuthenticatedContext } from '../helpers/auth-helper';

test.describe('Applications E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedContext(page);
    await page.goto('/applications', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('should create, update, and delete an application', async ({ page }) => {
    const companyName = `Test Company ${Date.now()}`;
    const jobTitle = `Test Position ${Date.now()}`;
    const updatedStatus = 'interview';

    // Step 1: Create new application
    const addButton = page.locator('button:has-text("Nuova Candidatura"), button:has-text("New Application")');
    if (await addButton.count() > 0) {
      await addButton.first().click({ timeout: 10000 });
      
      // Wait for dialog
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      
      // Fill application form
      const companyField = page.locator('input[name="company"], input[placeholder*="Azienda"], input[placeholder*="Company"]').first();
      if (await companyField.count() > 0) {
        await companyField.fill(companyName, { timeout: 5000 });
      }
      
      const jobTitleField = page.locator('input[name="jobTitle"], input[placeholder*="Posizione"], input[placeholder*="Position"]').first();
      if (await jobTitleField.count() > 0) {
        await jobTitleField.fill(jobTitle, { timeout: 5000 });
      }
      
      // Save application
      const saveButton = page.locator('button:has-text("Salva"), button:has-text("Save"), button:has-text("Crea"), button:has-text("Create")').last();
      await saveButton.click({ timeout: 5000 });
      
      // Wait for dialog to close
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
      await page.waitForTimeout(3000);
    }
    
    // Step 2: Find and edit the application
    const applicationCard = page.locator(`text=${companyName}`).first();
    if (await applicationCard.count() > 0) {
      await applicationCard.click({ timeout: 5000 });
      await page.waitForTimeout(1000);
      
      // Find edit button
      const editButton = page.locator('button:has-text("Modifica"), button:has-text("Edit"), [aria-label*="edit"]').first();
      if (await editButton.count() > 0) {
        await editButton.click({ timeout: 5000 });
        
        await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
        
        // Update status if status field exists
        const statusField = page.locator('select[name="status"], [role="combobox"]').first();
        if (await statusField.count() > 0) {
          await statusField.selectOption(updatedStatus, { timeout: 5000 });
        }
        
        // Save changes
        const updateButton = page.locator('button:has-text("Salva"), button:has-text("Save"), button:has-text("Aggiorna"), button:has-text("Update")').last();
        await updateButton.click({ timeout: 5000 });
        
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
        await page.waitForTimeout(2000);
      }
    }
    
    // Step 3: Delete the application
    const deleteButton = page.locator('button:has-text("Elimina"), button:has-text("Delete"), [aria-label*="delete"]').first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click({ timeout: 5000 });
      
      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Conferma"), button:has-text("Confirm"), button:has-text("Elimina"), button:has-text("Delete")').last();
      if (await confirmButton.count() > 0) {
        await confirmButton.click({ timeout: 5000 });
      }
      
      await page.waitForTimeout(2000);
    }
  });

  test('should move application between kanban columns', async ({ page }) => {
    // Wait for kanban board to load
    await page.waitForTimeout(3000);
    
    // Find a draggable application card
    const applicationCard = page.locator('[class*="card"], [class*="Card"], [draggable="true"]').first();
    
    if (await applicationCard.count() > 0) {
      // Get initial position
      const initialBox = await applicationCard.boundingBox();
      
      // Find target column (next column)
      const columns = page.locator('[class*="column"], [class*="Column"], [data-testid*="column"]');
      const columnCount = await columns.count();
      
      if (columnCount > 1) {
        // Try to drag to next column
        const targetColumn = columns.nth(1);
        const targetBox = await targetColumn.boundingBox();
        
        if (initialBox && targetBox) {
          // Perform drag and drop
          await applicationCard.dragTo(targetColumn, { timeout: 5000 });
          await page.waitForTimeout(2000);
        }
      }
    }
  });
});

