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
} from 'firebase/storage';
import { db, storage } from './firebase';
import type { CV } from '../types';

const CVS_COLLECTION = 'cvs';

// Convert Timestamp to Date
const convertTimestamps = (data: any): any => {
  const converted = { ...data };
  Object.keys(converted).forEach((key) => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
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

    const cvRecord = {
      userId,
      ...cvData,
      version: maxVersion + 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

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

    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
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

