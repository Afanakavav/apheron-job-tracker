import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Application } from '../types';

/**
 * Get applications that used a specific CV or Cover Letter
 * @param documentId - ID of the CV or Cover Letter
 * @param userId - ID of the user (required for Firestore security rules)
 */
export const getApplicationsByCV = async (documentId: string, userId: string): Promise<Application[]> => {
  try {
    // Query applications where this document is used as CV
    const cvQuery = query(
      collection(db, 'applications'),
      where('userId', '==', userId),
      where('cvId', '==', documentId)
    );

    // Query applications where this document is used as Cover Letter
    const coverLetterQuery = query(
      collection(db, 'applications'),
      where('userId', '==', userId),
      where('coverLetterId', '==', documentId)
    );

    // Execute both queries in parallel
    const [cvSnapshot, coverLetterSnapshot] = await Promise.all([
      getDocs(cvQuery),
      getDocs(coverLetterQuery)
    ]);

    const applications: Application[] = [];
    const seenIds = new Set<string>();

    // Helper function to safely convert Firestore Timestamp to Date
    const toDate = (value: any): Date | undefined => {
      if (!value) return undefined;
      if (value instanceof Date) return value;
      if (value.toDate && typeof value.toDate === 'function') {
        try {
          return value.toDate();
        } catch (e) {
          console.warn('Error converting timestamp to date:', e);
          return undefined;
        }
      }
      if (typeof value === 'string' || typeof value === 'number') {
        return new Date(value);
      }
      return undefined;
    };

    // Process CV results
    cvSnapshot.forEach((doc) => {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        const data = doc.data();
        applications.push({
          id: doc.id,
          ...data,
          appliedDate: toDate(data.appliedDate),
          createdAt: toDate(data.createdAt) || new Date(),
          updatedAt: toDate(data.updatedAt) || new Date(),
        } as Application);
      }
    });

    // Process Cover Letter results
    coverLetterSnapshot.forEach((doc) => {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        const data = doc.data();
        applications.push({
          id: doc.id,
          ...data,
          appliedDate: toDate(data.appliedDate),
          createdAt: toDate(data.createdAt) || new Date(),
          updatedAt: toDate(data.updatedAt) || new Date(),
        } as Application);
      }
    });

    return applications;
  } catch (error) {
    console.error('Error getting applications by CV/Cover Letter:', error);
    return [];
  }
};

/**
 * Get usage statistics for a CV
 */
export interface CVUsageStats {
  totalApplications: number;
  companies: string[];
  positions: string[];
  lastUsedDate?: Date;
  successRate: number; // percentage of applications that led to interviews or offers
}

export const getCVUsageStats = async (cvId: string, userId: string): Promise<CVUsageStats> => {
  try {
    const applications = await getApplicationsByCV(cvId, userId);

    const companies = [...new Set(applications.map(app => app.company))];
    const positions = [...new Set(applications.map(app => app.jobTitle))];
    
    const lastUsedDate = applications.length > 0
      ? new Date(Math.max(...applications.map(app => app.appliedDate?.getTime() || 0)))
      : undefined;

    // Calculate success rate (interview stages, offer)
    const successfulApps = applications.filter(app => 
      ['interview_1', 'interview_2', 'interview_3', 'interview_4', 'offer'].includes(app.status)
    ).length;
    
    const successRate = applications.length > 0
      ? (successfulApps / applications.length) * 100
      : 0;

    return {
      totalApplications: applications.length,
      companies,
      positions,
      lastUsedDate,
      successRate,
    };
  } catch (error) {
    console.error('Error getting CV usage stats:', error);
    return {
      totalApplications: 0,
      companies: [],
      positions: [],
      successRate: 0,
    };
  }
};

