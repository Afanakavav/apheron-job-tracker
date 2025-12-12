import { useState, useCallback } from 'react';
import type { Application } from '../types';

export type DialogType =
  | 'application-form'
  | 'quick-application'
  | 'cv-tailoring'
  | 'cover-letter-generator'
  | 'company-research'
  | 'job-analyzer'
  | 'cv-matcher'
  | 'cv-upload'
  | 'email-ai'
  | 'delete-confirmation'
  | null;

export interface DialogState {
  type: DialogType;
  data?: {
    application?: Application | null;
    companyName?: string;
    jobDescription?: string;
    cvUploadType?: 'cv' | 'coverLetter';
    applicationToDelete?: Application | null;
    deleteReason?: string;
    uploadedCVId?: string | null;
    uploadedCoverLetterId?: string | null;
    [key: string]: any; // Allow additional data
  };
}

/**
 * Custom hook for managing dialogs centrally
 * Simplifies dialog state management across the application
 */
export function useDialogManager() {
  const [dialogState, setDialogState] = useState<DialogState>({ type: null });

  const openDialog = useCallback((type: DialogType, data?: DialogState['data']) => {
    setDialogState({ type, data: data || {} });
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState({ type: null });
  }, []);

  const updateDialogData = useCallback((updates: Partial<DialogState['data']>) => {
    setDialogState(prev => ({
      ...prev,
      data: { ...prev.data, ...updates },
    }));
  }, []);

  return {
    dialogState,
    openDialog,
    closeDialog,
    updateDialogData,
    isOpen: dialogState.type !== null,
  };
}

