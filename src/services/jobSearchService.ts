// Job Search Service - Integrates with multiple job boards
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import type { JobPosting, JobSearchPreferences, JobAlert } from '../types';

/**
 * Search jobs from multiple sources
 * Note: Most job boards don't have public APIs, so we'll use web scraping or proxy APIs
 */
export const searchJobs = async (
  preferences: JobSearchPreferences,
  maxResults: number = 50
): Promise<JobPosting[]> => {
  const results: JobPosting[] = [];

  try {
    // Search Indeed (using public API or scraping)
    const indeedJobs = await searchIndeed(preferences, Math.floor(maxResults / 3));
    results.push(...indeedJobs);

    // Search LinkedIn (requires OAuth, using public search for now)
    const linkedInJobs = await searchLinkedIn(preferences, Math.floor(maxResults / 3));
    results.push(...linkedInJobs);

    // Search Glassdoor (using public API or scraping)
    const glassdoorJobs = await searchGlassdoor(preferences, Math.floor(maxResults / 3));
    results.push(...glassdoorJobs);

    // Remove duplicates based on title + company
    const uniqueJobs = removeDuplicates(results);

    // Sort by relevance (match score)
    uniqueJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return uniqueJobs.slice(0, maxResults);
  } catch (error) {
    console.error('Error searching jobs:', error);
    return results;
  }
};

/**
 * Search Indeed jobs
 * Note: Indeed doesn't have a public API, so we'll use a proxy or scraping service
 */
const searchIndeed = async (
  preferences: JobSearchPreferences,
  _maxResults: number
): Promise<JobPosting[]> => {
  try {
    // Build search URL
    const keywords = preferences.keywords.join(' ');
    const location = preferences.location || '';
    const remote = preferences.isRemote ? 'remote' : '';
    
    // Using Indeed's public search (note: this may require scraping or a proxy service)
    const searchUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}${remote ? '&remotejob=1' : ''}`;
    
    // For now, return empty array - will need to implement scraping or use a proxy API
    // In production, you'd use a service like ScraperAPI, Bright Data, or similar
    console.log('Indeed search URL:', searchUrl);
    
    // TODO: Implement actual scraping or use proxy API
    return [];
  } catch (error) {
    console.error('Error searching Indeed:', error);
    return [];
  }
};

/**
 * Search LinkedIn jobs
 * Note: LinkedIn requires OAuth for API access, public search is limited
 */
const searchLinkedIn = async (
  preferences: JobSearchPreferences,
  _maxResults: number
): Promise<JobPosting[]> => {
  try {
    const keywords = preferences.keywords.join(' ');
    const location = preferences.location || '';
    
    // LinkedIn public search URL
    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}${preferences.isRemote ? '&f_WT=2' : ''}`;
    
    console.log('LinkedIn search URL:', searchUrl);
    
    // TODO: Implement scraping or use LinkedIn API with OAuth
    return [];
  } catch (error) {
    console.error('Error searching LinkedIn:', error);
    return [];
  }
};

/**
 * Search Glassdoor jobs
 */
const searchGlassdoor = async (
  preferences: JobSearchPreferences,
  _maxResults: number
): Promise<JobPosting[]> => {
  try {
    const keywords = preferences.keywords.join(' ');
    const location = preferences.location || '';
    
    const searchUrl = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(keywords)}&locT=C&locId=${encodeURIComponent(location)}`;
    
    console.log('Glassdoor search URL:', searchUrl);
    
    // TODO: Implement scraping or use Glassdoor API
    return [];
  } catch (error) {
    console.error('Error searching Glassdoor:', error);
    return [];
  }
};

/**
 * Remove duplicate job postings
 */
const removeDuplicates = (jobs: JobPosting[]): JobPosting[] => {
  const seen = new Set<string>();
  return jobs.filter(job => {
    const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/**
 * Calculate match score for a job posting based on preferences
 */
export const calculateMatchScore = (
  job: JobPosting,
  preferences: JobSearchPreferences
): number => {
  let score = 50; // Base score

  // Keyword matching
  const jobText = `${job.title} ${job.description} ${job.company}`.toLowerCase();
  const matchedKeywords = preferences.keywords.filter(keyword =>
    jobText.includes(keyword.toLowerCase())
  );
  score += (matchedKeywords.length / preferences.keywords.length) * 30;

  // Location matching
  if (preferences.location) {
    if (job.isRemote) {
      score += 10;
    } else if (job.location?.toLowerCase().includes(preferences.location.toLowerCase())) {
      score += 10;
    }
  }

  // Remote preference
  if (preferences.isRemote && job.isRemote) {
    score += 10;
  }

  // Salary matching
  if (preferences.salaryMin && job.salary?.min) {
    if (job.salary.min >= preferences.salaryMin) {
      score += 10;
    }
  }

  return Math.min(100, Math.max(0, score));
};

/**
 * Save a job posting to user's saved jobs
 */
export const saveJobPosting = async (userId: string, job: JobPosting): Promise<void> => {
  const jobRef = doc(db, 'users', userId, 'saved_jobs', job.id);
  
  await setDoc(jobRef, {
    ...job,
    userId,
    savedAt: Timestamp.now(),
    postedDate: job.postedDate ? Timestamp.fromDate(job.postedDate) : null,
    applicationDeadline: job.applicationDeadline ? Timestamp.fromDate(job.applicationDeadline) : null,
  });
};

/**
 * Get user's saved job postings
 */
export const getSavedJobPostings = async (userId: string): Promise<JobPosting[]> => {
  const jobsRef = collection(db, 'users', userId, 'saved_jobs');
  const q = query(jobsRef, orderBy('savedAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      savedAt: data.savedAt?.toDate(),
      postedDate: data.postedDate?.toDate(),
      applicationDeadline: data.applicationDeadline?.toDate(),
    } as JobPosting;
  });
};

/**
 * Delete a saved job posting
 */
export const deleteSavedJobPosting = async (userId: string, jobId: string): Promise<void> => {
  const jobRef = doc(db, 'users', userId, 'saved_jobs', jobId);
  await deleteDoc(jobRef);
};

/**
 * Create a job alert
 */
export const createJobAlert = async (userId: string, alert: Omit<JobAlert, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
  const alertsRef = collection(db, 'users', userId, 'job_alerts');
  const alertRef = doc(alertsRef);
  
  await setDoc(alertRef, {
    ...alert,
    userId,
    createdAt: Timestamp.now(),
    lastChecked: null,
    lastNotification: null,
  });

  return alertRef.id;
};

/**
 * Get user's job alerts
 */
export const getJobAlerts = async (userId: string): Promise<JobAlert[]> => {
  const alertsRef = collection(db, 'users', userId, 'job_alerts');
  const snapshot = await getDocs(alertsRef);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt.toDate(),
      lastChecked: data.lastChecked?.toDate(),
      lastNotification: data.lastNotification?.toDate(),
    } as JobAlert;
  });
};

/**
 * Update a job alert
 */
export const updateJobAlert = async (userId: string, alertId: string, updates: Partial<JobAlert>): Promise<void> => {
  const alertRef = doc(db, 'users', userId, 'job_alerts', alertId);
  
  const updateData: any = { ...updates };
  if (updates.lastChecked) {
    updateData.lastChecked = Timestamp.fromDate(updates.lastChecked);
  }
  if (updates.lastNotification) {
    updateData.lastNotification = Timestamp.fromDate(updates.lastNotification);
  }
  delete updateData.id;
  delete updateData.userId;
  delete updateData.createdAt;

  await setDoc(alertRef, updateData, { merge: true });
};

/**
 * Delete a job alert
 */
export const deleteJobAlert = async (userId: string, alertId: string): Promise<void> => {
  const alertRef = doc(db, 'users', userId, 'job_alerts', alertId);
  await deleteDoc(alertRef);
};

/**
 * Check for new jobs matching alerts and send notifications
 */
export const checkJobAlerts = async (userId: string): Promise<{ alertId: string; newJobs: JobPosting[] }[]> => {
  const alerts = await getJobAlerts(userId);
  const enabledAlerts = alerts.filter(a => a.enabled);
  
  const results: { alertId: string; newJobs: JobPosting[] }[] = [];

  for (const alert of enabledAlerts) {
    try {
      // Search for new jobs
      const jobs = await searchJobs(alert.preferences, 20);
      
      // Filter jobs posted after last check
      const lastCheck = alert.lastChecked || alert.createdAt;
      const newJobs = jobs.filter(job => {
        if (!job.postedDate) return true;
        return job.postedDate > lastCheck;
      });

      if (newJobs.length > 0) {
        results.push({ alertId: alert.id, newJobs });
        
        // Update last checked time
        await updateJobAlert(userId, alert.id, {
          lastChecked: new Date(),
          lastNotification: new Date(),
        });
      }
    } catch (error) {
      console.error(`Error checking alert ${alert.id}:`, error);
    }
  }

  return results;
};

