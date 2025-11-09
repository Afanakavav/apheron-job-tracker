import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Chrome Extension Tests
 * 
 * Note: These tests require the extension to be built and available.
 * Run `npm run build` in the chrome-extension directory first.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.join(__dirname, '../chrome-extension');

test.describe('Chrome Extension', () => {
  // Skip if extension doesn't exist
  test.beforeAll(async () => {
    const fs = await import('fs');
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      test.skip();
    }
  });

  test('should load extension manifest', async () => {
    // For now, just verify manifest exists
    // Note: Playwright doesn't directly support Chrome extensions
    // This test validates the extension files exist and are valid
    const fs = await import('fs');
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBeTruthy();
  });

  test('should have required extension files', async () => {
    const fs = await import('fs');
    const requiredFiles = [
      'manifest.json',
      'background.js',
      'content.js',
      'popup.html',
      'popup.js',
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(EXTENSION_PATH, file);
      expect(fs.existsSync(filePath)).toBeTruthy();
    }
  });

  test('should have valid manifest.json', async () => {
    const fs = await import('fs');
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    // Verify required fields
    expect(manifest.name).toBeDefined();
    expect(manifest.version).toBeDefined();
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toBeDefined();
    expect(manifest.content_scripts).toBeDefined();
  });
});

/**
 * Integration test for extension functionality
 * This would require running Chrome with the extension loaded
 * For now, we test the extension files exist and are valid
 */
test.describe('Extension Integration', () => {
  test('should have content script for LinkedIn', async () => {
    const fs = await import('fs');
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    // Check if LinkedIn is in content scripts matches
    const hasLinkedIn = manifest.content_scripts?.some((script: any) =>
      script.matches?.some((match: string) => match.includes('linkedin.com'))
    );
    
    expect(hasLinkedIn).toBeTruthy();
  });

  test('should have background service worker', async () => {
    const fs = await import('fs');
    const backgroundPath = path.join(EXTENSION_PATH, 'background.js');
    expect(fs.existsSync(backgroundPath)).toBeTruthy();
    
    // Check if file has required functions
    const backgroundContent = fs.readFileSync(backgroundPath, 'utf-8');
    expect(backgroundContent).toContain('chrome.runtime.onMessage');
  });
});

