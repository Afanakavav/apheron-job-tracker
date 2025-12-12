// Workflow Automation Service
// Manages automated workflows and actions

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
  orderBy 
} from 'firebase/firestore';
import type { Application } from '../types';

export interface Workflow {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkflowTrigger = 
  | { type: 'application_created'; filters?: Record<string, any> }
  | { type: 'application_status_changed'; fromStatus?: string; toStatus: string }
  | { type: 'interview_scheduled'; daysBefore?: number }
  | { type: 'follow_up_due' }
  | { type: 'manual' };

export type WorkflowAction =
  | { type: 'create_application'; data: Partial<Application> }
  | { type: 'update_application'; applicationId: string; updates: Partial<Application> }
  | { type: 'send_email'; templateId?: string; to: string; subject: string; body: string }
  | { type: 'create_contact'; data: { name: string; email?: string; company?: string } }
  | { type: 'set_reminder'; message: string; date: Date }
  | { type: 'add_tag'; tag: string }
  | { type: 'update_status'; status: Application['status'] };

/**
 * Get all workflows for a user
 */
export const getUserWorkflows = async (userId: string): Promise<Workflow[]> => {
  try {
    const q = query(
      collection(db, 'workflows'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Workflow[];
  } catch (error: any) {
    console.error('Error getting workflows:', error);
    // If index is missing, try without orderBy
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      try {
        console.warn('⚠️ [Workflow] Firestore index not ready, using fallback sorting');
        const qFallback = query(
          collection(db, 'workflows'),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(qFallback);
        const workflows = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Workflow[];
        // Manual sort by createdAt
        return workflows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } catch (fallbackError) {
        console.error('Error in fallback query:', fallbackError);
        return [];
      }
    }
    return [];
  }
};

/**
 * Create a new workflow
 */
export const createWorkflow = async (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const workflowData = {
      ...workflow,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'workflows'), workflowData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
};

/**
 * Update a workflow
 */
export const updateWorkflow = async (
  workflowId: string,
  updates: Partial<Omit<Workflow, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'workflows', workflowId), {
      ...updates,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    throw error;
  }
};

/**
 * Delete a workflow
 */
export const deleteWorkflow = async (workflowId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'workflows', workflowId));
  } catch (error) {
    console.error('Error deleting workflow:', error);
    throw error;
  }
};

/**
 * Execute workflow actions
 * This should be called when a trigger condition is met
 */
export const executeWorkflow = async (workflow: Workflow, context: Record<string, any>): Promise<void> => {
  if (!workflow.enabled) {
    return;
  }

  try {
    for (const action of workflow.actions) {
      await executeAction(action, context);
    }
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
};

/**
 * Execute a single workflow action
 */
const executeAction = async (action: WorkflowAction, context: Record<string, any>): Promise<void> => {
  switch (action.type) {
    case 'create_application':
      // Import here to avoid circular dependency
      const { createApplication } = await import('./applicationService');
      await createApplication(context.userId, action.data as any);
      break;

    case 'update_application':
      const { updateApplication } = await import('./applicationService');
      await updateApplication(action.applicationId, action.updates);
      break;

    case 'send_email':
      const { scheduleEmailNotification } = await import('./emailNotificationService');
      await scheduleEmailNotification({
        userId: context.userId,
        type: 'follow_up',
        recipient: action.to,
        subject: action.subject,
        body: action.body,
      });
      break;

    case 'create_contact':
      const { createContact } = await import('./networkingService');
      await createContact(context.userId, {
        ...action.data,
        type: 'other',
        tags: [],
      } as any);
      break;

    case 'add_tag':
      if (context.applicationId) {
        const { updateApplication } = await import('./applicationService');
        const app = context.application;
        await updateApplication(context.applicationId, {
          tags: [...(app.tags || []), action.tag],
        });
      }
      break;

    case 'update_status':
      if (context.applicationId) {
        const { updateApplication } = await import('./applicationService');
        await updateApplication(context.applicationId, {
          status: action.status,
        });
      }
      break;

    default:
      console.warn('Unknown action type:', action);
  }
};

/**
 * Get default workflows (for new users)
 */
export const getDefaultWorkflows = (): Omit<Workflow, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] => {
  return [
    {
      name: 'Auto-follow-up dopo 2 settimane',
      description: 'Imposta automaticamente un promemoria follow-up 2 settimane dopo la candidatura',
      trigger: { type: 'application_status_changed', toStatus: 'applied' },
      actions: [
        {
          type: 'set_reminder',
          message: 'Follow-up per {{company}} - {{jobTitle}}',
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
      ],
      enabled: true,
    },
    {
      name: 'Crea contatto da candidatura',
      description: 'Crea automaticamente un contatto quando candidi a un\'azienda',
      trigger: { type: 'application_created' },
      actions: [
        {
          type: 'create_contact',
          data: {
            name: '{{company}} HR',
            company: '{{company}}',
          },
        },
      ],
      enabled: false, // Disabled by default
    },
  ];
};

