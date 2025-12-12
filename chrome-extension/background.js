// Background Service Worker for Apheron Job Tracker Extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Apheron Job Tracker extension installed');
    // Open welcome page
    chrome.tabs.create({
      url: 'https://apheron-job-tracker.web.app/job-search?extension=installed'
    });
  }
});

// Listen for messages from content script and web app
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveJob') {
    saveJobToApheron(request.jobData)
      .then((result) => {
        sendResponse({ success: true, result });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'getUserData') {
    chrome.storage.sync.get(['userId', 'token'], (data) => {
      sendResponse({ userId: data.userId, token: data.token });
    });
    return true;
  }

  if (request.action === 'saveCredentials') {
    // Save credentials from web app
    chrome.storage.sync.set({
      userId: request.userId,
      token: request.token
    }, () => {
      console.log('✅ [Apheron] Credentials saved from web app');
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'extractLinkedInContacts') {
    // Extract contacts from current LinkedIn page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractContacts' }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true; // Keep channel open for async response
  }
});

/**
 * Clean job data - remove undefined, null, and empty string values
 * Firestore doesn't accept undefined values
 */
function cleanJobData(data) {
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    // Skip undefined and null
    if (value === undefined || value === null) {
      continue;
    }
    // Skip empty strings (except for required fields)
    if (typeof value === 'string' && value.trim() === '' && key !== 'title' && key !== 'company' && key !== 'description') {
      continue;
    }
    // For dates, ensure they're valid
    if (value instanceof Date && isNaN(value.getTime())) {
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

/**
 * Save job to Apheron via API
 */
async function saveJobToApheron(jobData) {
  const { userId, token } = await chrome.storage.sync.get(['userId', 'token']);

  if (!userId || !token) {
    throw new Error('User not authenticated. Please log in to Apheron first.');
  }

  // Clean job data before sending (double-check to ensure no undefined values)
  const cleanedJobData = cleanJobData(jobData);
  console.log('🔍 [Apheron Background] Cleaned job data before sending:', cleanedJobData);

  // Get Firebase project region from manifest or use default
  // The Cloud Function URL format: https://{region}-{project-id}.cloudfunctions.net/{function-name}
  // For europe-west1: https://europe-west1-apheron-job-tracker.cloudfunctions.net/saveJob
  const functionUrl = 'https://europe-west1-apheron-job-tracker.cloudfunctions.net/saveJob';
  
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      userId,
      job: cleanedJobData
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
    throw new Error(error.error || error.message || `Failed to save job: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Open Apheron app
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: 'https://apheron-job-tracker.web.app/job-search'
  });
});
