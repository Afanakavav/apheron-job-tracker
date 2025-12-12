// ==================== JOB SEARCH TYPES ====================
export interface JobPosting {
  id: string;
  userId?: string; // Only if saved by user
  title: string;
  company: string;
  location?: string;
  isRemote?: boolean;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  description: string;
  requirements?: string[];
  benefits?: string[];
  jobUrl: string;
  source: 'linkedin' | 'indeed' | 'glassdoor' | 'manual' | 'other';
  postedDate?: Date;
  applicationDeadline?: Date;
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary';
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  savedAt?: Date;
  appliedAt?: Date;
  applicationId?: string; // Link to Application if user applied
  tags?: string[];
  matchScore?: number; // 0-100, how well it matches user preferences
  notes?: string;
}

export interface JobSearchPreferences {
  keywords: string[];
  location?: string;
  isRemote?: boolean;
  salaryMin?: number;
  salaryCurrency?: string;
  employmentType?: ('full-time' | 'part-time' | 'contract' | 'internship')[];
  experienceLevel?: ('entry' | 'mid' | 'senior' | 'executive')[];
  industries?: string[];
  companies?: string[];
  excludeCompanies?: string[];
  alertEnabled?: boolean;
  alertFrequency?: 'daily' | 'weekly' | 'realtime';
}

export interface JobAlert {
  id: string;
  userId: string;
  name: string;
  preferences: JobSearchPreferences;
  lastChecked?: Date;
  lastNotification?: Date;
  enabled: boolean;
  createdAt: Date;
}

// ==================== USER TYPES ====================
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  settings?: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  emailNotifications: boolean;
  reminderDays: number; // giorni dopo cui ricordare follow-up
  weeklyGoal: number; // numero candidature settimanali
}

// ==================== CV TYPES ====================
export interface CVVersion {
  version: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  savedAt: Date;
}

// Folder types for document organization
export type DocumentFolder = 
  | 'CV'
  | 'Cover Letter'
  | 'Documenti generali'
  | 'Documenti AI'
  | string; // Application folder format: "{company} - {jobTitle}"

export interface CV {
  id: string;
  userId: string;
  name: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  tags: string[];
  category?: string; // es: "Tech", "Marketing", "General"
  folder: DocumentFolder; // Folder where document is stored (required)
  version: number;
  description?: string;
  applicationIds?: string[]; // IDs of applications this CV was used for
  versions?: CVVersion[]; // Array di versioni precedenti (max 5)
  createdAt: Date;
  updatedAt: Date;
}

// ==================== APPLICATION TYPES ====================
export type ApplicationStatus = 
  | 'saved' 
  | 'applied' 
  | 'interview_1' 
  | 'interview_2' 
  | 'interview_3' 
  | 'interview_4' 
  | 'offer' 
  | 'rejected';

export type JobSource = 
  | 'linkedin' 
  | 'indeed' 
  | 'glassdoor' 
  | 'company_website' 
  | 'referral' 
  | 'recruiter' 
  | 'email'
  | 'other';

export interface InterviewDate {
  date: Date;
  type: 'interview_1' | 'interview_2' | 'interview_3' | 'interview_4'; // Maps to ApplicationStatus
  notes?: string;
  googleCalendarEventId?: string; // ID of the event in Google Calendar (if synced)
}

export interface Application {
  id: string;
  userId: string;
  
  // Job Info
  jobTitle: string;
  company: string;
  companyId?: string; // reference to companies collection
  location: string;
  isRemote: boolean;
  jobUrl?: string;
  jobDescription?: string;
  
  // Salary
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  
  // Application Details
  status: ApplicationStatus;
  source: JobSource;
  cvId?: string; // quale CV è stato usato
  coverLetter?: string; // Testo della cover letter (legacy)
  coverLetterId?: string; // ID della Cover Letter da CV Manager
  
  // Contacts
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterLinkedin?: string;
  companyEmail?: string; // Company contact email for applications
  
  // Dates
  appliedDate?: Date; // Auto-set when status changes to 'applied'
  followUpEnabled?: boolean; // User-controlled follow-up toggle
  lastFollowUpDate?: Date;
  nextFollowUpDate?: Date;
  responseDate?: Date;
  interviewDate?: Date; // Deprecated, use interviewDates
  interviewDates?: InterviewDate[]; // Multiple interview dates
  offerDate?: Date; // Auto-set when status changes to 'offer'
  rejectedDate?: Date; // Auto-set when status changes to 'rejected'
  
  // Notes & Tags
  notes?: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  
  // AI Insights
  matchScore?: number; // 0-100 quanto il CV matcha con job description
  aiNotes?: string;
  
  // Timeline
  timeline: ApplicationEvent[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationEvent {
  id: string;
  type: 'status_change' | 'email_received' | 'email_sent' | 'note_added' | 'interview_scheduled';
  description: string;
  date: Date;
  metadata?: Record<string, any>;
}

// ==================== COMPANY TYPES ====================
export interface Company {
  id: string;
  userId: string;
  name: string;
  website?: string;
  industry?: string;
  size?: string; // "1-10", "11-50", "51-200", etc.
  location?: string;
  description?: string;
  culture?: string;
  glassdoorRating?: number;
  linkedinUrl?: string;
  isBlacklisted: boolean;
  notes?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== CONTACT TYPES ====================
export type ContactType = 'recruiter' | 'hiring_manager' | 'referral' | 'hr' | 'other';

export interface Contact {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  company?: string;
  role?: string;
  type: ContactType;
  tags: string[];
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  followUpReminderDays?: number; // Days after last contact to remind (default: 14)
  applicationIds?: string[]; // Linked applications
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactNote {
  id: string;
  contactId: string;
  userId: string;
  content: string;
  createdAt: Date;
  createdBy: string; // userId
}

export type NetworkingEventType = 
  | 'meeting'
  | 'email_sent'
  | 'email_received'
  | 'phone_call'
  | 'referral_given'
  | 'referral_received'
  | 'event_attended'
  | 'coffee_chat'
  | 'other';

export interface NetworkingEvent {
  id: string;
  contactId: string;
  userId: string;
  type: NetworkingEventType;
  title: string;
  description?: string;
  date: Date;
  location?: string;
  linkedApplicationId?: string; // If related to an application
  metadata?: Record<string, any>; // Additional data
  createdAt: Date;
}

export interface ContactImport {
  id: string;
  userId: string;
  source: 'linkedin' | 'manual' | 'csv';
  contactsImported: number;
  contactsSkipped: number;
  errors?: string[];
  createdAt: Date;
}

// ==================== TEMPLATE TYPES ====================
export interface Template {
  id: string;
  userId: string;
  name: string;
  type: 'cover_letter' | 'email' | 'thank_you';
  content: string;
  tags: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== SEARCH TYPES ====================
export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  keywords: string;
  location?: string;
  isRemote?: boolean;
  sources: JobSource[];
  salaryMin?: number;
  isActive: boolean; // se attivo, cerca automaticamente
  lastRunDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== ANALYTICS TYPES ====================
export interface Analytics {
  totalApplications: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  applicationsBySource: Record<JobSource, number>;
  averageResponseTime: number; // in days
  conversionRate: {
    appliedToInterview: number;
    interviewToOffer: number;
  };
  thisWeekApplications: number;
  thisMonthApplications: number;
}

// ==================== SENT EMAIL TYPES ====================
export interface SentEmail {
  id: string;
  userId: string;
  applicationId?: string; // ID of the related application (if any)
  to: string; // Recipient email
  subject: string;
  body: string;
  attachmentNames: string[]; // Names of attached files
  emailType?: 'application' | 'confirmation' | 'interview_feedback' | 'feedback_request' | 'offer_accepted' | 'offer_declined';
  sentAt: Date;
  createdAt: Date;
}

// ==================== FORM TYPES ====================
export interface ApplicationFormData {
  jobTitle: string;
  company: string;
  location: string;
  isRemote: boolean;
  jobUrl?: string;
  jobDescription?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  source: JobSource;
  cvId?: string;
  coverLetterId?: string;
  status: ApplicationStatus;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  tags: string[];
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterLinkedin?: string;
  companyEmail?: string; // Company contact email
  followUpEnabled?: boolean; // Follow-up toggle
  nextFollowUpDate?: Date; // Next follow-up date
}


