import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const CVS_COLLECTION = 'cvs';

/**
 * Link a CV to an application
 */
export const linkCVToApplication = async (cvId: string, applicationId: string): Promise<void> => {
  try {
    const cvRef = doc(db, CVS_COLLECTION, cvId);
    
    await updateDoc(cvRef, {
      applicationIds: arrayUnion(applicationId),
    });
    
    console.log(`CV ${cvId} linked to application ${applicationId}`);
  } catch (error) {
    console.error('Error linking CV to application:', error);
    // Don't throw - this is a non-critical operation
  }
};

/**
 * Get application IDs for a CV
 */
export const getCVApplications = async (cvId: string): Promise<string[]> => {
  try {
    const cvRef = doc(db, CVS_COLLECTION, cvId);
    const cvSnap = await getDoc(cvRef);
    
    if (cvSnap.exists()) {
      const data = cvSnap.data();
      return data.applicationIds || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting CV applications:', error);
    return [];
  }
};

