import { getUserCVs, deleteCV } from './cvService';
import { getUserApplications, getArchivedApplications } from './applicationService';
import { getApplicationFolderName, isApplicationFolder } from '../utils/documentFolders';
import type { CV } from '../types';

/**
 * Clean up orphaned application folders
 * Removes folders that belong to applications that don't exist anymore
 */
export const cleanupOrphanedFolders = async (userId: string): Promise<number> => {
  try {
    // Get all documents
    const allCVs = await getUserCVs(userId);
    
    // Get all applications (active and archived)
    const [activeApps, archivedApps] = await Promise.all([
      getUserApplications(userId),
      getArchivedApplications(userId)
    ]);
    const allApplications = [...activeApps, ...archivedApps];
    
    // Create a set of valid application folder names
    const validFolders = new Set<string>();
    allApplications.forEach(app => {
      const folderName = getApplicationFolderName(app);
      validFolders.add(folderName);
    });
    
    // Find documents in orphaned folders
    const orphanedDocuments: CV[] = [];
    allCVs.forEach(cv => {
      if (cv.folder && isApplicationFolder(cv.folder)) {
        // Check if this folder corresponds to an existing application
        if (!validFolders.has(cv.folder)) {
          orphanedDocuments.push(cv);
        }
      }
    });
    
    // Delete orphaned documents
    let deletedCount = 0;
    for (const doc of orphanedDocuments) {
      try {
        await deleteCV(doc);
        deletedCount++;
        console.log(`🗑️ Deleted orphaned document: ${doc.name} from folder: ${doc.folder}`);
      } catch (error) {
        console.error(`Error deleting orphaned document ${doc.id}:`, error);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} orphaned document(s) from non-existent application folders`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up orphaned folders:', error);
    return 0;
  }
};

/**
 * Clean up folder for a specific application that was cancelled
 * Called when user cancels application creation after saving documents
 */
export const cleanupFolderForCancelledApplication = async (
  userId: string,
  company: string,
  jobTitle: string
): Promise<number> => {
  try {
    const folderName = `${company} - ${jobTitle}`;
    
    // Check if application exists
    const [activeApps, archivedApps] = await Promise.all([
      getUserApplications(userId),
      getArchivedApplications(userId)
    ]);
    const allApplications = [...activeApps, ...archivedApps];
    
    const applicationExists = allApplications.some(app => 
      getApplicationFolderName(app) === folderName
    );
    
    // If application doesn't exist, delete all documents in this folder
    if (!applicationExists) {
      const allCVs = await getUserCVs(userId);
      const documentsInFolder = allCVs.filter(cv => cv.folder === folderName);
      
      let deletedCount = 0;
      for (const doc of documentsInFolder) {
        try {
          await deleteCV(doc);
          deletedCount++;
          console.log(`🗑️ Deleted document from cancelled application folder: ${doc.name}`);
        } catch (error) {
          console.error(`Error deleting document ${doc.id}:`, error);
        }
      }
      
      if (deletedCount > 0) {
        console.log(`✅ Cleaned up ${deletedCount} document(s) from cancelled application folder: ${folderName}`);
      }
      
      return deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('Error cleaning up folder for cancelled application:', error);
    return 0;
  }
};

