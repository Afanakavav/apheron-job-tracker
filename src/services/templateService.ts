// Template Service
// Manages email, cover letter, and other templates

import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  orderBy,
  getDoc,
  limit
} from 'firebase/firestore';
import type { Template } from '../types';

/**
 * Get all templates for a user
 */
export const getUserTemplates = async (userId: string): Promise<Template[]> => {
  try {
    const q = query(
      collection(db, 'templates'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Template[];
  } catch (error: any) {
    console.error('Error getting templates:', error);
    // If index is missing, try without orderBy
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      try {
        console.warn('⚠️ [Template] Firestore index not ready, using fallback sorting');
        const qFallback = query(
          collection(db, 'templates'),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(qFallback);
        const templates = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Template[];
        // Manual sort by createdAt
        return templates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } catch (fallbackError) {
        console.error('Error in fallback query:', fallbackError);
        return [];
      }
    }
    return [];
  }
};

/**
 * Get templates by type
 */
export const getTemplatesByType = async (
  userId: string,
  type: Template['type']
): Promise<Template[]> => {
  try {
    const q = query(
      collection(db, 'templates'),
      where('userId', '==', userId),
      where('type', '==', type),
      orderBy('isDefault', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Template[];
  } catch (error: any) {
    console.error('Error getting templates by type:', error);
    // If index is missing, try without orderBy
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      try {
        console.warn('⚠️ [Template] Firestore index not ready, using fallback sorting');
        const qFallback = query(
          collection(db, 'templates'),
          where('userId', '==', userId),
          where('type', '==', type)
        );
        const querySnapshot = await getDocs(qFallback);
        const templates = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Template[];
        // Manual sort: first by isDefault (desc), then by createdAt (desc)
        return templates.sort((a, b) => {
          if (a.isDefault !== b.isDefault) {
            return b.isDefault ? 1 : -1;
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
      } catch (fallbackError) {
        console.error('Error in fallback query:', fallbackError);
        return [];
      }
    }
    return [];
  }
};

/**
 * Get default template for a type
 */
export const getDefaultTemplate = async (
  userId: string,
  type: Template['type']
): Promise<Template | null> => {
  try {
    const q = query(
      collection(db, 'templates'),
      where('userId', '==', userId),
      where('type', '==', type),
      where('isDefault', '==', true),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const docData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...docData,
      createdAt: docData.createdAt?.toDate() || new Date(),
      updatedAt: docData.updatedAt?.toDate() || new Date(),
    } as Template;
  } catch (error) {
    console.error('Error getting default template:', error);
    return null;
  }
};

/**
 * Create a new template
 */
export const createTemplate = async (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // If this is set as default, unset other defaults of the same type
    if (template.isDefault) {
      const existingDefaults = await getTemplatesByType(template.userId, template.type);
      for (const existing of existingDefaults) {
        if (existing.isDefault && existing.id) {
          await updateTemplate(existing.id, { isDefault: false });
        }
      }
    }

    const templateData = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'templates'), templateData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
};

/**
 * Update a template
 */
export const updateTemplate = async (
  templateId: string,
  updates: Partial<Omit<Template, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    const templateRef = doc(db, 'templates', templateId);
    
    // If setting as default, unset other defaults
    if (updates.isDefault) {
      const templateDoc = await getDoc(templateRef);
      if (templateDoc.exists()) {
        const templateData = templateDoc.data() as Template;
        const existingDefaults = await getTemplatesByType(templateData.userId, templateData.type);
        for (const existing of existingDefaults) {
          if (existing.isDefault && existing.id !== templateId) {
            await updateTemplate(existing.id!, { isDefault: false });
          }
        }
      }
    }

    await updateDoc(templateRef, {
      ...updates,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

/**
 * Delete a template
 */
export const deleteTemplate = async (templateId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'templates', templateId));
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

/**
 * Render template with variables
 */
export const renderTemplate = (
  template: string,
  variables: Record<string, string | number | Date>
): string => {
  let rendered = template;

  // Replace variables in format {{variableName}}
  Object.entries(variables).forEach(([key, value]) => {
    const formattedValue = value instanceof Date 
      ? value.toLocaleDateString('it-IT')
      : String(value);
    
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, formattedValue);
  });

  return rendered;
};

/**
 * Get default templates (for new users)
 */
export const getDefaultTemplates = (): Omit<Template, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] => {
  return [
    {
      name: 'Email Follow-Up Standard',
      type: 'email',
      content: `Gentile {{contactName}},

La ringrazio per il tempo dedicatomi durante la nostra conversazione riguardo alla posizione di {{jobTitle}} presso {{companyName}}.

Sono molto interessato a questa opportunità e sarei lieto di procedere con le prossime fasi del processo di selezione.

Resto in attesa di un Suo riscontro.

Cordiali saluti,
{{yourName}}`,
      tags: ['follow-up', 'standard'],
      isDefault: true,
      // variables: ['contactName', 'jobTitle', 'companyName', 'yourName'],
    },
    {
      name: 'Cover Letter Generica',
      type: 'cover_letter',
      content: `Gentile {{companyName}},

Con la presente desidero candidarmi per la posizione di {{jobTitle}}.

{{personalizedParagraph}}

Sono entusiasta all'idea di contribuire al successo di {{companyName}} e sono disponibile per un colloquio.

Cordiali saluti,
{{yourName}}`,
      tags: ['generico'],
      isDefault: true,
      // variables: ['companyName', 'jobTitle', 'personalizedParagraph', 'yourName'],
    },
    {
      name: 'Thank You Email',
      type: 'thank_you',
      content: `Gentile {{contactName}},

La ringrazio per il tempo che ha dedicato al nostro colloquio di oggi riguardo alla posizione di {{jobTitle}}.

Ho molto apprezzato la nostra conversazione e sono ancora più entusiasta all'idea di unirmi al team di {{companyName}}.

Resto a disposizione per qualsiasi informazione aggiuntiva.

Cordiali saluti,
{{yourName}}`,
      tags: ['thank-you'],
      isDefault: true,
      // variables: ['contactName', 'jobTitle', 'companyName', 'yourName'],
    },
  ];
};

