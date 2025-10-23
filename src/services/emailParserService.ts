import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GmailEmail, JobOfferFromEmail } from './gmailServiceClient';

// Initialize Gemini AI
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDQ8iw-kQf-Des8uPiQKZYgTcqPwoZcTaw';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Parse email to extract job offer information using AI
 */
export const parseJobOfferFromEmail = async (email: GmailEmail): Promise<JobOfferFromEmail | null> => {
  try {
    // Clean email body (remove HTML tags if present)
    const cleanBody = email.body
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    const emailContent = `
Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}

${cleanBody.substring(0, 5000)}`; // Limit to 5000 chars
    
    const prompt = `
Analyze this email and determine if it contains a job offer or job opportunity.

Email:
---
${emailContent}
---

If this email contains a job opportunity, extract the following information in JSON format:
{
  "isJobOffer": true,
  "company": "Company name",
  "jobTitle": "Position title",
  "location": "Location (if mentioned, otherwise leave empty)",
  "salary": "Salary range (if mentioned, otherwise leave empty)",
  "jobDescription": "Brief description of the role (max 500 characters)",
  "jobUrl": "Application link or job posting URL (if present, otherwise leave empty)",
  "confidence": 85,
  "reasoning": "Brief explanation of why this is considered a job offer"
}

If this email does NOT contain a job opportunity, respond with:
{
  "isJobOffer": false,
  "confidence": 90,
  "reasoning": "Brief explanation of why this is not a job offer"
}

Guidelines:
- Consider newsletters, automated emails, or promotional content as job offers if they contain specific job openings
- Job titles from companies like LinkedIn, Indeed, Glassdoor are valid
- Internal communications about open positions are valid
- General career advice emails are NOT job offers
- Marketing emails without specific positions are NOT job offers
- Be strict but not overly conservative

Respond ONLY with valid JSON, no additional text.
`;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // If not a job offer, return null
    if (!parsed.isJobOffer) {
      console.log(`Email ${email.id} is not a job offer: ${parsed.reasoning}`);
      return null;
    }
    
    // If confidence is too low, return null
    if (parsed.confidence < 60) {
      console.log(`Email ${email.id} has low confidence (${parsed.confidence}%): ${parsed.reasoning}`);
      return null;
    }
    
    // Return parsed job offer
    return {
      company: parsed.company || extractCompanyFromSender(email.from),
      jobTitle: parsed.jobTitle,
      location: parsed.location || undefined,
      salary: parsed.salary || undefined,
      jobDescription: parsed.jobDescription,
      jobUrl: parsed.jobUrl || undefined,
      source: 'email',
      emailId: email.id,
      emailSubject: email.subject,
      emailDate: email.date,
      confidence: parsed.confidence,
    };
    
  } catch (error: any) {
    console.error('Error parsing job offer from email:', error);
    throw new Error(`Failed to parse email: ${error.message}`);
  }
};

/**
 * Extract company name from email sender
 * e.g., "LinkedIn Jobs <jobs@linkedin.com>" => "LinkedIn"
 */
const extractCompanyFromSender = (from: string): string => {
  // Try to extract name before email
  const match = from.match(/^([^<]+)</);
  if (match) {
    return match[1].trim().replace(/Jobs?$/i, '').trim();
  }
  
  // Try to extract from email domain
  const emailMatch = from.match(/@([^.]+)\./);
  if (emailMatch) {
    const domain = emailMatch[1];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  
  return 'Unknown';
};

/**
 * Batch parse multiple emails
 */
export const parseMultipleEmails = async (
  emails: GmailEmail[],
  onProgress?: (current: number, total: number) => void
): Promise<JobOfferFromEmail[]> => {
  const jobOffers: JobOfferFromEmail[] = [];
  
  for (let i = 0; i < emails.length; i++) {
    if (onProgress) {
      onProgress(i + 1, emails.length);
    }
    
    try {
      const jobOffer = await parseJobOfferFromEmail(emails[i]);
      if (jobOffer) {
        jobOffers.push(jobOffer);
      }
    } catch (error) {
      console.error(`Failed to parse email ${emails[i].id}:`, error);
      // Continue with next email
    }
    
    // Rate limiting: wait 500ms between requests
    if (i < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return jobOffers;
};

/**
 * Categorize email based on content
 */
export const categorizeEmail = async (email: GmailEmail): Promise<string> => {
  try {
    const cleanBody = email.body.substring(0, 1000);
    
    const prompt = `
Categorize this email into ONE of these categories:
- "job_offer" - Direct job offer or specific position opening
- "job_alert" - Job search newsletter or aggregated listings
- "application_update" - Update on a job application
- "networking" - Invitation to connect or network
- "recruiter_outreach" - Message from recruiter
- "other" - None of the above

Email subject: ${email.subject}
Email snippet: ${cleanBody}

Respond with ONLY the category name, nothing else.
`;
    
    const result = await model.generateContent(prompt);
    const category = result.response.text().trim().toLowerCase();
    
    return category;
  } catch (error) {
    console.error('Error categorizing email:', error);
    return 'other';
  }
};

