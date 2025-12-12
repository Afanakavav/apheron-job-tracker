import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Application, ApplicationFormData, ApplicationEvent } from '../types';
import { linkCVToApplication } from './cvApplicationLinkService';
import { getCachedData, setCachedData, clearCache, CACHE_KEYS, CACHE_TTL } from './cacheService';
import { batchUpdateApplications, batchDelete } from './batchService';

const APPLICATIONS_COLLECTION = 'applications';

// Convertire Timestamp Firebase in Date (gestisce array e oggetti annidati)
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      // Converti Timestamp in Date
      converted[key] = converted[key].toDate();
    } else if (Array.isArray(converted[key])) {
      // Gestisci array (es: interviewDates, timeline)
      converted[key] = converted[key].map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return convertTimestamps(item); // Ricorsione per oggetti in array
        }
        return item;
      });
    } else if (typeof converted[key] === 'object' && converted[key] !== null && !(converted[key] instanceof Date)) {
      // Gestisci oggetti annidati
      converted[key] = convertTimestamps(converted[key]);
    }
  });
  return converted;
};

// Get all applications for a user
export const getUserApplications = async (userId: string, useCache: boolean = true): Promise<Application[]> => {
  // Check cache first
  if (useCache) {
    const cached = getCachedData<Application[]>(CACHE_KEYS.APPLICATIONS(userId));
    if (cached) {
      return cached;
    }
  }

  try {
    const q = query(
      collection(db, APPLICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const applications: Application[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      applications.push({
        id: doc.id,
        ...data,
      } as Application);
    });
    
    // Cache the result
    setCachedData(CACHE_KEYS.APPLICATIONS(userId), applications, CACHE_TTL.MEDIUM);
    
    return applications;
  } catch (error) {
    console.error('Error fetching applications:', error);
    // Fallback: se l'indice non è ancora pronto, ordina in memoria
    if (error instanceof Error && error.message.includes('index')) {
      const qFallback = query(
        collection(db, APPLICATIONS_COLLECTION),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(qFallback);
      const applications: Application[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = convertTimestamps(doc.data());
        applications.push({
          id: doc.id,
          ...data,
        } as Application);
      });
      
      // Sort in memory
      applications.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Cache the fallback result too
      setCachedData(CACHE_KEYS.APPLICATIONS(userId), applications, CACHE_TTL.MEDIUM);
      
      return applications;
    }
    throw error;
  }
};

// Get single application
export const getApplication = async (applicationId: string): Promise<Application | null> => {
  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, applicationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = convertTimestamps(docSnap.data());
      return {
        id: docSnap.id,
        ...data,
      } as Application;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching application:', error);
    throw error;
  }
};

// Create new application
export const createApplication = async (
  userId: string, 
  formData: ApplicationFormData
): Promise<string> => {
  try {
    // Invalidate cache
    clearCache(CACHE_KEYS.APPLICATIONS(userId));
    const now = new Date();
    const initialEvent: ApplicationEvent = {
      id: Date.now().toString(),
      type: 'status_change',
      description: `Candidatura creata con stato: ${formData.status}`,
      date: now,
    };

    // Clean formData: remove undefined values (Firestore doesn't accept them)
    const cleanedFormData: any = {};
    Object.keys(formData).forEach((key) => {
      const value = (formData as any)[key];
      // Only include defined values and non-empty strings
      if (value !== undefined && value !== '') {
        cleanedFormData[key] = value;
      }
    });

    const applicationData = {
      ...cleanedFormData,
      userId,
      timeline: [initialEvent],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, APPLICATIONS_COLLECTION), applicationData);
    
    // Link CV to application if provided
    if (formData.cvId) {
      await linkCVToApplication(formData.cvId, docRef.id);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating application:', error);
    throw error;
  }
};

// Update application
export const updateApplication = async (
  applicationId: string,
  updates: Partial<Application>
): Promise<void> => {
  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, applicationId);
    
    // Clean updates: remove undefined values (Firestore doesn't accept them)
    const cleanedUpdates: any = {
      updatedAt: serverTimestamp(),
    };
    
    Object.keys(updates).forEach((key) => {
      const value = (updates as any)[key];
      // Only include defined values
      if (value !== undefined) {
        cleanedUpdates[key] = value;
      }
    });
    
    await updateDoc(docRef, cleanedUpdates);
    
    // Link CV to application if cvId is updated
    if (updates.cvId) {
      await linkCVToApplication(updates.cvId, applicationId);
    }
  } catch (error) {
    console.error('Error updating application:', error);
    throw error;
  }
};

// Update application status
export const updateApplicationStatus = async (
  applicationId: string,
  newStatus: Application['status'],
  note?: string
): Promise<void> => {
  try {
    const application = await getApplication(applicationId);
    if (!application) throw new Error('Application not found');

    const statusEvent: ApplicationEvent = {
      id: Date.now().toString(),
      type: 'status_change',
      description: note || `Stato cambiato in: ${newStatus}`,
      date: new Date(),
    };

    const updatedTimeline = [...application.timeline, statusEvent];

    // Auto-set dates based on status
    const updates: any = {
      status: newStatus,
      timeline: updatedTimeline,
      updatedAt: serverTimestamp(),
    };

    // Auto-set appliedDate when status changes to 'applied'
    if (newStatus === 'applied' && !application.appliedDate) {
      updates.appliedDate = serverTimestamp();
    }

    // Auto-set offerDate when status changes to 'offer'
    if (newStatus === 'offer' && !application.offerDate) {
      updates.offerDate = serverTimestamp();
    }

    // Auto-set rejectedDate when status changes to 'rejected'
    if (newStatus === 'rejected' && !application.rejectedDate) {
      updates.rejectedDate = serverTimestamp();
    }

    await updateDoc(doc(db, APPLICATIONS_COLLECTION, applicationId), updates);
  } catch (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
};

// Archive application (soft delete)
export const archiveApplication = async (applicationId: string): Promise<void> => {
  try {
    const application = await getApplication(applicationId);
    if (!application) throw new Error('Application not found');

    // Ensure userId is present (critical for Firestore security rules)
    if (!application.userId) {
      throw new Error('Application missing userId - cannot archive');
    }

    // Move to archived collection - explicitly include userId to ensure it's present
    const archivedData: any = {
      ...application,
      userId: application.userId, // Explicitly set userId
      originalApplicationId: applicationId, // Save original ID for email cleanup
      archivedAt: serverTimestamp(),
    };

    // Remove id field (will be auto-generated in archived collection)
    delete archivedData.id;

    // Add to archived collection
    await addDoc(collection(db, 'archived_applications'), archivedData);

    // Delete from main collection
    await deleteDoc(doc(db, APPLICATIONS_COLLECTION, applicationId));
  } catch (error) {
    console.error('Error archiving application:', error);
    throw error;
  }
};

// Delete application permanently
export const deleteApplication = async (applicationId: string): Promise<void> => {
  try {
    // Invalidate cache
    const app = await getApplication(applicationId);
    if (app) {
      clearCache(CACHE_KEYS.APPLICATIONS(app.userId));
    }
    
    await deleteDoc(doc(db, APPLICATIONS_COLLECTION, applicationId));
  } catch (error) {
    console.error('Error deleting application:', error);
    throw error;
  }
};

// Get archived applications
export const getArchivedApplications = async (userId: string): Promise<Application[]> => {
  try {
    const q = query(
      collection(db, 'archived_applications'),
      where('userId', '==', userId),
      orderBy('archivedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const applications: Application[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      applications.push({
        id: doc.id,
        ...data,
      } as Application);
    });
    
    return applications;
  } catch (error) {
    console.error('Error fetching archived applications:', error);
    // Fallback without orderBy
    const qFallback = query(
      collection(db, 'archived_applications'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(qFallback);
    const applications: Application[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      applications.push({
        id: doc.id,
        ...data,
      } as Application);
    });
    
    return applications;
  }
};

// Get ALL archived applications (for cleanup - includes those without userId)
export const getAllArchivedApplications = async (): Promise<Application[]> => {
  try {
    // Try with orderBy first
    try {
      const q = query(
        collection(db, 'archived_applications'),
        orderBy('archivedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const applications: Application[] = [];
      
      querySnapshot.forEach((doc) => {
        try {
          const data = convertTimestamps(doc.data());
          applications.push({
            id: doc.id,
            ...data,
          } as Application);
        } catch (err) {
          console.warn('Error converting archived application:', doc.id, err);
          // Still include it with minimal data for deletion
          applications.push({
            id: doc.id,
            jobTitle: 'Unknown',
            company: 'Unknown',
          } as Application);
        }
      });
      
      return applications;
    } catch (orderByError) {
      // If orderBy fails (e.g., missing archivedAt field), try without it
      console.warn('orderBy failed, trying without:', orderByError);
      const qFallback = query(collection(db, 'archived_applications'));
      const querySnapshot = await getDocs(qFallback);
      const applications: Application[] = [];
      
      querySnapshot.forEach((doc) => {
        try {
          const data = convertTimestamps(doc.data());
          applications.push({
            id: doc.id,
            ...data,
          } as Application);
        } catch (err) {
          console.warn('Error converting archived application:', doc.id, err);
          // Still include it with minimal data for deletion
          applications.push({
            id: doc.id,
            jobTitle: 'Unknown',
            company: 'Unknown',
          } as Application);
        }
      });
      
      return applications;
    }
  } catch (error) {
    console.error('Error fetching all archived applications:', error);
    throw error;
  }
};

// Force delete all archived applications (cleanup function for old data)
// Uses Cloud Function to bypass Firestore security rules
export const forceDeleteAllArchivedApplications = async (): Promise<{ deleted: number; errors: number }> => {
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('./firebase');
    
    const cleanupFn = httpsCallable(functions, 'cleanupArchivedApplications');
    const result = await cleanupFn();
    
    const data = result.data as any;
    return {
      deleted: data.deleted || 0,
      errors: data.errors || 0,
    };
  } catch (error) {
    console.error('Error in forceDeleteAllArchivedApplications:', error);
    throw error;
  }
};

// Restore archived application
export const restoreApplication = async (archivedId: string, userId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'archived_applications', archivedId);
    
    // Try to read the document - Firestore rules will check userId
    let docSnap;
    try {
      docSnap = await getDoc(docRef);
    } catch (readError: any) {
      // If read fails due to permissions, the document might not have userId or has wrong userId
      console.error('Error reading archived application (permission issue):', readError);
      if (readError.code === 'permission-denied' || readError.message?.includes('permission')) {
        throw new Error('Permission denied: This archived application does not belong to you or is missing userId. Cannot restore.');
      }
      throw readError;
    }
    
    if (!docSnap.exists()) {
      throw new Error('Archived application not found');
    }

    const data = convertTimestamps(docSnap.data());
    
    // Verify userId matches (security check before operations)
    const archivedUserId = data?.userId;
    
    // Migration: if userId is missing, treat as belonging to current user (old archived documents)
    // We'll add userId when restoring to main collection
    if (archivedUserId && archivedUserId !== userId) {
      throw new Error('Permission denied: This archived application does not belong to you');
    }

    // Remove archived-specific fields
    delete (data as any).archivedAt;
    delete (data as any).id; // Remove id field as it will be auto-generated

    // Clean data: remove undefined values and empty strings (except for essential fields)
    const cleanedData: any = {};
    Object.keys(data).forEach((key) => {
      const value = (data as any)[key];
      // Keep all defined values except empty strings (but keep empty arrays and empty objects)
      if (value !== undefined && value !== null) {
        if (typeof value === 'string' && value === '' && key !== 'userId') {
          // Skip empty strings except for userId
          return;
        }
        cleanedData[key] = value;
      }
    });

    // CRITICAL: Override userId with current authenticated user
    cleanedData.userId = userId;
    
    // Set status to "rejected" (Eliminata) when restored
    cleanedData.status = 'rejected';
    
    // Set rejectedDate to now
    cleanedData.rejectedDate = new Date();

    // Restore to main collection
    await addDoc(collection(db, APPLICATIONS_COLLECTION), {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    });

    // Delete from archived (this will pass security rules since userId matches)
    try {
      await deleteDoc(docRef);
    } catch (deleteError: any) {
      // If delete fails, log but don't fail the restore (application is already restored)
      console.error('Warning: Failed to delete from archived after restore:', deleteError);
      // Don't throw - the application is already restored successfully
    }
  } catch (error) {
    console.error('Error restoring application:', error);
    throw error;
  }
};

// Delete archived application permanently
export const deleteArchivedApplication = async (archivedId: string, userId: string): Promise<void> => {
  try {
    // First verify the document exists and belongs to the user (security check)
    const docRef = doc(db, 'archived_applications', archivedId);
    
    // Try to read the document - Firestore rules will check userId
    let docSnap;
    try {
      docSnap = await getDoc(docRef);
    } catch (readError: any) {
      // If read fails due to permissions, the document might not have userId or has wrong userId
      console.error('Error reading archived application (permission issue):', readError);
      if (readError.code === 'permission-denied' || readError.message?.includes('permission')) {
        throw new Error('Permission denied: This archived application does not belong to you or is missing userId. Cannot delete.');
      }
      throw readError;
    }
    
    if (!docSnap.exists()) {
      throw new Error('Archived application not found');
    }

    const data = docSnap.data();
    const archivedUserId = data?.userId;
    
    // Verify userId matches (security check before delete)
    // If userId is missing, allow delete (for old archived documents - migration case)
    if (archivedUserId && archivedUserId !== userId) {
      throw new Error('Permission denied: This archived application does not belong to you');
    }
    
    // Migration note: if userId is missing, we'll allow delete (Firestore rules permit this)
    if (!archivedUserId) {
      console.warn('Archived application missing userId - allowing delete for migration:', archivedId);
    }

    // Delete from archived (this will pass security rules since userId matches)
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting archived application:', error);
    throw error;
  }
};

// Add event to timeline
export const addTimelineEvent = async (
  applicationId: string,
  event: Omit<ApplicationEvent, 'id'>
): Promise<void> => {
  try {
    const application = await getApplication(applicationId);
    if (!application) throw new Error('Application not found');

    const newEvent: ApplicationEvent = {
      ...event,
      id: Date.now().toString(),
    };

    const updatedTimeline = [...application.timeline, newEvent];

    await updateDoc(doc(db, APPLICATIONS_COLLECTION, applicationId), {
      timeline: updatedTimeline,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding timeline event:', error);
    throw error;
  }
};

// ========== BATCH OPERATIONS ==========

/**
 * Batch archive multiple applications
 * Uses Firestore batch writes for better performance
 */
export const batchArchiveApplications = async (
  applicationIds: string[],
  userId: string
): Promise<void> => {
  if (applicationIds.length === 0) return;

  try {
    // Fetch all applications first
    const applications = await Promise.all(
      applicationIds.map(id => getApplication(id))
    );

    // Filter out null applications and ensure userId matches
    const validApplications = applications.filter(
      (app): app is Application => 
        app !== null && 
        app.userId === userId &&
        app.userId !== undefined
    );

    if (validApplications.length === 0) {
      throw new Error('No valid applications to archive');
    }

    // Use batch write for better performance
    const batch = writeBatch(db);
    const archivedCollection = collection(db, 'archived_applications');

    for (const application of validApplications) {
      // Create archived document
      const archivedData: any = {
        ...application,
        userId: application.userId,
        originalApplicationId: application.id,
        archivedAt: serverTimestamp(),
      };
      delete archivedData.id;

      const archivedRef = doc(archivedCollection);
      batch.set(archivedRef, archivedData);

      // Delete from main collection
      const appRef = doc(db, APPLICATIONS_COLLECTION, application.id);
      batch.delete(appRef);
    }

    await batch.commit();

    // Clear cache
    clearCache(CACHE_KEYS.APPLICATIONS(userId));
  } catch (error) {
    console.error('Error batch archiving applications:', error);
    throw error;
  }
};

/**
 * Batch delete multiple applications
 * Uses Firestore batch writes for better performance
 */
export const batchDeleteApplications = async (
  applicationIds: string[],
  userId: string
): Promise<void> => {
  if (applicationIds.length === 0) return;

  try {
    // Verify all applications belong to the user
    const applications = await Promise.all(
      applicationIds.map(id => getApplication(id))
    );

    const validIds = applications
      .map((app, index) => app?.userId === userId ? applicationIds[index] : null)
      .filter((id): id is string => id !== null);

    if (validIds.length === 0) {
      throw new Error('No valid applications to delete');
    }

    // Use batch delete
    await batchDelete(APPLICATIONS_COLLECTION, validIds);

    // Clear cache
    clearCache(CACHE_KEYS.APPLICATIONS(userId));
  } catch (error) {
    console.error('Error batch deleting applications:', error);
    throw error;
  }
};

/**
 * Batch update status of multiple applications
 * Uses Firestore batch writes for better performance
 */
export const batchUpdateApplicationStatus = async (
  applicationIds: string[],
  newStatus: Application['status'],
  userId: string,
  note?: string
): Promise<void> => {
  if (applicationIds.length === 0) return;

  try {
    // Fetch all applications
    const applications = await Promise.all(
      applicationIds.map(id => getApplication(id))
    );

    // Filter valid applications
    const validApplications = applications.filter(
      (app): app is Application => 
        app !== null && 
        app.userId === userId
    );

    if (validApplications.length === 0) {
      throw new Error('No valid applications to update');
    }

    // Prepare batch updates
    const updates = validApplications.map((application) => {
      const statusEvent: ApplicationEvent = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'status_change',
        description: note || `Stato cambiato in: ${newStatus}`,
        date: new Date(),
      };

      const updatedTimeline = [...application.timeline, statusEvent];

      const updateData: any = {
        status: newStatus,
        timeline: updatedTimeline,
        updatedAt: serverTimestamp(),
      };

      // Auto-set dates based on status
      if (newStatus === 'applied' && !application.appliedDate) {
        updateData.appliedDate = serverTimestamp();
      }
      if (newStatus === 'offer' && !application.offerDate) {
        updateData.offerDate = serverTimestamp();
      }
      if (newStatus === 'rejected' && !application.rejectedDate) {
        updateData.rejectedDate = serverTimestamp();
      }

      return {
        id: application.id,
        data: updateData,
      };
    });

    // Use batch update
    await batchUpdateApplications(updates);

    // Clear cache
    clearCache(CACHE_KEYS.APPLICATIONS(userId));
  } catch (error) {
    console.error('Error batch updating application status:', error);
    throw error;
  }
};

