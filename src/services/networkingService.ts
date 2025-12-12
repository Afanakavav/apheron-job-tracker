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
import type { 
  Contact, 
  ContactNote, 
  NetworkingEvent, 
  ContactType,
  NetworkingEventType 
} from '../types';
import { getCachedData, setCachedData, clearCache, CACHE_KEYS, CACHE_TTL } from './cacheService';

const CONTACTS_COLLECTION = 'contacts';
const CONTACT_NOTES_COLLECTION = 'contact_notes';
const NETWORKING_EVENTS_COLLECTION = 'networking_events';

// Convert Firebase Timestamps to Date
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    } else if (Array.isArray(converted[key])) {
      converted[key] = converted[key].map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return convertTimestamps(item);
        }
        return item;
      });
    } else if (typeof converted[key] === 'object' && converted[key] !== null && !(converted[key] instanceof Date)) {
      converted[key] = convertTimestamps(converted[key]);
    }
  });
  return converted;
};

// ==================== CONTACTS ====================

export interface CreateContactData {
  name: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  company?: string;
  role?: string;
  type: ContactType;
  tags?: string[];
  followUpReminderDays?: number;
}

export const createContact = async (
  userId: string, 
  data: CreateContactData
): Promise<string> => {
  // Invalidate cache
  clearCache(CACHE_KEYS.CONTACTS(userId));
  
  const contactRef = collection(db, 'users', userId, CONTACTS_COLLECTION);
  
  const contactData = {
    ...data,
    userId,
    tags: data.tags || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(contactRef, contactData);
  return docRef.id;
};

export const getContacts = async (userId: string, useCache: boolean = true): Promise<Contact[]> => {
  // Check cache first
  if (useCache) {
    const cached = getCachedData<Contact[]>(CACHE_KEYS.CONTACTS(userId));
    if (cached) {
      return cached;
    }
  }

  const contactsRef = collection(db, 'users', userId, CONTACTS_COLLECTION);
  const q = query(contactsRef, orderBy('updatedAt', 'desc'));
  
  const snapshot = await getDocs(q);
  const contacts = snapshot.docs.map(doc => {
    const data = convertTimestamps(doc.data());
    return {
      id: doc.id,
      ...data,
    } as Contact;
  });

  // Cache the result
  setCachedData(CACHE_KEYS.CONTACTS(userId), contacts, CACHE_TTL.MEDIUM);
  
  return contacts;
};

export const getContact = async (userId: string, contactId: string): Promise<Contact | null> => {
  const contactRef = doc(db, 'users', userId, CONTACTS_COLLECTION, contactId);
  const snapshot = await getDoc(contactRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  const data = convertTimestamps(snapshot.data());
  return {
    id: snapshot.id,
    ...data,
  } as Contact;
};

export interface UpdateContactData {
  name?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  company?: string;
  role?: string;
  type?: ContactType;
  tags?: string[];
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  followUpReminderDays?: number;
  applicationIds?: string[];
}

export const updateContact = async (
  userId: string,
  contactId: string,
  data: UpdateContactData
): Promise<void> => {
  // Invalidate cache
  clearCache(CACHE_KEYS.CONTACTS(userId));
  
  const contactRef = doc(db, 'users', userId, CONTACTS_COLLECTION, contactId);
  
  const updateData: any = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // Convert Date to Timestamp for Firestore
  if (data.lastContactDate) {
    updateData.lastContactDate = Timestamp.fromDate(data.lastContactDate);
  }
  if (data.nextFollowUpDate) {
    updateData.nextFollowUpDate = Timestamp.fromDate(data.nextFollowUpDate);
  }

  await updateDoc(contactRef, updateData);
};

export const deleteContact = async (userId: string, contactId: string): Promise<void> => {
  // Invalidate cache
  clearCache(CACHE_KEYS.CONTACTS(userId));
  
  // Delete all notes and events for this contact first
  const notes = await getContactNotes(userId, contactId);
  for (const note of notes) {
    await deleteContactNote(userId, note.id);
  }
  
  const events = await getNetworkingEvents(userId, contactId);
  for (const event of events) {
    await deleteNetworkingEvent(userId, event.id);
  }
  
  // Delete contact
  const contactRef = doc(db, 'users', userId, CONTACTS_COLLECTION, contactId);
  await deleteDoc(contactRef);
};

export const getContactsNeedingFollowUp = async (userId: string): Promise<Contact[]> => {
  const contacts = await getContacts(userId);
  const now = new Date();
  
  return contacts.filter(contact => {
    if (!contact.lastContactDate || !contact.followUpReminderDays) {
      return false;
    }
    
    const daysSinceLastContact = Math.floor(
      (now.getTime() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceLastContact >= (contact.followUpReminderDays || 14);
  });
};

// ==================== CONTACT NOTES ====================

export const createContactNote = async (
  userId: string,
  contactId: string,
  content: string
): Promise<string> => {
  const notesRef = collection(db, 'users', userId, CONTACT_NOTES_COLLECTION);
  
  const noteData = {
    contactId,
    userId,
    content,
    createdBy: userId,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(notesRef, noteData);
  
  // Update contact's lastContactDate
  await updateContact(userId, contactId, {
    lastContactDate: new Date(),
  });
  
  return docRef.id;
};

export const getContactNotes = async (
  userId: string,
  contactId: string
): Promise<ContactNote[]> => {
  const notesRef = collection(db, 'users', userId, CONTACT_NOTES_COLLECTION);
  const q = query(
    notesRef,
    where('contactId', '==', contactId),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = convertTimestamps(doc.data());
      return {
        id: doc.id,
        ...data,
      } as ContactNote;
    });
  } catch (error: any) {
    // If index is missing, try without orderBy as fallback
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      console.warn('⚠️ [ContactNotes] Index not ready, using fallback query without orderBy');
      const fallbackQ = query(
        notesRef,
        where('contactId', '==', contactId)
      );
      const snapshot = await getDocs(fallbackQ);
      const notes = snapshot.docs.map(doc => {
        const data = convertTimestamps(doc.data());
        return {
          id: doc.id,
          ...data,
        } as ContactNote;
      });
      // Sort manually
      return notes.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });
    }
    throw error;
  }
};

export const updateContactNote = async (
  userId: string,
  noteId: string,
  content: string
): Promise<void> => {
  const noteRef = doc(db, 'users', userId, CONTACT_NOTES_COLLECTION, noteId);
  await updateDoc(noteRef, {
    content,
    updatedAt: serverTimestamp(),
  });
};

export const deleteContactNote = async (userId: string, noteId: string): Promise<void> => {
  const noteRef = doc(db, 'users', userId, CONTACT_NOTES_COLLECTION, noteId);
  await deleteDoc(noteRef);
};

// ==================== NETWORKING EVENTS ====================

export interface CreateNetworkingEventData {
  contactId: string;
  type: NetworkingEventType;
  title: string;
  description?: string;
  date: Date;
  location?: string;
  linkedApplicationId?: string;
  metadata?: Record<string, any>;
}

export const createNetworkingEvent = async (
  userId: string,
  data: CreateNetworkingEventData
): Promise<string> => {
  const eventsRef = collection(db, 'users', userId, NETWORKING_EVENTS_COLLECTION);
  
  const eventData = {
    ...data,
    userId,
    date: Timestamp.fromDate(data.date),
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(eventsRef, eventData);
  
  // Update contact's lastContactDate
  await updateContact(userId, data.contactId, {
    lastContactDate: data.date,
  });
  
  return docRef.id;
};

export const getNetworkingEvents = async (
  userId: string,
  contactId?: string
): Promise<NetworkingEvent[]> => {
  const eventsRef = collection(db, 'users', userId, NETWORKING_EVENTS_COLLECTION);
  
  try {
    let q;
    if (contactId) {
      q = query(
        eventsRef,
        where('contactId', '==', contactId),
        orderBy('date', 'desc')
      );
    } else {
      q = query(eventsRef, orderBy('date', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = convertTimestamps(doc.data());
      return {
        id: doc.id,
        ...data,
      } as NetworkingEvent;
    });
  } catch (error: any) {
    // If index is missing, try without orderBy as fallback
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      console.warn('⚠️ [NetworkingEvents] Index not ready, using fallback query without orderBy');
      let fallbackQ;
      if (contactId) {
        fallbackQ = query(
          eventsRef,
          where('contactId', '==', contactId)
        );
      } else {
        fallbackQ = query(eventsRef);
      }
      const snapshot = await getDocs(fallbackQ);
      const events = snapshot.docs.map(doc => {
        const data = convertTimestamps(doc.data());
        return {
          id: doc.id,
          ...data,
        } as NetworkingEvent;
      });
      // Sort manually
      return events.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date.getTime() : 0;
        const dateB = b.date instanceof Date ? b.date.getTime() : 0;
        return dateB - dateA;
      });
    }
    throw error;
  }
};

export const getNetworkingEvent = async (
  userId: string,
  eventId: string
): Promise<NetworkingEvent | null> => {
  const eventRef = doc(db, 'users', userId, NETWORKING_EVENTS_COLLECTION, eventId);
  const snapshot = await getDoc(eventRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  const data = convertTimestamps(snapshot.data());
  return {
    id: snapshot.id,
    ...data,
  } as NetworkingEvent;
};

export interface UpdateNetworkingEventData {
  type?: NetworkingEventType;
  title?: string;
  description?: string;
  date?: Date;
  location?: string;
  linkedApplicationId?: string;
  metadata?: Record<string, any>;
}

export const updateNetworkingEvent = async (
  userId: string,
  eventId: string,
  data: UpdateNetworkingEventData
): Promise<void> => {
  const eventRef = doc(db, 'users', userId, NETWORKING_EVENTS_COLLECTION, eventId);
  
  const updateData: any = { ...data };
  
  if (data.date) {
    updateData.date = Timestamp.fromDate(data.date);
  }
  
  await updateDoc(eventRef, updateData);
};

export const deleteNetworkingEvent = async (userId: string, eventId: string): Promise<void> => {
  const eventRef = doc(db, 'users', userId, NETWORKING_EVENTS_COLLECTION, eventId);
  await deleteDoc(eventRef);
};

// ==================== LINK CONTACT TO APPLICATION ====================

export const linkContactToApplication = async (
  userId: string,
  contactId: string,
  applicationId: string
): Promise<void> => {
  const contact = await getContact(userId, contactId);
  if (!contact) {
    throw new Error('Contact not found');
  }
  
  const applicationIds = contact.applicationIds || [];
  if (!applicationIds.includes(applicationId)) {
    applicationIds.push(applicationId);
    await updateContact(userId, contactId, {
      applicationIds,
    });
  }
};

export const unlinkContactFromApplication = async (
  userId: string,
  contactId: string,
  applicationId: string
): Promise<void> => {
  const contact = await getContact(userId, contactId);
  if (!contact) {
    throw new Error('Contact not found');
  }
  
  const applicationIds = (contact.applicationIds || []).filter(id => id !== applicationId);
  await updateContact(userId, contactId, {
    applicationIds,
  });
};

// ==================== QUICK ADD CONTACT FROM APPLICATION ====================

export const quickAddContactFromApplication = async (
  userId: string,
  applicationId: string,
  contactData: {
    name: string;
    email?: string;
    linkedinUrl?: string;
    company?: string;
    role?: string;
    type: ContactType;
  }
): Promise<string> => {
  const contactId = await createContact(userId, {
    ...contactData,
    tags: ['from-application'],
  });
  
  await linkContactToApplication(userId, contactId, applicationId);
  
  return contactId;
};

