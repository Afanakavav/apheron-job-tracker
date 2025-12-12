import { getUserApplications } from '../services/applicationService';
import { getAIDocumentColor } from './aiDocumentColors';
import type { Application, DocumentFolder, CV, ApplicationStatus } from '../types';

/**
 * Standard folders available for document organization
 */
export const STANDARD_FOLDERS: DocumentFolder[] = [
  'CV',
  'Cover Letter',
  'Documenti generali',
  'Documenti AI',
];

/**
 * Generate folder name for an application
 */
export const getApplicationFolderName = (application: Application): string => {
  return `${application.company} - ${application.jobTitle}`;
};

/**
 * Check if a folder is an application folder (not a standard folder)
 */
export const isApplicationFolder = (folder: string | null | undefined): boolean => {
  if (!folder) return false;
  // Application folders contain " - " and are not standard folders
  return folder.includes(' - ') && !STANDARD_FOLDERS.includes(folder as DocumentFolder);
};

/**
 * Get all available folders (standard + application folders)
 */
export const getAvailableFolders = async (userId: string): Promise<DocumentFolder[]> => {
  try {
    // Start with standard folders
    const folders: DocumentFolder[] = [...STANDARD_FOLDERS];
    
    // Fetch all applications to create application-specific folders
    const applications = await getUserApplications(userId);
    
    // Create a folder for each application
    applications.forEach((app) => {
      const folderName = getApplicationFolderName(app);
      folders.push(folderName);
    });
    
    return folders;
  } catch (error) {
    console.error('Error fetching available folders:', error);
    // Return at least standard folders on error
    return STANDARD_FOLDERS;
  }
};

/**
 * Get default folder based on category
 */
export const getDefaultFolderForCategory = (category?: string): DocumentFolder => {
  if (category === 'CV') return 'CV';
  if (category === 'Cover Letter') return 'Cover Letter';
  return 'Documenti generali';
};

/**
 * Get status color based on application status
 * Colors match the Kanban board column colors
 */
export const getStatusColor = (status: ApplicationStatus): string => {
  const statusColors: Record<ApplicationStatus, string> = {
    'saved': '#9e9e9e',      // Grigio
    'applied': '#2196f3',    // Blu
    'interview_1': '#ff9800', // Arancione
    'interview_2': '#9c27b0', // Viola
    'interview_3': '#673ab7', // Viola scuro
    'interview_4': '#00bcd4', // Ciano
    'offer': '#4caf50',      // Verde
    'rejected': '#f44336',   // Rosso
  };
  return statusColors[status] || '#1976d2'; // Default to primary blue
};

/**
 * Get folder color based on application status (for application folders)
 * or documents it contains (for standard folders)
 * For application folders: uses the application status color
 * For standard folders: uses specific colors or document-based colors
 */
export const getFolderColor = (
  folderName: string, 
  documents: CV[], 
  applications?: Application[]
): string => {
  // Standard folders have specific colors
  if (folderName === 'CV') {
    return '#E0B341'; // Giallo senape
  }
  if (folderName === 'Cover Letter') {
    return '#7A7A7A'; // Grigio caldo
  }
  
  // For application folders, use the application status color
  if (isApplicationFolder(folderName) && applications) {
    // Find the application that matches this folder name
    const matchingApplication = applications.find(app => 
      getApplicationFolderName(app) === folderName
    );
    
    if (matchingApplication) {
      // Use the status color for application folders
      return getStatusColor(matchingApplication.status);
    }
  }
  
  // Fallback: For application folders without matching application, 
  // determine color based on documents (old behavior)
  if (isApplicationFolder(folderName)) {
    // Priority: AI documents > CV > Cover Letter > default
    for (const doc of documents) {
      const aiColor = getAIDocumentColor(doc.tags, doc.category);
      if (aiColor) {
        return aiColor; // Return first AI document color found
      }
    }
    
    // Check for CV or Cover Letter in application folder
    for (const doc of documents) {
      const hasCoverLetterTag = doc.tags?.some(tag => 
        tag.toLowerCase().includes('cover letter') || 
        tag.toLowerCase() === 'cl'
      ) || false;
      const hasCVTag = doc.tags?.some(tag => tag.toLowerCase() === 'cv') || false;
      
      const isCoverLetter = hasCoverLetterTag ||
        doc.name.toLowerCase().includes('cover letter') ||
        doc.name.toLowerCase().includes('cover_letter') ||
        doc.name.toLowerCase().includes('cl_');
      
      const isCV = !isCoverLetter && (hasCVTag || !hasCoverLetterTag);
      
      if (isCV) {
        return '#E0B341'; // Giallo senape per CV
      }
      if (isCoverLetter) {
        return '#7A7A7A'; // Grigio caldo per Cover Letter
      }
    }
  }
  
  // Default color for other folders
  return '#1976d2'; // Primary blue
};

