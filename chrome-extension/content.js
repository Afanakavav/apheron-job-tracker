// Content Script - Runs on job board pages

(function() {
  'use strict';

  // Immediate log to verify script is loaded
  console.log('🔍 [Apheron] Content script STARTED');
  console.log('🔍 [Apheron] Content script loaded on:', window.location.href);
  console.log('🔍 [Apheron] Document ready state:', document.readyState);
  console.log('🔍 [Apheron] Chrome runtime available:', typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined');

  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Detect which job board we're on
    const url = window.location.href;
    
    console.log('🔍 [Apheron] Initializing for URL:', url);
    
    // LinkedIn - check if we're on a jobs page
    if (url.includes('linkedin.com')) {
      // Check if we're on a job detail page or jobs search
      if (url.includes('/jobs/') || url.includes('currentJobId') || isLinkedInJobPage()) {
        console.log('✅ [Apheron] Detected LinkedIn jobs page');
        setupLinkedIn();
      } else {
        console.log('⚠️ [Apheron] LinkedIn page but not a jobs page, URL:', url);
        // Still setup observer in case user navigates to jobs
        setupLinkedInObserver();
      }
    } else if (url.includes('indeed.com')) {
      console.log('✅ [Apheron] Detected Indeed page');
      setupIndeed();
    } else if (url.includes('glassdoor.com')) {
      console.log('✅ [Apheron] Detected Glassdoor page');
      setupGlassdoor();
    } else {
      console.log('⚠️ [Apheron] Unknown job board, URL:', url);
    }
  }

  /**
   * Check if current LinkedIn page is a job page
   */
  function isLinkedInJobPage() {
    // Check URL
    if (window.location.href.includes('/jobs/') || window.location.href.includes('currentJobId')) {
      return true;
    }
    
    // Check for job-specific elements
    const jobIndicators = [
      '.jobs-details-top-card__job-title',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-details__main-content',
      '[data-test-id="job-title"]',
      'h1.job-title',
    ];
    
    for (const selector of jobIndicators) {
      if (document.querySelector(selector)) {
        console.log(`✅ [Apheron] Found job indicator: ${selector}`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Setup observer for LinkedIn navigation (SPA)
   */
  function setupLinkedInObserver() {
    console.log('🔍 [Apheron] Setting up LinkedIn navigation observer...');
    
    // Check periodically if we navigated to a jobs page
    const checkInterval = setInterval(() => {
      if (isLinkedInJobPage() && !document.getElementById('apheron-save-button')) {
        console.log('✅ [Apheron] Detected navigation to jobs page!');
        clearInterval(checkInterval);
        setupLinkedIn();
      }
    }, 1000);
    
    // Also listen for URL changes
    let lastUrl = window.location.href;
    const urlCheckInterval = setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log('🔍 [Apheron] URL changed to:', lastUrl);
        if (isLinkedInJobPage() && !document.getElementById('apheron-save-button')) {
          console.log('✅ [Apheron] URL change detected - setting up LinkedIn');
          setupLinkedIn();
        }
      }
    }, 500);
  }

  /**
   * Setup for LinkedIn job pages
   */
  function setupLinkedIn() {
    console.log('🔍 [Apheron] Setting up LinkedIn job page...');
    console.log('🔍 [Apheron] Current URL:', window.location.href);
    
    // Try multiple container selectors (LinkedIn changes structure)
    const tryAddButton = () => {
      // Check if button already exists
      if (document.getElementById('apheron-save-button')) {
        console.log('✅ [Apheron] Button already exists, skipping');
        return true;
      }

      const containers = [
        '.jobs-details__main-content',
        '.job-details-jobs-unified-top-card',
        '.jobs-details-top-card',
        '.jobs-details__job-details',
        'main[role="main"]',
        '.jobs-search__job-details',
        '.jobs-details',
        '[data-test-id="job-details"]',
        '.scaffold-layout__detail',
        '.jobs-search__job-details-container',
      ];

      console.log('🔍 [Apheron] Trying to find container...');
      for (const selector of containers) {
        const container = document.querySelector(selector);
        if (container) {
          console.log(`✅ [Apheron] Found container: ${selector}`, container);
          addSaveButton(container, extractLinkedInJob);
          return true;
        } else {
          console.log(`⚠️ [Apheron] Container not found: ${selector}`);
        }
      }
      
      // Fallback: add to body if no container found
      console.log('⚠️ [Apheron] No container found, adding button to body as fallback');
      addSaveButton(document.body, extractLinkedInJob);
      return true;
    };

    // Try immediately
    console.log('🔍 [Apheron] Trying to add button immediately...');
    tryAddButton();

    // Wait for job details to load with observer
    const observer = new MutationObserver(() => {
      if (!document.getElementById('apheron-save-button')) {
        tryAddButton();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also try after delays (LinkedIn loads content dynamically)
    setTimeout(() => {
      console.log('🔍 [Apheron] Retry after 1 second...');
      tryAddButton();
    }, 1000);

    setTimeout(() => {
      console.log('🔍 [Apheron] Retry after 2 seconds...');
      tryAddButton();
    }, 2000);

    setTimeout(() => {
      console.log('🔍 [Apheron] Retry after 5 seconds...');
      tryAddButton();
    }, 5000);

    // Listen for URL changes (LinkedIn uses SPA navigation)
    let lastUrl = window.location.href;
    const urlCheckInterval = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        console.log('🔍 [Apheron] URL changed from', lastUrl, 'to', currentUrl);
        lastUrl = currentUrl;
        
        // Remove existing button if URL changed significantly
        const existingButton = document.getElementById('apheron-save-button');
        if (existingButton) {
          existingButton.remove();
          console.log('🔍 [Apheron] Removed button due to URL change');
        }
        
        // Re-initialize if still on jobs page
        if (isLinkedInJobPage()) {
          setTimeout(() => {
            if (!document.getElementById('apheron-save-button')) {
              console.log('🔍 [Apheron] Re-initializing after URL change...');
              tryAddButton();
            }
          }, 1000);
        }
      }
    }, 500);
  }

  /**
   * Setup for Indeed job pages
   */
  function setupIndeed() {
    const jobContainer = document.querySelector('#jobDescriptionText, .jobsearch-JobComponent');
    if (jobContainer) {
      addSaveButton(jobContainer, extractIndeedJob);
    }
  }

  /**
   * Setup for Glassdoor job pages
   */
  function setupGlassdoor() {
    const jobContainer = document.querySelector('.jobDescriptionContent, .jobDetails');
    if (jobContainer) {
      addSaveButton(jobContainer, extractGlassdoorJob);
    }
  }

  /**
   * Add save button to page
   */
  function addSaveButton(container, extractFunction) {
    console.log('🔍 [Apheron] addSaveButton called, container:', container);
    
    // Remove existing button if any
    const existing = document.getElementById('apheron-save-button');
    if (existing) {
      console.log('⚠️ [Apheron] Removing existing button');
      existing.remove();
    }

    const button = document.createElement('button');
    button.id = 'apheron-save-button';
    button.innerHTML = '💾 Salva in Apheron';
    button.className = 'apheron-save-btn';
    
    // Add inline styles to ensure visibility
    button.style.cssText = `
      position: fixed !important;
      top: 100px !important;
      right: 20px !important;
      z-index: 10000 !important;
      padding: 12px 20px !important;
      background: #1976d2 !important;
      color: white !important;
      border: none !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
    
    button.addEventListener('click', async () => {
      try {
        button.disabled = true;
        button.innerHTML = '⏳ Salvataggio...';
        
        const jobData = extractFunction();
        console.log('🔍 [Apheron] Extracted job data:', jobData);
        
        if (!jobData || !jobData.title) {
          throw new Error('Impossibile estrarre i dati della posizione');
        }

        // Deep clean: Remove undefined, null, and empty string values
        // Firestore doesn't accept undefined values
        const cleanJobData = {};
        for (const [key, value] of Object.entries(jobData)) {
          // Skip undefined and null
          if (value === undefined || value === null) {
            continue;
          }
          // Skip empty strings (except for required fields like title, company, description)
          if (typeof value === 'string' && value.trim() === '' && key !== 'title' && key !== 'company' && key !== 'description') {
            continue;
          }
          // For dates, ensure they're valid
          if (value instanceof Date && isNaN(value.getTime())) {
            continue;
          }
          cleanJobData[key] = value;
        }
        console.log('🔍 [Apheron] Cleaned job data:', cleanJobData);

        // Send to background script
        console.log('📤 [Apheron] Sending job data to background script...');
        const response = await chrome.runtime.sendMessage({
          action: 'saveJob',
          jobData: cleanJobData
        });

        console.log('📥 [Apheron] Response from background:', response);

        if (response && response.success) {
          button.innerHTML = '✅ Salvato!';
          button.style.backgroundColor = '#4caf50';
          
          // Reset after 3 seconds
          setTimeout(() => {
            button.innerHTML = '💾 Salva in Apheron';
            button.style.backgroundColor = '#1976d2';
            button.disabled = false;
          }, 3000);
        } else {
          throw new Error(response?.error || 'Errore nel salvataggio');
        }
      } catch (error) {
        console.error('❌ [Apheron] Error saving job:', error);
        button.innerHTML = '❌ Errore';
        button.style.backgroundColor = '#f44336';
        
        setTimeout(() => {
          button.innerHTML = '💾 Salva in Apheron';
          button.style.backgroundColor = '#1976d2';
          button.disabled = false;
        }, 3000);
      }
    });

    // Insert button - try multiple strategies
    let inserted = false;
    
    if (container && container.appendChild) {
      try {
        container.style.position = 'relative';
        container.appendChild(button);
        console.log('✅ [Apheron] Button added to container');
        inserted = true;
      } catch (e) {
        console.warn('⚠️ [Apheron] Could not add to container:', e);
      }
    }
    
    // Fallback: add to body as fixed position
    if (!inserted) {
      try {
        document.body.appendChild(button);
        console.log('✅ [Apheron] Button added to body (fallback)');
        inserted = true;
      } catch (e) {
        console.error('❌ [Apheron] Could not add button to body:', e);
      }
    }
    
    if (inserted) {
      console.log('✅ [Apheron] Save button successfully added!');
    } else {
      console.error('❌ [Apheron] Failed to add save button!');
    }
  }

  /**
   * Extract job data from LinkedIn page
   * Updated selectors for current LinkedIn structure
   */
  function extractLinkedInJob() {
    // Try multiple selectors for title (LinkedIn changes structure often)
    const title = 
      document.querySelector('.jobs-details-top-card__job-title')?.textContent?.trim() ||
      document.querySelector('h1.job-title')?.textContent?.trim() ||
      document.querySelector('h1[data-test-id="job-title"]')?.textContent?.trim() ||
      document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim() ||
      document.querySelector('h1')?.textContent?.trim() || '';
    
    // Try multiple selectors for company
    const company = 
      document.querySelector('.jobs-details-top-card__company-name')?.textContent?.trim() ||
      document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim() ||
      document.querySelector('.jobs-company__box a')?.textContent?.trim() ||
      document.querySelector('[data-test-id="job-poster"]')?.textContent?.trim() ||
      document.querySelector('.job-details-jobs-unified-top-card__primary-description-without-tagline a')?.textContent?.trim() || '';
    
    // Try multiple selectors for location
    const locationText = 
      document.querySelector('.jobs-details-top-card__bullet')?.textContent?.trim() ||
      document.querySelector('.job-details-jobs-unified-top-card__primary-description-without-tagline')?.textContent?.trim() ||
      document.querySelector('.jobs-details-top-card__primary-description-without-tagline')?.textContent?.trim() ||
      document.querySelector('[data-test-id="job-location"]')?.textContent?.trim() || '';
    
    // Clean location - remove company name if present
    const location = locationText && locationText !== company && locationText.trim() !== '' ? locationText.trim() : '';
    
    // Try multiple selectors for description
    const description = 
      document.querySelector('.jobs-description-content__text')?.textContent?.trim() ||
      document.querySelector('.jobs-box__html-content')?.textContent?.trim() ||
      document.querySelector('.jobs-description__text')?.textContent?.trim() ||
      document.querySelector('[data-test-id="job-description"]')?.textContent?.trim() ||
      document.querySelector('.jobs-description')?.textContent?.trim() || '';
    
    const jobUrl = window.location.href;

    console.log('🔍 [Apheron] Extracted LinkedIn job:', { title, company, location, description: description.substring(0, 100) });

    // Build job data object - only include non-empty values
    const jobData = {
      title,
      company,
      description,
      jobUrl,
      source: 'linkedin',
      postedDate: new Date(),
    };

    // Only add location if it exists and is not empty
    if (location && location.trim() !== '') {
      jobData.location = location.trim();
    }

    return jobData;
  }

  /**
   * Extract job data from Indeed page
   */
  function extractIndeedJob() {
    const title = document.querySelector('.jobsearch-JobInfoHeader-title')?.textContent?.trim() ||
                 document.querySelector('h2.jobTitle')?.textContent?.trim() || '';
    
    const company = document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() ||
                   document.querySelector('.jobsearch-InlineCompanyRating .icl-u-lg-mr--sm')?.textContent?.trim() || '';
    
    const locationText = document.querySelector('[data-testid="job-location"]')?.textContent?.trim() ||
                    document.querySelector('.jobsearch-JobInfoHeader-subtitle')?.textContent?.trim() || '';
    
    const description = document.querySelector('#jobDescriptionText')?.textContent?.trim() ||
                       document.querySelector('.jobsearch-jobDescriptionText')?.textContent?.trim() || '';
    
    const jobUrl = window.location.href;

    // Build job data - only include location if it exists and is not empty
    const jobData = {
      title,
      company,
      description,
      jobUrl,
      source: 'indeed',
      postedDate: new Date(),
    };

    // Only add location if it exists and is not empty
    if (locationText && locationText.trim() !== '' && locationText !== company) {
      jobData.location = locationText.trim();
    }

    return jobData;
  }

  /**
   * Extract job data from Glassdoor page
   */
  function extractGlassdoorJob() {
    const title = document.querySelector('.jobTitle')?.textContent?.trim() ||
                 document.querySelector('h2[data-test="jobTitle"]')?.textContent?.trim() || '';
    
    const company = document.querySelector('.employerName')?.textContent?.trim() ||
                   document.querySelector('[data-test="employerName"]')?.textContent?.trim() || '';
    
    const locationText = document.querySelector('.location')?.textContent?.trim() ||
                    document.querySelector('[data-test="jobLocation"]')?.textContent?.trim() || '';
    
    const description = document.querySelector('.jobDescriptionContent')?.textContent?.trim() ||
                       document.querySelector('.jobDetails')?.textContent?.trim() || '';
    
    const jobUrl = window.location.href;

    // Build job data - only include location if it exists and is not empty
    const jobData = {
      title,
      company,
      description,
      jobUrl,
      source: 'glassdoor',
      postedDate: new Date(),
    };

    // Only add location if it exists and is not empty
    if (locationText && locationText.trim() !== '' && locationText !== company) {
      jobData.location = locationText.trim();
    }

    return jobData;
  }

  /**
   * Extract contacts from LinkedIn profile page
   */
  function extractLinkedInContacts() {
    const contacts = [];
    
    // Check if we're on a profile page
    if (!window.location.href.includes('linkedin.com/in/')) {
      return { success: false, error: 'Non sei su una pagina profilo LinkedIn' };
    }

    try {
      // Extract name
      const name = 
        document.querySelector('h1.text-heading-xlarge')?.textContent?.trim() ||
        document.querySelector('h1[data-test-id="profile-name"]')?.textContent?.trim() ||
        document.querySelector('.pv-text-details__left-panel h1')?.textContent?.trim() ||
        '';

      // Extract role/title
      const role = 
        document.querySelector('.text-body-medium.break-words')?.textContent?.trim() ||
        document.querySelector('[data-test-id="profile-headline"]')?.textContent?.trim() ||
        document.querySelector('.pv-text-details__left-panel .text-body-medium')?.textContent?.trim() ||
        '';

      // Extract company
      const company = 
        document.querySelector('.pv-text-details__left-panel .text-body-medium')?.textContent?.trim() ||
        document.querySelector('[data-test-id="profile-company"]')?.textContent?.trim() ||
        '';

      // Extract LinkedIn URL
      const linkedinUrl = window.location.href.split('?')[0]; // Remove query params

      // Try to find email (if visible)
      const emailElement = document.querySelector('a[href^="mailto:"]');
      const email = emailElement ? emailElement.href.replace('mailto:', '') : '';

      if (name) {
        contacts.push({
          name,
          email: email || undefined,
          linkedinUrl,
          company: company || undefined,
          role: role || undefined,
          type: 'other', // User can change this later
        });
      }

      return {
        success: true,
        contacts,
      };
    } catch (error) {
      console.error('Error extracting LinkedIn contacts:', error);
      return {
        success: false,
        error: error.message || 'Errore durante l\'estrazione dei contatti',
      };
    }
  }

  /**
   * Extract contacts from LinkedIn connections page
   */
  function extractLinkedInConnections() {
    const contacts = [];
    
    // Check if we're on connections page
    if (!window.location.href.includes('linkedin.com/mynetwork/connections/')) {
      return { success: false, error: 'Non sei sulla pagina delle connessioni LinkedIn' };
    }

    try {
      // Find all connection cards
      const connectionCards = document.querySelectorAll('.mn-connection-card, .reusable-search__result-container');
      
      connectionCards.forEach((card) => {
        const nameElement = card.querySelector('.mn-connection-card__name, .entity-result__title-text a');
        const name = nameElement?.textContent?.trim() || '';
        
        const roleElement = card.querySelector('.mn-connection-card__occupation, .entity-result__primary-subtitle');
        const role = roleElement?.textContent?.trim() || '';
        
        const companyElement = card.querySelector('.mn-connection-card__company, .entity-result__secondary-subtitle');
        const company = companyElement?.textContent?.trim() || '';
        
        const linkElement = card.querySelector('a[href*="/in/"]');
        const linkedinUrl = linkElement ? `https://www.linkedin.com${linkElement.getAttribute('href')?.split('?')[0]}` : '';

        if (name && linkedinUrl) {
          contacts.push({
            name,
            linkedinUrl,
            company: company || undefined,
            role: role || undefined,
            type: 'other',
          });
        }
      });

      return {
        success: true,
        contacts: contacts.slice(0, 50), // Limit to 50 contacts at a time
      };
    } catch (error) {
      console.error('Error extracting LinkedIn connections:', error);
      return {
        success: false,
        error: error.message || 'Errore durante l\'estrazione delle connessioni',
      };
    }
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContacts') {
      const url = window.location.href;
      
      if (url.includes('linkedin.com/in/')) {
        // Single profile page
        const result = extractLinkedInContacts();
        sendResponse(result);
      } else if (url.includes('linkedin.com/mynetwork/connections/')) {
        // Connections page
        const result = extractLinkedInConnections();
        sendResponse(result);
      } else {
        sendResponse({
          success: false,
          error: 'Vai su una pagina profilo LinkedIn o sulla pagina delle connessioni per importare contatti',
        });
      }
      
      return true; // Keep channel open for async response
    }
  });
})();
