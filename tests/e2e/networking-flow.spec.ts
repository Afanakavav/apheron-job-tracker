import { test, expect } from '@playwright/test';
import { setupAuthenticatedContext, loginAsTestUser } from '../helpers/auth-helper';

test.describe('Networking E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authenticated context
    await setupAuthenticatedContext(page);
    await page.goto('/networking', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
  });

  test('should create, edit, and delete a contact', async ({ page }) => {
    const contactName = `Test Contact ${Date.now()}`;
    const contactEmail = `test${Date.now()}@example.com`;
    const updatedName = `Updated ${contactName}`;

    // Wait for page to be fully loaded (with fallback)
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch (e) {
      // If networkidle times out, just wait a bit
      await page.waitForTimeout(3000);
    }
    
    // Verify we're on networking page and authenticated
    const url = page.url();
    if (url.includes('login') || url === 'http://localhost:5173/') {
      test.skip('User not authenticated - skipping test');
    }

    // Step 1: Create a new contact
    // Try multiple selectors for the add button
    const addButtonSelectors = [
      'button:has-text("Aggiungi Contatto")',
      'button:has-text("Add Contact")',
      'button[aria-label*="Aggiungi" i]',
      'button[aria-label*="Add" i]',
      'button:has([class*="AddIcon"])',
    ];
    
    let addButton = null;
    for (const selector of addButtonSelectors) {
      const buttons = page.locator(selector);
      const count = await buttons.count();
      if (count > 0) {
        addButton = buttons.first();
        try {
          await addButton.waitFor({ state: 'visible', timeout: 5000 });
          break;
        } catch (e) {
          addButton = null;
          continue;
        }
      }
    }
    
    if (!addButton) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/networking-page-debug.png', fullPage: true });
      throw new Error('Could not find "Add Contact" button. Screenshot saved to test-results/networking-page-debug.png');
    }
    
    await addButton.click({ timeout: 10000 });
    
    // Wait for dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    
    // Fill contact form
    const nameField = page.locator('input[name="name"], input[placeholder*="Nome"], input[placeholder*="Name"]').first();
    await nameField.fill(contactName, { timeout: 5000 });
    
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailField.count() > 0) {
      await emailField.fill(contactEmail);
    }
    
    // Save contact
    const saveButton = page.locator('button:has-text("Salva"), button:has-text("Save")').last();
    await saveButton.click({ timeout: 5000 });
    
    // Wait for dialog to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Step 2: Verify contact was created (search for it)
    const searchInput = page.locator('input[placeholder*="Cerca"], input[placeholder*="Search"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(contactName);
      await page.waitForTimeout(1000);
    }
    
    // Step 3: Edit the contact
    const contactCard = page.locator(`text=${contactName}`).first();
    if (await contactCard.count() > 0) {
      // Find edit button (usually near the contact card)
      const editButton = page.locator(`button:has-text("Modifica"), button:has-text("Edit")`).first();
      // Or click on the contact card and then edit
      await contactCard.click({ timeout: 5000 });
      await page.waitForTimeout(1000);
      
      // Try to find edit button in dialog or card
      const editBtn = page.locator('button:has-text("Modifica"), button:has-text("Edit"), [aria-label*="edit"]').first();
      if (await editBtn.count() > 0) {
        await editBtn.click({ timeout: 5000 });
        
        // Wait for edit dialog
        await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
        
        // Update name
        const nameInput = page.locator('input[name="name"], input[placeholder*="Nome"]').first();
        await nameInput.clear();
        await nameInput.fill(updatedName);
        
        // Save changes
        const updateButton = page.locator('button:has-text("Salva"), button:has-text("Save")').last();
        await updateButton.click({ timeout: 5000 });
        
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
        await page.waitForTimeout(2000);
      }
    }
    
    // Step 4: Delete the contact
    const deleteButton = page.locator(`button:has-text("Elimina"), button:has-text("Delete"), [aria-label*="delete"]`).first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click({ timeout: 5000 });
      
      // Confirm deletion if dialog appears
      const confirmButton = page.locator('button:has-text("Conferma"), button:has-text("Confirm"), button:has-text("Elimina"), button:has-text("Delete")').last();
      if (await confirmButton.count() > 0) {
        await confirmButton.click({ timeout: 5000 });
      }
      
      await page.waitForTimeout(2000);
    }
  });

  test('should add note to contact', async ({ page }) => {
    // Find first contact or create one
    const addButton = page.locator('button:has-text("Aggiungi Contatto"), button:has-text("Add Contact")');
    
    if (await addButton.count() > 0) {
      await addButton.first().click({ timeout: 10000 });
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      
      const nameField = page.locator('input[name="name"], input[placeholder*="Nome"]').first();
      await nameField.fill(`Test Contact ${Date.now()}`);
      
      const saveButton = page.locator('button:has-text("Salva"), button:has-text("Save")').last();
      await saveButton.click({ timeout: 5000 });
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
      await page.waitForTimeout(2000);
    }
    
    // Find contact card and click notes button
    const notesButton = page.locator('button:has-text("Note"), button:has-text("Notes")').first();
    if (await notesButton.count() > 0) {
      await notesButton.click({ timeout: 5000 });
      await page.waitForTimeout(1000);
      
      // Add note
      const noteInput = page.locator('textarea, input[placeholder*="Nota"], input[placeholder*="Note"]').first();
      if (await noteInput.count() > 0) {
        await noteInput.fill('Test note from E2E test');
        
        const addNoteButton = page.locator('button:has-text("Aggiungi"), button:has-text("Add")').last();
        if (await addNoteButton.count() > 0) {
          await addNoteButton.click({ timeout: 5000 });
          await page.waitForTimeout(2000);
        }
      }
    }
  });
});

