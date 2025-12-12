// Popup script for Apheron Job Tracker Extension

document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const connectBtn = document.getElementById('connectBtn');
  const openAppBtn = document.getElementById('openAppBtn');
  const savedJobsBtn = document.getElementById('savedJobsBtn');

  // Check connection status
  const { userId, token } = await chrome.storage.sync.get(['userId', 'token']);

  if (userId && token) {
    statusDiv.textContent = '✅ Connesso';
    statusDiv.className = 'status connected';
    connectBtn.textContent = 'Disconnetti';
  } else {
    statusDiv.textContent = '❌ Non connesso';
    statusDiv.className = 'status disconnected';
    connectBtn.textContent = 'Connetti ad Apheron';
  }

  // Connect/Disconnect button
  connectBtn.addEventListener('click', async () => {
    if (userId && token) {
      // Disconnect
      await chrome.storage.sync.remove(['userId', 'token']);
      statusDiv.textContent = '❌ Non connesso';
      statusDiv.className = 'status disconnected';
      connectBtn.textContent = 'Connetti ad Apheron';
    } else {
      // Connect - open Apheron login page
      chrome.tabs.create({
        url: 'https://apheron-job-tracker.web.app/login?extension=connect'
      });
    }
  });

  // Open App button
  openAppBtn.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://apheron-job-tracker.web.app/job-search'
    });
  });

  // Saved Jobs button
  savedJobsBtn.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://apheron-job-tracker.web.app/job-search?tab=saved'
    });
  });
});

// Listen for storage changes (when user logs in from web app)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && (changes.userId || changes.token)) {
    location.reload();
  }
});
