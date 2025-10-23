import ReactGA from 'react-ga4';

// Measurement ID from Google Analytics
const MEASUREMENT_ID = 'G-Z3HM95PNET';

// Initialize Google Analytics
export const initGA = () => {
  ReactGA.initialize(MEASUREMENT_ID, {
    gaOptions: {
      anonymizeIp: true, // GDPR compliance
    },
  });
};

// Track page views
export const trackPageView = (page: string) => {
  ReactGA.send({ hitType: 'pageview', page });
};

// Track custom events
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

// Predefined event trackers for common actions
export const GAEvents = {
  // Authentication events
  login: (method: string = 'email') => {
    trackEvent('Auth', 'Login', method);
  },
  
  signup: (method: string = 'email') => {
    trackEvent('Auth', 'Signup', method);
  },
  
  logout: () => {
    trackEvent('Auth', 'Logout');
  },

  // Application events
  createApplication: (status: string) => {
    trackEvent('Application', 'Create', status);
  },
  
  updateApplication: (status: string) => {
    trackEvent('Application', 'Update', status);
  },
  
  deleteApplication: () => {
    trackEvent('Application', 'Delete');
  },
  
  moveApplication: (fromStatus: string, toStatus: string) => {
    trackEvent('Application', 'Move', `${fromStatus} → ${toStatus}`);
  },

  // CV events
  uploadCV: (fileType: string) => {
    trackEvent('CV', 'Upload', fileType);
  },
  
  updateCV: () => {
    trackEvent('CV', 'Update');
  },
  
  deleteCV: () => {
    trackEvent('CV', 'Delete');
  },
  
  viewCV: () => {
    trackEvent('CV', 'View');
  },

  // AI Assistant events
  useCVMatcher: (score?: number) => {
    trackEvent('AI', 'CV Matcher', 'Match Score', score);
  },
  
  generateCoverLetter: () => {
    trackEvent('AI', 'Cover Letter Generator', 'Generate');
  },
  
  analyzeJob: () => {
    trackEvent('AI', 'Job Analyzer', 'Analyze');
  },
  
  researchCompany: () => {
    trackEvent('AI', 'Company Research', 'Research');
  },

  // Analytics events
  viewAnalytics: () => {
    trackEvent('Analytics', 'View Dashboard');
  },
  
  exportData: (format: string) => {
    trackEvent('Analytics', 'Export Data', format);
  },

  // Engagement events
  searchApplications: (query: string) => {
    trackEvent('Engagement', 'Search', query);
  },
  
  filterApplications: (filterType: string) => {
    trackEvent('Engagement', 'Filter', filterType);
  },
  
  sortApplications: (sortBy: string) => {
    trackEvent('Engagement', 'Sort', sortBy);
  },
};

export default ReactGA;

