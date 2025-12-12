import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Use shared Functions instance configured with region

/**
 * Retry configuration for AI service calls
 */
interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [503, 429, 500, 502, 504], // Service Unavailable, Too Many Requests, Internal Server Error, Bad Gateway, Gateway Timeout
};

/**
 * Checks if an error is retryable based on status code
 */
function isRetryableError(error: any): boolean {
  const statusCode = error?.code || error?.status || error?.httpErrorCode?.status;
  return DEFAULT_RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
}

/**
 * Extracts error message from Firebase error
 */
function extractErrorMessage(error: any): string {
  if (error?.message) {
    // Check if it's a Firebase error with details
    if (error.details) {
      return error.details;
    }
    return error.message;
  }
  if (error?.code) {
    return `Errore ${error.code}`;
  }
  return 'Errore sconosciuto';
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff for Firebase Cloud Functions
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    initialDelay = DEFAULT_RETRY_CONFIG.initialDelay,
    maxDelay = DEFAULT_RETRY_CONFIG.maxDelay,
    backoffMultiplier = DEFAULT_RETRY_CONFIG.backoffMultiplier,
  } = config;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Only retry on retryable errors
      if (!isRetryableError(error)) {
        console.log(`Non-retryable error (${error?.code || 'unknown'}):`, error);
        break;
      }

      console.log(
        `Attempt ${attempt + 1} failed with retryable error. Retrying in ${delay}ms...`,
        { error: extractErrorMessage(error), code: error?.code }
      );

      // Wait before retrying with exponential backoff
      await sleep(Math.min(delay, maxDelay));
      delay *= backoffMultiplier;
    }
  }

  // All retries exhausted, throw the last error
  const errorMessage = extractErrorMessage(lastError);
  throw new Error(errorMessage || 'L\'API di AI è temporaneamente sovraccaricata. Riprova tra qualche secondo.');
}

/**
 * 1. CV Matcher - Analyzes how well a CV matches a job description
 * Returns a score (0-100) and detailed feedback
 */
export async function analyzeCVMatch(
  cvText: string,
  jobDescription: string,
  language?: string
): Promise<{
  score: number;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  summary: string;
}> {
  return withRetry(async () => {
    const analyzeCVMatchFn = httpsCallable(functions, 'analyzeCVMatch');
    const result = await analyzeCVMatchFn({ cvText, jobDescription, language });
    return result.data as any;
  }, {
    maxRetries: 3,
    initialDelay: 2000, // Start with 2 seconds for AI calls
    maxDelay: 15000, // Max 15 seconds between retries
  });
}

/**
 * 2. Cover Letter Generator - Generates personalized cover letter
 */
export async function generateCoverLetter(
  cvText: string,
  jobDescription: string,
  companyName: string,
  jobTitle: string,
  additionalInfo?: string,
  language?: string
): Promise<string> {
  return withRetry(async () => {
    const generateCoverLetterFn = httpsCallable(functions, 'generateCoverLetter');
    const result = await generateCoverLetterFn({ 
      cvText, 
      jobDescription, 
      companyName, 
      jobTitle, 
      additionalInfo,
      language
    });
    return (result.data as any).coverLetter;
  }, {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 15000,
  });
}

/**
 * 3. Job Description Analyzer - Extracts key requirements and skills
 */
export async function analyzeJobDescription(
  jobDescription: string,
  language?: string
): Promise<{
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: string;
  responsibilities: string[];
  qualifications: string[];
  salaryRange?: string;
  workType: string; // remote, hybrid, onsite
  summary: string;
}> {
  return withRetry(async () => {
    const analyzeJobDescriptionFn = httpsCallable(functions, 'analyzeJobDescription');
    const result = await analyzeJobDescriptionFn({ jobDescription, language });
    return result.data as any;
  }, {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 15000,
  });
}

/**
 * 4. Company Research - Gets information about a company
 */
export async function researchCompany(
  companyName: string,
  additionalContext?: string,
  language?: string
): Promise<{
  overview: string;
  industry: string;
  size: string;
  culture: string[];
  keyFacts: string[];
  interviewTips: string[];
}> {
  return withRetry(async () => {
    const researchCompanyFn = httpsCallable(functions, 'researchCompany');
    const result = await researchCompanyFn({ companyName, additionalContext, language });
    return result.data as any;
  }, {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 15000,
  });
}

/**
 * 5. Extract text from CV file URL (for PDF processing)
 * Note: This is a placeholder. In production, you'd use a PDF parsing library
 * or Firebase Cloud Function with PDF.js
 */
export async function extractCVText(_cvUrl: string): Promise<string> {
  // For now, return a placeholder
  // In production, implement PDF text extraction
  console.warn('CV text extraction not yet implemented. Please copy-paste CV text manually.');
  return '';
}

/**
 * Clear the cache (no-op for server-side functions)
 */
export function clearAICache(): void {
  console.log('AI cache is managed server-side');
}

/**
 * Get cache statistics (no-op for server-side functions)
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: 0,
    keys: [],
  };
}
