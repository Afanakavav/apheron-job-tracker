// Test script to verify content script injection
// Run this in console on LinkedIn jobs page to test

console.log('🧪 [Apheron Test] Testing content script injection...');

// Check if content script would run
const url = window.location.href;
console.log('🧪 [Apheron Test] Current URL:', url);
console.log('🧪 [Apheron Test] Is LinkedIn jobs?', url.includes('linkedin.com/jobs'));

// Check if button exists
const button = document.getElementById('apheron-save-button');
console.log('🧪 [Apheron Test] Button exists?', button !== null);

// Try to manually create button
if (!button) {
  console.log('🧪 [Apheron Test] Creating test button...');
  const testButton = document.createElement('button');
  testButton.id = 'apheron-save-button';
  testButton.innerHTML = '💾 Salva in Apheron';
  testButton.style.cssText = `
    position: fixed !important;
    top: 100px !important;
    right: 20px !important;
    z-index: 999999 !important;
    padding: 12px 20px !important;
    background: #1976d2 !important;
    color: white !important;
    border: none !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    font-size: 14px !important;
    font-weight: 600 !important;
  `;
  document.body.appendChild(testButton);
  console.log('✅ [Apheron Test] Test button created!');
}

