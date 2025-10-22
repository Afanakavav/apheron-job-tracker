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
} from 'firebase/firestore';
import { db } from './firebase';
import type { Application, ApplicationFormData, ApplicationEvent } from '../types';

const APPLICATIONS_COLLECTION = 'applications';

// Convertire Timestamp Firebase in Date
const convertTimestamps = (data: any): any => {
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted;
};

// Get all applications for a user
export const getUserApplications = async (userId: string): Promise<Application[]> => {
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
    const now = new Date();
    const initialEvent: ApplicationEvent = {
      id: Date.now().toString(),
      type: 'status_change',
      description: `Candidatura creata con stato: ${formData.status}`,
      date: now,
    };

    const applicationData = {
      ...formData,
      userId,
      timeline: [initialEvent],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, APPLICATIONS_COLLECTION), applicationData);
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
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
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

    await updateDoc(doc(db, APPLICATIONS_COLLECTION, applicationId), {
      status: newStatus,
      timeline: updatedTimeline,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    throw error;
  }
};

// Delete application
export const deleteApplication = async (applicationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, APPLICATIONS_COLLECTION, applicationId));
  } catch (error) {
    console.error('Error deleting application:', error);
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

