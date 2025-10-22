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
export interface CV {
  id: string;
  userId: string;
  name: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  tags: string[];
  category?: string; // es: "Tech", "Marketing", "General"
  version: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== APPLICATION TYPES ====================
export type ApplicationStatus = 
  | 'saved' 
  | 'applied' 
  | 'phone_screen' 
  | 'interview' 
  | 'technical' 
  | 'offer' 
  | 'rejected' 
  | 'withdrawn'
  | 'archived';

export type JobSource = 
  | 'linkedin' 
  | 'indeed' 
  | 'glassdoor' 
  | 'company_website' 
  | 'referral' 
  | 'recruiter' 
  | 'other';

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
  coverLetter?: string;
  
  // Contacts
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterLinkedin?: string;
  
  // Dates
  appliedDate?: Date;
  lastFollowUpDate?: Date;
  nextFollowUpDate?: Date;
  responseDate?: Date;
  interviewDate?: Date;
  offerDate?: Date;
  
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
export interface Contact {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  company?: string;
  role?: string;
  type: 'recruiter' | 'hiring_manager' | 'referral' | 'other';
  notes?: string;
  tags: string[];
  lastContactDate?: Date;
  createdAt: Date;
  updatedAt: Date;
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
  status: ApplicationStatus;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  tags: string[];
}


