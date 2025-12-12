import { db } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, query, where, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
import type { JobOfferFromEmail } from './gmailServiceClient';

// Gmail Settings Interface
export interface GmailSettings {
  autoScanEnabled: boolean;
  autoScanTime: string; // Format: "HH:MM" (e.g., "09:00")
  lastScanTimestamp: number | null;
}

// Import History Interface
export interface ImportHistoryEntry {
  id?: string;
  company: string;
  jobTitle: string;
  emailSubject: string;
  emailDate: Date;
  importedAt: Date;
  confidence: number;
  source: 'email';
  applicationId?: string; // Reference to created application
}

/**
 * Get user's Gmail settings
 */
export const getGmailSettings = async (userId: string): Promise<GmailSettings> => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'gmail');
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
      return settingsSnap.data() as GmailSettings;
    }

    // Default settings
    return {
      autoScanEnabled: false,
      autoScanTime: '09:00',
      lastScanTimestamp: null,
    };
  } catch (error) {
    console.error('Error getting Gmail settings:', error);
    throw error;
  }
};

/**
 * Update user's Gmail settings
 */
export const updateGmailSettings = async (
  userId: string,
  settings: Partial<GmailSettings>
): Promise<void> => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'gmail');
    await setDoc(settingsRef, settings, { merge: true });
  } catch (error) {
    console.error('Error updating Gmail settings:', error);
    throw error;
  }
};

/**
 * Update last scan timestamp
 */
export const updateLastScanTimestamp = async (userId: string): Promise<void> => {
  try {
    await updateGmailSettings(userId, {
      lastScanTimestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error updating last scan timestamp:', error);
    throw error;
  }
};

/**
 * Check if auto-scan should run (returns true if scan time has passed since last scan)
 */
export const shouldAutoScan = async (userId: string): Promise<boolean> => {
  try {
    const settings = await getGmailSettings(userId);

    if (!settings.autoScanEnabled) {
      return false;
    }

    const now = new Date();
    const [targetHour, targetMinute] = settings.autoScanTime.split(':').map(Number);

    // Create target time for today
    const targetTime = new Date();
    targetTime.setHours(targetHour, targetMinute, 0, 0);

    // If last scan was null or more than 12 hours ago, and current time >= target time
    if (!settings.lastScanTimestamp) {
      return now >= targetTime;
    }

    const lastScanDate = new Date(settings.lastScanTimestamp);

    // Check if last scan was before today's target time and now is after target time
    const lastScanBeforeTarget = lastScanDate < targetTime;
    const nowAfterTarget = now >= targetTime;

    return lastScanBeforeTarget && nowAfterTarget;
  } catch (error) {
    console.error('Error checking auto-scan:', error);
    return false;
  }
};

/**
 * Add job offer to import history
 */
export const addToImportHistory = async (
  userId: string,
  jobOffer: JobOfferFromEmail,
  applicationId?: string
): Promise<void> => {
  try {
    const historyRef = collection(db, 'users', userId, 'import_history');

    const historyEntry: ImportHistoryEntry = {
      company: jobOffer.company,
      jobTitle: jobOffer.jobTitle,
      emailSubject: jobOffer.emailSubject,
      emailDate: jobOffer.emailDate,
      importedAt: new Date(),
      confidence: jobOffer.confidence,
      source: 'email',
      applicationId,
    };

    await addDoc(historyRef, historyEntry);
  } catch (error) {
    console.error('Error adding to import history:', error);
    throw error;
  }
};

/**
 * Get import history (most recent first)
 */
export const getImportHistory = async (
  userId: string,
  limitCount: number = 50
): Promise<ImportHistoryEntry[]> => {
  try {
    const historyRef = collection(db, 'users', userId, 'import_history');
    const q = query(historyRef, orderBy('importedAt', 'desc'), limit(limitCount));

    const snapshot = await getDocs(q);

    const history: ImportHistoryEntry[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        company: data.company,
        jobTitle: data.jobTitle,
        emailSubject: data.emailSubject,
        emailDate: data.emailDate?.toDate ? data.emailDate.toDate() : new Date(data.emailDate),
        importedAt: data.importedAt?.toDate ? data.importedAt.toDate() : new Date(data.importedAt),
        confidence: data.confidence,
        source: data.source,
        applicationId: data.applicationId,
      });
    });

    return history;
  } catch (error) {
    console.error('Error getting import history:', error);
    // Fallback: return empty array if there's an index error
    if ((error as any)?.code === 'failed-precondition') {
      console.warn('Firestore index not ready for import_history. Returning empty array.');
      return [];
    }
    throw error;
  }
};

/**
 * Delete an entry from import history
 */
export const deleteImportHistoryEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  try {
    const entryRef = doc(db, 'users', userId, 'import_history', entryId);
    await deleteDoc(entryRef);
  } catch (error) {
    console.error('Error deleting import history entry:', error);
    throw error;
  }
};

/**
 * Check if job offer was already imported (to avoid duplicates)
 */
export const wasJobOfferImported = async (
  userId: string,
  emailSubject: string,
  jobTitle: string
): Promise<boolean> => {
  try {
    const historyRef = collection(db, 'users', userId, 'import_history');
    const q = query(
      historyRef,
      where('emailSubject', '==', emailSubject),
      where('jobTitle', '==', jobTitle),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking import history:', error);
    return false; // Default to false if error
  }
};

