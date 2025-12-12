import type { CV } from '../types';

/**
 * Get clean filename for download/attachment from CV object
 * Uses cv.name (display name) + file extension from cv.fileName
 * Removes timestamp prefixes/suffixes if present
 * 
 * @param cv - CV object with name and fileName properties
 * @returns Clean filename without timestamps
 */
export const getCleanFileName = (cv: CV): string => {
  // Get file extension from fileName (handles cases like .pdf, .docx, etc.)
  const fileExtension = cv.fileName.split('.').pop() || '';
  
  // Use cv.name as base (this is the display name shown in Documents)
  // Add extension if cv.name doesn't already have it
  let cleanName = cv.name;
  
  // Remove extension from name if it already has one
  const nameParts = cleanName.split('.');
  if (nameParts.length > 1) {
    // Name already has extension, use it as is
    return cleanName;
  }
  
  // Add extension from fileName
  return fileExtension ? `${cleanName}.${fileExtension}` : cleanName;
};

/**
 * Download file with clean filename
 * Fetches file from URL and triggers download with clean name
 * 
 * @param fileUrl - URL of the file to download
 * @param cleanFileName - Clean filename to use for download
 */
export const downloadFileWithCleanName = async (fileUrl: string, cleanFileName: string): Promise<void> => {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    // Fallback to opening in new tab
    window.open(fileUrl, '_blank');
  }
};

