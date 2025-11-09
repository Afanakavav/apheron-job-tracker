/**
 * Authentication helper for Playwright tests
 * This file contains utilities for handling authentication in tests
 */

import { Page } from '@playwright/test';

/**
 * Test user credentials (should be set via environment variables)
 * For production tests, use a dedicated test account
 */
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@apheron.io';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

/**
 * Login using email and password
 */
export async function loginAsTestUser(page: Page, email: string = TEST_USER_EMAIL, password: string = TEST_USER_PASSWORD): Promise<void> {
  // Check if already logged in by trying to access a protected page
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  const isProtectedPage = currentUrl.includes('dashboard') || 
                          currentUrl.includes('applications') || 
                          currentUrl.includes('networking');
  
  if (isProtectedPage) {
    // Already logged in
    return;
  }
  
  // If not logged in, navigate to login page
  if (!currentUrl.includes('login')) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000); // Wait for page to fully load
  }
  
  // Wait for login page to be ready
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
    // If networkidle times out, continue anyway
  });
  await page.waitForTimeout(2000);
  
  // Verify we're on login page
  const loginUrl = page.url();
  if (!loginUrl.includes('login')) {
    // Try navigating to login again
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
  }
  
  // Try multiple selectors for email input
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
    'input[id*="email" i]',
    'input[autocomplete="email"]',
    'input[label*="Email" i]',
    'input', // Fallback: try any input and check type
  ];
  
  let emailInput = null;
  for (const selector of emailSelectors) {
    const inputs = page.locator(selector);
    const count = await inputs.count();
    if (count > 0) {
      // For the fallback selector, check if it's actually an email input
      if (selector === 'input') {
        for (let i = 0; i < count; i++) {
          const input = inputs.nth(i);
          const inputType = await input.getAttribute('type');
          const inputName = await input.getAttribute('name');
          if (inputType === 'email' || inputName?.toLowerCase().includes('email')) {
            emailInput = input;
            break;
          }
        }
        if (emailInput) break;
      } else {
        emailInput = inputs.first();
      }
      
      if (emailInput) {
        try {
          await emailInput.waitFor({ state: 'visible', timeout: 5000 });
          break;
        } catch (e) {
          emailInput = null;
          continue;
        }
      }
    }
  }
  
  if (!emailInput) {
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/login-page-debug.png', fullPage: true });
    // Also log page content for debugging
    const pageContent = await page.content();
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());
    throw new Error('Could not find email input field. Screenshot saved to test-results/login-page-debug.png');
  }
  
  await emailInput.fill(email, { timeout: 5000 });
  
  // Find password input
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(password);
  
  // Find and click login button
  const loginButtonSelectors = [
    'button:has-text("Accedi")',
    'button:has-text("Sign in")',
    'button:has-text("Login")',
    'button[type="submit"]',
    'button:has-text("Entra")',
  ];
  
  let loginButton = null;
  for (const selector of loginButtonSelectors) {
    const buttons = page.locator(selector);
    const count = await buttons.count();
    if (count > 0) {
      loginButton = buttons.first();
      try {
        await loginButton.waitFor({ state: 'visible', timeout: 5000 });
        break;
      } catch (e) {
        continue;
      }
    }
  }
  
  if (!loginButton) {
    throw new Error('Could not find login button');
  }
  
  await loginButton.click({ timeout: 5000 });
  
  // Wait for navigation to dashboard or home (with longer timeout)
  try {
    await page.waitForURL(/.*dashboard|.*applications|.*networking|.*\/$/, { timeout: 30000 });
  } catch (e) {
    // If URL doesn't change, check if we're still on login page
    const newUrl = page.url();
    if (newUrl.includes('login') || newUrl === 'http://localhost:5173/') {
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/login-failed-debug.png', fullPage: true });
      throw new Error('Login failed - still on login page. Screenshot saved to test-results/login-failed-debug.png');
    }
  }
  
  await page.waitForTimeout(3000); // Wait for page to fully load
}

/**
 * Logout helper
 */
export async function logout(page: Page): Promise<void> {
  // Find logout button (usually in profile menu)
  const profileMenu = page.locator('button[aria-label*="account"], button[aria-label*="menu"], [aria-label*="profile"]').first();
  
  if (await profileMenu.count() > 0) {
    await profileMenu.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    
    // Find logout option
    const logoutButton = page.locator('button:has-text("Esci"), button:has-text("Logout"), button:has-text("Sign out")').first();
    if (await logoutButton.count() > 0) {
      await logoutButton.click({ timeout: 5000 });
      await page.waitForURL(/.*login|.*\/$/, { timeout: 10000 });
    }
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  const isLoginPage = url.includes('login') || url === 'http://localhost:5173/';
  
  // Check localStorage for Firebase auth (with error handling)
  try {
    const hasAuthToken = await page.evaluate(() => {
      try {
        return Object.keys(localStorage).some(key => 
          key.includes('firebase') || 
          key.includes('auth') ||
          key.includes('user')
        );
      } catch (e) {
        // If localStorage is not accessible, check URL
        return false;
      }
    });
    
    return !isLoginPage && hasAuthToken;
  } catch (e) {
    // If we can't check localStorage, assume not authenticated if on login page
    return !isLoginPage;
  }
}

/**
 * Wait for authentication to complete
 */
export async function waitForAuth(page: Page, timeout: number = 10000): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        try {
          const keys = Object.keys(localStorage);
          return keys.some(key => key.includes('firebase') || key.includes('auth'));
        } catch (e) {
          return false;
        }
      },
      { timeout }
    );
  } catch (e) {
    // If we can't check localStorage, just wait for URL change
    await page.waitForURL(/.*dashboard|.*applications|.*networking/, { timeout });
  }
}

/**
 * Setup authenticated context for tests
 * Use this in test.beforeEach to ensure user is logged in
 */
export async function setupAuthenticatedContext(page: Page): Promise<void> {
  // Always try to login (it's idempotent - won't fail if already logged in)
  try {
    await loginAsTestUser(page);
    
    // Wait for navigation to complete
    await page.waitForTimeout(2000);
    
    // Verify we're not on login page
    const url = page.url();
    const isLoginPage = url.includes('login') || url === 'http://localhost:5173/';
    
    if (isLoginPage) {
      // Try one more time
      await loginAsTestUser(page);
      await page.waitForTimeout(2000);
    }
  } catch (error) {
    console.warn('⚠️ Authentication check failed, but continuing test:', error);
    // Continue anyway - the test will fail if auth is really needed
  }
}
