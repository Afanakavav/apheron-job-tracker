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
import {
  ref,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable,
  uploadBytes,
} from 'firebase/storage';
import { db, storage } from './firebase';
import { isApplicationFolder } from '../utils/documentFolders';
import type { CV } from '../types';

const CVS_COLLECTION = 'cvs';

// Convert Timestamp to Date (handles nested objects and arrays)
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  Object.keys(converted).forEach((key) => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    } else if (Array.isArray(converted[key])) {
      // Handle arrays (e.g., versions array)
      converted[key] = converted[key].map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return convertTimestamps(item);
        }
        return item;
      });
    } else if (typeof converted[key] === 'object' && converted[key] !== null && !(converted[key] instanceof Date)) {
      // Handle nested objects
      converted[key] = convertTimestamps(converted[key]);
    }
  });
  return converted;
};

// Get all CVs for a user
export const getUserCVs = async (userId: string): Promise<CV[]> => {
  try {
    const q = query(
      collection(db, CVS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const cvs: CV[] = [];

    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      cvs.push({
        id: doc.id,
        folder: data.folder || 'Documenti generali', // Default folder for legacy documents
        ...data,
      } as CV);
    });

    return cvs;
  } catch (error) {
    console.error('Error fetching CVs:', error);
    
    // Fallback: se l'indice non è ancora pronto, ordina in memoria
    if (error instanceof Error && error.message.includes('index')) {
      console.log('Index not ready, fetching without orderBy and sorting in memory...');
      const qFallback = query(
        collection(db, CVS_COLLECTION),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(qFallback);
      const cvs: CV[] = [];

      querySnapshot.forEach((doc) => {
        const data = convertTimestamps(doc.data());
        cvs.push({
          id: doc.id,
          folder: data.folder || 'Documenti generali', // Default folder for legacy documents
          ...data,
        } as CV);
      });

      // Sort in memory by createdAt descending
      cvs.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      return cvs;
    }
    
    throw error;
  }
};

// Get single CV
export const getCV = async (cvId: string): Promise<CV | null> => {
  try {
    const docRef = doc(db, CVS_COLLECTION, cvId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = convertTimestamps(docSnap.data());
      return {
        id: docSnap.id,
        folder: data.folder || 'Documenti generali', // Default folder for legacy documents
        ...data,
      } as CV;
    }

    return null;
  } catch (error) {
    console.error('Error fetching CV:', error);
    throw error;
  }
};

// Upload CV file to Firebase Storage
export const uploadCVFile = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ url: string; fileName: string }> => {
  try {
    // Create unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storagePath = `users/${userId}/cvs/${fileName}`;
    
    console.log('Uploading file to path:', storagePath);
    console.log('File details:', { name: file.name, size: file.size, type: file.type });
    
    const storageRef = ref(storage, storagePath);

    // Upload file with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload progress:', progress.toFixed(2) + '%');
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Error during upload:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          reject(error);
        },
        async () => {
          // Upload completed successfully
          console.log('Upload completed, getting download URL...');
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('Download URL obtained:', downloadURL);
          resolve({ url: downloadURL, fileName });
        }
      );
    });
  } catch (error: any) {
    console.error('Error uploading CV file:', error);
    console.error('Error details:', error?.code, error?.message);
    throw error;
  }
};

// Create new CV record
export const createCV = async (
  userId: string,
  cvData: {
    name: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    tags: string[];
    category?: string;
    description?: string;
    folder?: string; // Folder where document should be stored
  }
): Promise<string> => {
  try {
    // Get the highest version number for this user
    let maxVersion = 0;
    try {
      const userCVs = await getUserCVs(userId);
      maxVersion = userCVs.length > 0 ? Math.max(...userCVs.map((cv) => cv.version)) : 0;
    } catch (err) {
      console.warn('Could not fetch existing CVs for versioning, starting from version 1:', err);
      maxVersion = 0;
    }

    // Build CV record, excluding undefined and empty optional fields
    const cvRecord: any = {
      userId,
      name: cvData.name,
      fileName: cvData.fileName,
      fileUrl: cvData.fileUrl,
      fileSize: cvData.fileSize,
      tags: cvData.tags,
      folder: cvData.folder || 'Documenti generali', // Default folder if not specified
      version: maxVersion + 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only add optional fields if they have meaningful values
    if (cvData.category && cvData.category.trim()) {
      cvRecord.category = cvData.category.trim();
    }
    if (cvData.description && cvData.description.trim()) {
      cvRecord.description = cvData.description.trim();
    }

    const docRef = await addDoc(collection(db, CVS_COLLECTION), cvRecord);
    console.log('CV record created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating CV:', error);
    throw error;
  }
};

// Update CV metadata
export const updateCV = async (
  cvId: string,
  updates: Partial<CV>
): Promise<void> => {
  try {
    const docRef = doc(db, CVS_COLLECTION, cvId);

    // Clean updates to remove undefined and empty values
    const cleanedUpdates: any = {
      updatedAt: serverTimestamp(),
    };

    Object.keys(updates).forEach((key) => {
      const value = (updates as any)[key];
      // Only include non-undefined values
      if (value !== undefined) {
        // For strings, trim and only include if not empty
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed) {
            cleanedUpdates[key] = trimmed;
          }
        } else {
          cleanedUpdates[key] = value;
        }
      }
    });

    await updateDoc(docRef, cleanedUpdates);
  } catch (error) {
    console.error('Error updating CV:', error);
    throw error;
  }
};

// Delete CV (file + record)
export const deleteCV = async (cv: CV): Promise<void> => {
  try {
    // Delete file from Storage
    const storageRef = ref(storage, `users/${cv.userId}/cvs/${cv.fileName}`);
    try {
      await deleteObject(storageRef);
    } catch (storageError) {
      console.warn('Error deleting CV file from storage:', storageError);
      // Continue even if file deletion fails (file might not exist)
    }

    // Delete record from Firestore
    await deleteDoc(doc(db, CVS_COLLECTION, cv.id));
  } catch (error) {
    console.error('Error deleting CV:', error);
    throw error;
  }
};

// Get CV by category
export const getCVsByCategory = async (
  userId: string,
  category: string
): Promise<CV[]> => {
  try {
    const q = query(
      collection(db, CVS_COLLECTION),
      where('userId', '==', userId),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const cvs: CV[] = [];

    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      cvs.push({
        id: doc.id,
        folder: data.folder || 'Documenti generali', // Default folder for legacy documents
        ...data,
      } as CV);
    });

    return cvs;
  } catch (error) {
    console.error('Error fetching CVs by category:', error);
    throw error;
  }
};

// Search CVs by tags
export const searchCVsByTags = async (
  userId: string,
  tags: string[]
): Promise<CV[]> => {
  try {
    const q = query(
      collection(db, CVS_COLLECTION),
      where('userId', '==', userId),
      where('tags', 'array-contains-any', tags),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const cvs: CV[] = [];

    querySnapshot.forEach((doc) => {
      const data = convertTimestamps(doc.data());
      cvs.push({
        id: doc.id,
        folder: data.folder || 'Documenti generali', // Default folder for legacy documents
        ...data,
      } as CV);
    });

    return cvs;
  } catch (error) {
    console.error('Error searching CVs by tags:', error);
    throw error;
  }
};

// Validate file type and size
export const validateCVFile = (file: File): { valid: boolean; error?: string } => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo di file non supportato. Solo PDF, DOC e DOCX sono accettati.',
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: 'File troppo grande. Dimensione massima: 10MB.',
    };
  }

  return { valid: true };
};

/**
 * Copy a CV/Cover Letter to a new folder (creates a duplicate in Storage and Firestore)
 * Used when linking an existing document to an application - it gets copied to the application's folder
 */
export const copyCVToFolder = async (
  sourceCVId: string,
  targetFolder: string,
  userId: string,
  companyName?: string,
  jobTitle?: string
): Promise<string> => {
  try {
    // Get the source CV
    const sourceCV = await getCV(sourceCVId);
    if (!sourceCV) {
      throw new Error('CV source not found');
    }

    // Check if CV is already in the target folder
    if (sourceCV.folder === targetFolder) {
      console.log('CV already in target folder, returning original ID');
      return sourceCVId;
    }

    // Download the file from Storage (using fileUrl directly)
    const fileBlob = await fetch(sourceCV.fileUrl).then(res => res.blob());

    // Create new filename with timestamp (to avoid conflicts in storage)
    const timestamp = Date.now();
    const fileExtension = sourceCV.fileName.split('.').pop();
    const baseName = sourceCV.fileName.replace(/\.[^/.]+$/, '').replace(/_\d+$/, ''); // Remove existing timestamp if any
    const newFileName = `${timestamp}_${baseName}.${fileExtension}`;
    const newStoragePath = `users/${userId}/cvs/${newFileName}`;

    // Upload file to Storage with new name
    const newFileRef = ref(storage, newStoragePath);
    await uploadBytes(newFileRef, fileBlob);
    const newFileUrl = await getDownloadURL(newFileRef);

    // Determine if this is a CV or Cover Letter based on source folder
    const isCoverLetter = sourceCV.folder === 'Cover Letter';
    const isCV = sourceCV.folder === 'CV';
    
    // Generate new name for documents copied to application folder
    let newName = sourceCV.name;
    if (isApplicationFolder(targetFolder) && companyName && jobTitle) {
      // Remove file extension from name if present
      const nameWithoutExt = sourceCV.name.replace(/\.[^/.]+$/, '');
      if (isCV) {
        // CV: "nome_CV - nome_azienda - nome_posizione"
        newName = `${nameWithoutExt} - ${companyName} - ${jobTitle}`;
      } else if (isCoverLetter) {
        // Cover Letter: "nome_Cover_Letter - nome_azienda - nome_posizione"
        newName = `${nameWithoutExt} - ${companyName} - ${jobTitle}`;
      }
    }

    // Create new CV record in Firestore with updated folder
    // Remove 'copied' tag and description copy information if present from source
    const sourceTags = (sourceCV.tags || []).filter(tag => tag.toLowerCase() !== 'copied');
    
    // Add a tag to identify CV vs Cover Letter in application folders for color coding
    const finalTags = [...sourceTags];
    if (isApplicationFolder(targetFolder)) {
      if (isCV && !finalTags.some(tag => tag.toLowerCase() === 'cv')) {
        finalTags.push('CV');
      } else if (isCoverLetter && !finalTags.some(tag => tag.toLowerCase().includes('cover letter'))) {
        finalTags.push('Cover Letter');
      }
    }
    
    // Remove any "Copiato in candidatura" or similar patterns from description
    let sourceDescription = sourceCV.description;
    if (sourceDescription) {
      // Remove patterns like "Copiato in candidatura: ..." or "(Copiato in ...)"
      sourceDescription = sourceDescription
        .replace(/Copiato in candidatura[:\s]*[^.]*/gi, '')
        .replace(/\(Copiato in [^)]+\)/gi, '')
        .replace(/Copiato in [^.]+\..*/gi, '')
        .trim();
      sourceDescription = sourceDescription || undefined;
    }
    
    const newCVId = await createCV(userId, {
      name: newName,
      fileName: newFileName,
      fileUrl: newFileUrl,
      fileSize: sourceCV.fileSize,
      tags: finalTags,
      category: sourceCV.category,
      description: sourceDescription, // Don't add copy information
      folder: targetFolder,
    });

    console.log(`✅ CV copied from "${sourceCV.folder}" to "${targetFolder}". New ID: ${newCVId}`);
    return newCVId;
  } catch (error) {
    console.error('Error copying CV to folder:', error);
    throw error;
  }
};

