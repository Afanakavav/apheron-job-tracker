import React from 'react';
import type { DialogState } from '../hooks/useDialogManager';
import ApplicationFormDialog from './ApplicationFormDialog';
import QuickApplicationDialog from './QuickApplicationDialog';
import CVTailoringDialog from './CVTailoringDialog';
import CoverLetterGenerator from './CoverLetterGenerator';
import CompanyResearchDialog from './CompanyResearchDialog';
import JobAnalyzerDialog from './JobAnalyzerDialog';
import CVMatcherDialog from './CVMatcherDialog';
import CVUploadDialog from './CVUploadDialog';
import EmailAIDialog from './EmailAIDialog';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { deleteApplication } from '../services/applicationService';

interface DialogManagerProps {
  dialogState: DialogState;
  onClose: () => void;
  onApplicationFormSubmit?: (data: any) => void | Promise<void>;
  onQuickApplicationSubmit?: (data: any) => void | Promise<void>;
  onCVTailoringSuccess?: () => void;
  onCoverLetterSuccess?: (coverLetterId: string) => void | Promise<void>;
  onCVUploadSuccess?: (cvId: string) => void;
  onDeleteConfirm?: (applicationId: string, reason: string) => void | Promise<void>;
  onRefresh?: () => void;
  // Additional handlers for dialog-specific actions
  onOpenCompanyResearch?: (companyNameOrApplication: string | any) => void;
  onOpenJobAnalyzer?: (jobDescTextOrApplication: string | any) => void;
  onUploadCV?: (application: any) => void;
  onUploadCoverLetter?: (application: any) => void;
  onAnalyzeCV?: (application: any) => void;
  onOptimizeCV?: (application: any) => void;
  onGenerateCoverLetter?: (application: any) => void;
}

export const DialogManager: React.FC<DialogManagerProps> = ({
  dialogState,
  onClose,
  onApplicationFormSubmit,
  onQuickApplicationSubmit,
  onCoverLetterSuccess,
  onCVUploadSuccess,
  onDeleteConfirm,
  onRefresh,
  onOpenCompanyResearch,
  onOpenJobAnalyzer,
  onUploadCV,
  onUploadCoverLetter,
  onAnalyzeCV,
  onOptimizeCV,
  onGenerateCoverLetter,
}) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();

  if (!dialogState.type) return null;

  const { type, data = {} } = dialogState;
  const {
    application,
    companyName,
    jobDescription,
    cvUploadType = 'cv',
    applicationToDelete,
    deleteReason: initialDeleteReason = '',
    uploadedCVId,
    uploadedCoverLetterId,
  } = data;

  // Delete confirmation dialog state
  const [deleteReason, setDeleteReason] = React.useState(initialDeleteReason);

  const handleDeleteConfirm = async () => {
    if (!applicationToDelete || !currentUser) return;
    
    try {
      if (onDeleteConfirm) {
        await onDeleteConfirm(applicationToDelete.id, deleteReason);
      } else {
        // Default behavior: delete the application
        await deleteApplication(applicationToDelete.id);
        if (onRefresh) onRefresh();
      }
      onClose();
    } catch (error) {
      console.error('Error deleting application:', error);
    }
  };

  switch (type) {
    case 'application-form':
      return (
        <ApplicationFormDialog
          open={true}
          onClose={onClose}
          onSubmit={onApplicationFormSubmit || (() => {})}
          application={application || null}
          autoSelectCVId={uploadedCVId || null}
          autoSelectCoverLetterId={uploadedCoverLetterId || null}
          onOpenCompanyResearch={onOpenCompanyResearch}
          onOpenJobAnalyzer={onOpenJobAnalyzer}
          onUploadCV={onUploadCV}
          onUploadCoverLetter={onUploadCoverLetter}
          onAnalyzeCV={onAnalyzeCV}
          onOptimizeCV={onOptimizeCV}
          onGenerateCoverLetter={onGenerateCoverLetter}
        />
      );

    case 'quick-application':
      return (
        <QuickApplicationDialog
          open={true}
          onClose={onClose}
          onSubmit={onQuickApplicationSubmit || (() => {})}
        />
      );

    case 'cv-tailoring':
      return application && currentUser ? (
        <CVTailoringDialog
          open={true}
          onClose={onClose}
          userId={currentUser.uid}
          prefilledJobDescription={application.jobDescription}
          prefilledJobUrl={application.jobUrl}
          prefilledCompany={application.company}
          prefilledJobTitle={application.jobTitle}
          prefilledCVId={application.cvId}
          lockCVSelection={!!application.cvId}
        />
      ) : null;

    case 'cover-letter-generator':
      return application ? (
        <CoverLetterGenerator
          open={true}
          onClose={onClose}
          onSaveToApplication={onCoverLetterSuccess ? async (coverLetterId: string) => {
            if (onCoverLetterSuccess) await onCoverLetterSuccess(coverLetterId);
          } : undefined}
          prefilledCompany={application.company}
          prefilledJobTitle={application.jobTitle}
          prefilledJobDescription={application.jobDescription}
          prefilledJobUrl={application.jobUrl}
          prefilledCVId={application.cvId}
          lockCVSelection={!!application.cvId}
        />
      ) : null;

    case 'company-research':
      return (
        <CompanyResearchDialog
          open={true}
          onClose={onClose}
          prefilledCompany={companyName || (application?.company || '')}
          applicationCompany={application?.company}
          applicationJobTitle={application?.jobTitle}
        />
      );

    case 'job-analyzer':
      return (
        <JobAnalyzerDialog
          open={true}
          onClose={onClose}
          prefilledJobDescription={jobDescription || (application?.jobDescription || '')}
          prefilledJobUrl={application?.jobUrl}
          applicationCompany={application?.company}
          applicationJobTitle={application?.jobTitle}
        />
      );

    case 'cv-matcher':
      return application ? (
        <CVMatcherDialog
          open={true}
          onClose={onClose}
          prefilledCVId={application.cvId}
          prefilledJobDescription={application.jobDescription}
          prefilledJobUrl={application.jobUrl}
          prefilledJobTitle={application.jobTitle}
          applicationCompany={application.company}
          lockCVSelection={!!application.cvId}
        />
      ) : null;

    case 'cv-upload':
      return currentUser ? (
        <CVUploadDialog
          open={true}
          onClose={onClose}
          userId={currentUser.uid}
          onSuccess={(cvId) => {
            if (onCVUploadSuccess) onCVUploadSuccess(cvId);
            onClose();
          }}
          suggestedCategory={cvUploadType === 'cv' ? 'CV' : 'Cover Letter'}
          autoAssignFolder={application ? `${application.company} - ${application.jobTitle}` : undefined}
          lockFolder={!!application?.id}
          hideFolderField={!application?.id}
        />
      ) : null;

    case 'email-ai':
      return application && currentUser ? (
        <EmailAIDialog
          open={true}
          onClose={onClose}
          userId={currentUser.uid}
          prefilledCompanyName={application.company}
          prefilledJobTitle={application.jobTitle}
          prefilledCompanyEmail={application.companyEmail}
          prefilledJobDescription={application.jobDescription}
          prefilledJobUrl={application.jobUrl}
          preselectedCVId={application.cvId}
          preselectedCoverLetterId={application.coverLetterId}
          applicationStatus={application.status}
          applicationId={application.id}
          lockCVSelection={!!application.cvId}
          lockCoverLetterSelection={!!application.coverLetterId}
        />
      ) : null;

    case 'delete-confirmation':
      return (
        <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {t('applications.confirmDelete') || 'Conferma eliminazione'}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('applications.deleteWarning') || 
                'Sei sicuro di voler eliminare questa candidatura? Questa azione non può essere annullata.'}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label={t('applications.deleteReason') || 'Motivo dell\'eliminazione (opzionale)'}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder={t('applications.deleteReasonPlaceholder') || 'Inserisci il motivo...'}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} color="inherit">
              {t('common.cancel') || 'Annulla'}
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              {t('common.delete') || 'Elimina'}
            </Button>
          </DialogActions>
        </Dialog>
      );

    default:
      return null;
  }
};

