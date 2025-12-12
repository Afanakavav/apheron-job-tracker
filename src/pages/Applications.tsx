import React, { useState, useEffect, Suspense } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Fab,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ButtonGroup,
} from '@mui/material';
import { ApplicationListSkeleton } from '../components/skeletons';
import { Add as AddIcon, Archive as ArchiveIcon, CalendarMonth as CalendarIcon, CheckBox as CheckBoxIcon, CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useApplications } from '../hooks/useApplications';
import KanbanBoard from '../components/KanbanBoard';
// Lazy load heavy dialog components
const ApplicationFormDialog = React.lazy(() => import('../components/ApplicationFormDialog'));
const CVTailoringDialog = React.lazy(() => import('../components/CVTailoringDialog'));
const CoverLetterGenerator = React.lazy(() => import('../components/CoverLetterGenerator'));
const CompanyResearchDialog = React.lazy(() => import('../components/CompanyResearchDialog'));
const JobAnalyzerDialog = React.lazy(() => import('../components/JobAnalyzerDialog'));
const CVMatcherDialog = React.lazy(() => import('../components/CVMatcherDialog'));
const CVUploadDialog = React.lazy(() => import('../components/CVUploadDialog'));
const EmailAIDialog = React.lazy(() => import('../components/EmailAIDialog'));
import FloatingActionButton from '../components/FloatingActionButton';
const QuickApplicationDialog = React.lazy(() => import('../components/QuickApplicationDialog'));
import { BulkActions } from '../components/BulkActions';
import { ErrorAlert } from '../components/ErrorAlert';
import { 
  archiveApplication,
  batchArchiveApplications,
  batchDeleteApplications,
  batchUpdateApplicationStatus
} from '../services/applicationService';
import { exportApplicationsCSV } from '../services/exportService';
import { getApplicationFolderName } from '../utils/documentFolders';
import { GAEvents } from '../services/googleAnalytics';
import type { Application, ApplicationFormData, ApplicationStatus } from '../types';

const Applications: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Use custom hook for applications management
  const { 
    applications, 
    loading, 
    error: applicationsError,
    add: addApplication, 
    update: updateApplication,
    refetch
  } = useApplications(currentUser?.uid);
  
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(null);
  const [quickFilter, setQuickFilter] = useState<'noResponse' | 'withInterview' | 'toFollow' | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [cvTailoringOpen, setCvTailoringOpen] = useState(false);
  const [applicationForTailoring, setApplicationForTailoring] = useState<Application | null>(null);
  const [coverLetterGeneratorOpen, setCoverLetterGeneratorOpen] = useState(false);
  const [applicationForCoverLetter, setApplicationForCoverLetter] = useState<Application | null>(null);
  
  // New dialogs
  const [companyResearchOpen, setCompanyResearchOpen] = useState(false);
  const [_companyToResearch, setCompanyToResearch] = useState('');
  const [applicationForCompanyResearch, setApplicationForCompanyResearch] = useState<Application | null>(null);
  const [jobAnalyzerOpen, setJobAnalyzerOpen] = useState(false);
  const [_jobDescToAnalyze, setJobDescToAnalyze] = useState('');
  const [applicationForJobAnalyzer, setApplicationForJobAnalyzer] = useState<Application | null>(null);
  const [cvMatcherOpen, setCvMatcherOpen] = useState(false);
  const [_applicationForCVMatcher, setApplicationForCVMatcher] = useState<Application | null>(null);
  const [cvUploadOpen, setCvUploadOpen] = useState(false);
  const [cvUploadType, setCvUploadType] = useState<'cv' | 'coverLetter'>('cv');
  const [applicationForUpload, setApplicationForUpload] = useState<Application | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [applicationForEmail, setApplicationForEmail] = useState<Application | null>(null);
  const [uploadedCVId, setUploadedCVId] = useState<string | null>(null);
  const [uploadedCoverLetterId, setUploadedCoverLetterId] = useState<string | null>(null);
  const [quickApplicationDialogOpen, setQuickApplicationDialogOpen] = useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<Application | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Sync error from hook
  useEffect(() => {
    if (applicationsError) {
      setError('Errore nel caricamento delle candidature');
    } else {
      setError(null);
    }
  }, [applicationsError]);

  // Read status filter from URL params
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && ['saved', 'applied', 'interview_1', 'interview_2', 'interview_3', 'interview_4', 'offer', 'rejected'].includes(statusParam)) {
      setStatusFilter(statusParam as ApplicationStatus);
    } else {
      setStatusFilter(null);
    }
  }, [searchParams]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Check for modifier keys (Ctrl/Cmd)
      const isModifierPressed = e.ctrlKey || e.metaKey;

      // N = New application (quick)
      if (e.key === 'n' && !isModifierPressed) {
        e.preventDefault();
        setQuickApplicationDialogOpen(true);
      }

      // Ctrl+N or Cmd+N = Full new application
      if (e.key === 'n' && isModifierPressed) {
        e.preventDefault();
        setDialogOpen(true);
        setSelectedApplication(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateApplication = async (formData: ApplicationFormData) => {
    try {
      await addApplication(formData);
      setDialogOpen(false);
    } catch (err) {
      console.error('Error creating application:', err);
      setError('Errore nella creazione della candidatura');
    }
  };

  const handleQuickCreateApplication = async (data: { company: string; jobTitle: string }) => {
    try {
      const quickFormData: ApplicationFormData = {
        company: data.company,
        jobTitle: data.jobTitle,
        location: '',
        isRemote: false,
        jobUrl: '',
        jobDescription: '',
        companyEmail: '',
        salaryMin: undefined,
        salaryMax: undefined,
        salaryCurrency: 'EUR',
        source: 'other',
        status: 'saved',
        priority: 'medium',
        notes: '',
        tags: [],
        cvId: undefined,
        coverLetterId: undefined,
        recruiterName: '',
        recruiterEmail: '',
        recruiterLinkedin: '',
        followUpEnabled: false,
        nextFollowUpDate: undefined,
      };
      
      await addApplication(quickFormData);
      // Open full dialog to add more details
      setDialogOpen(true);
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error creating quick application:', error);
      setError('Errore nella creazione della candidatura rapida');
    }
  };

  const handleUpdateApplication = async (formData: ApplicationFormData) => {
    if (!selectedApplication) return;

    try {
      const applicationFolderName = getApplicationFolderName(selectedApplication);
      
      // Check if CV was removed
      if (selectedApplication.cvId && !formData.cvId) {
        try {
          const { getCV, deleteCV } = await import('../services/cvService');
          const cv = await getCV(selectedApplication.cvId);
          // If CV is in the application folder, delete it
          if (cv && cv.folder === applicationFolderName) {
            await deleteCV(cv);
            console.log('✅ CV removed from application folder:', cv.id);
          }
        } catch (err) {
          console.error('Error removing CV from folder:', err);
          // Continue with update even if removal fails
        }
      }
      
      // Check if Cover Letter was removed
      if (selectedApplication.coverLetterId && !formData.coverLetterId) {
        try {
          const { getCV, deleteCV } = await import('../services/cvService');
          const cl = await getCV(selectedApplication.coverLetterId);
          // If Cover Letter is in the application folder, delete it
          if (cl && cl.folder === applicationFolderName) {
            await deleteCV(cl);
            console.log('✅ Cover Letter removed from application folder:', cl.id);
          }
        } catch (err) {
          console.error('Error removing Cover Letter from folder:', err);
          // Continue with update even if removal fails
        }
      }
      
      // Use hook's update method (optimistic update)
      await updateApplication(selectedApplication.id, formData);
      setDialogOpen(false);
      setSelectedApplication(null);
    } catch (err) {
      console.error('Error updating application:', err);
      setError('Errore nell\'aggiornamento della candidatura');
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    setApplicationToDelete(app);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!applicationToDelete) return;

    try {
      // If there's a delete reason, append it to the notes
      if (deleteReason.trim()) {
        const currentNotes = applicationToDelete.notes || '';
        const updatedNotes = currentNotes 
          ? `${currentNotes}\n\n🗑️ Motivo eliminazione: ${deleteReason.trim()}`
          : `🗑️ Motivo eliminazione: ${deleteReason.trim()}`;
        
        // Update the application with the new notes before archiving
        await updateApplication(applicationToDelete.id, {
          ...applicationToDelete,
          notes: updatedNotes,
        } as ApplicationFormData);
      }

      // Archive the application
      const appToArchive = applicationToDelete;
      setDeleteDialogOpen(false);
      setApplicationToDelete(null);
      setDeleteReason('');
      
      await archiveApplication(appToArchive.id);
      
      // Track analytics event
      GAEvents.deleteApplication();
      
      // Refresh to sync with server (removes archived app from list)
      await refetch(false);
    } catch (err) {
      console.error('Error archiving application:', err);
      setError('Errore nell\'archiviazione della candidatura');
      // Re-open dialog on error
      if (applicationToDelete) {
        setApplicationToDelete(applicationToDelete);
        setDeleteDialogOpen(true);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setApplicationToDelete(null);
    setDeleteReason('');
  };

  // Bulk operations handlers using batch updates for better performance
  const handleBulkDelete = async (ids: string[]) => {
    if (!currentUser?.uid || ids.length === 0) return;
    
    try {
      await batchDeleteApplications(ids, currentUser.uid);
      await refetch(false);
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (err) {
      console.error('Error bulk deleting applications:', err);
      setError('Errore nell\'eliminazione delle candidature');
    }
  };

  const handleBulkArchive = async (ids: string[]) => {
    if (!currentUser?.uid || ids.length === 0) return;
    
    try {
      await batchArchiveApplications(ids, currentUser.uid);
      await refetch(false);
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (err) {
      console.error('Error bulk archiving applications:', err);
      setError('Errore nell\'archiviazione delle candidature');
    }
  };

  const handleBulkStatusChange = async (ids: string[], status: ApplicationStatus) => {
    if (!currentUser?.uid || ids.length === 0) return;
    
    try {
      await batchUpdateApplicationStatus(ids, status, currentUser.uid);
      await refetch(false);
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (err) {
      console.error('Error bulk updating status:', err);
      setError('Errore nell\'aggiornamento dello stato');
    }
  };

  const handleBulkExport = async (ids: string[]) => {
    try {
      const selectedApps = applications.filter(app => ids.includes(app.id));
      // Export as CSV by default, can be extended to show a dialog for format selection
      exportApplicationsCSV(selectedApps);
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (err) {
      console.error('Error bulk exporting applications:', err);
      setError('Errore nell\'esportazione delle candidature');
    }
  };

  const handleSelect = (applicationId: string, selected: boolean) => {
    if (selected) {
      setSelectedIds([...selectedIds, applicationId]);
    } else {
      setSelectedIds(selectedIds.filter(id => id !== applicationId));
    }
  };

  const handleEdit = (application: Application) => {
    setSelectedApplication(application);
    setDialogOpen(true);
  };

  const handleViewDetails = (application: Application) => {
    // Open Info screen (same as edit dialog)
    setSelectedApplication(application);
    setDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setSelectedApplication(null);
    setDialogOpen(true);
  };

  const handleOptimizeCV = (application: Application) => {
    setApplicationForTailoring(application);
    setCvTailoringOpen(true);
  };

  const handleGenerateCoverLetter = (application: Application) => {
    setApplicationForCoverLetter(application);
    setCoverLetterGeneratorOpen(true);
  };

  const handleSendEmail = (application: Application) => {
    setApplicationForEmail(application);
    setEmailDialogOpen(true);
  };

  const handleSaveCoverLetterToApplication = async (coverLetterId: string) => {
    if (!applicationForCoverLetter) return;

    try {
      // If application doesn't have an ID yet (new application), don't try to update it
      // The Cover Letter will be linked when the application is created
      if (!applicationForCoverLetter.id) {
        console.log('💾 [Applications] Cover Letter saved, but application not yet created. Cover Letter will be linked when application is saved.');
        setCoverLetterGeneratorOpen(false);
        setApplicationForCoverLetter(null);
        return;
      }

      // Update application with coverLetterId using hook (optimistic update)
      await updateApplication(applicationForCoverLetter.id, {
        ...applicationForCoverLetter,
        coverLetterId,
      } as ApplicationFormData);
      
      console.log('✅ Cover Letter saved to application:', applicationForCoverLetter.id);
      setCoverLetterGeneratorOpen(false);
      setApplicationForCoverLetter(null);
    } catch (err) {
      console.error('Error saving Cover Letter to application:', err);
      setError('Errore nel salvataggio della Cover Letter');
    }
  };

  // NEW HANDLERS
  const handleOpenCompanyResearch = (companyNameOrApplication: string | Application) => {
    if (typeof companyNameOrApplication === 'string') {
      // Called without application context (from AI Assistant page)
      setCompanyToResearch(companyNameOrApplication);
      setCompanyResearchOpen(true);
    } else {
      // Called with application context (from Info dialog)
      const app = companyNameOrApplication;
      setCompanyToResearch(app.company);
      setApplicationForCompanyResearch(app);
      setCompanyResearchOpen(true);
    }
  };

  const handleOpenJobAnalyzer = (jobDescTextOrApplication: string | Application) => {
    if (typeof jobDescTextOrApplication === 'string') {
      // Called without application context (from AI Assistant page)
      setJobDescToAnalyze(jobDescTextOrApplication);
      setJobAnalyzerOpen(true);
    } else {
      // Called with application context (from Info dialog)
      const app = jobDescTextOrApplication;
      setJobDescToAnalyze(app.jobDescription || app.jobUrl || '');
      setApplicationForJobAnalyzer(app);
      setJobAnalyzerOpen(true);
    }
  };

  const handleUploadCV = (application: Application) => {
    setApplicationForUpload(application);
    setCvUploadType('cv');
    setCvUploadOpen(true);
  };

  const handleUploadCoverLetter = (application: Application) => {
    setApplicationForUpload(application);
    setCvUploadType('coverLetter');
    setCvUploadOpen(true);
  };

  const handleAnalyzeCV = (application: Application) => {
    setApplicationForCVMatcher(application);
    setCvMatcherOpen(true);
  };

  const handleCVUploadSuccess = async (uploadedCVId: string) => {
    if (!applicationForUpload) return;

    try {
      // If application doesn't exist yet (new application), store the uploaded ID
      // Don't move the document to application folder yet - it will be copied when the application is saved
      if (!applicationForUpload.id) {
        console.log(`✅ Document (${cvUploadType}) uploaded and ready for new application`);
        
        // Store the uploaded document ID so it can be auto-selected in the form
        // The document stays in its original folder (CV or Cover Letter) for now
        if (cvUploadType === 'cv') {
          setUploadedCVId(uploadedCVId);
          console.log('📝 [Applications] Stored uploaded CV ID for auto-selection:', uploadedCVId);
        } else {
          setUploadedCoverLetterId(uploadedCVId);
          console.log('📝 [Applications] Stored uploaded Cover Letter ID for auto-selection:', uploadedCVId);
        }
        
        setCvUploadOpen(false);
        setApplicationForUpload(null);
        
        // Document remains in CV/Cover Letter folder and will be copied to application folder
        // when the application is created (handled in ApplicationFormDialog.handleSubmit)
        
        return;
      }
      
      // For existing applications, move document to application folder
      const applicationFolderName = getApplicationFolderName(applicationForUpload);
      const { updateCV } = await import('../services/cvService');
      await updateCV(uploadedCVId, { folder: applicationFolderName });
      
      // Link uploaded document to existing application
      const updateData: Partial<ApplicationFormData> = cvUploadType === 'cv'
        ? { cvId: uploadedCVId }
        : { coverLetterId: uploadedCVId };

      const updatedApplication = {
        ...applicationForUpload,
        ...updateData,
      } as Application;

      // Use hook's update method (optimistic update)
      await updateApplication(applicationForUpload.id, updatedApplication as ApplicationFormData);

      console.log(`✅ Document (${cvUploadType}) linked to application and moved to folder: ${applicationFolderName}`);
      
      // Update selectedApplication if dialog is open for this application
      // This ensures the form dialog updates immediately without closing/reopening
      if (selectedApplication && selectedApplication.id === applicationForUpload.id) {
        setSelectedApplication(updatedApplication);
      }
      
      // Close upload dialog (hook handles refresh automatically)
      setCvUploadOpen(false);
      setApplicationForUpload(null);
    } catch (err) {
      console.error('Error linking document to application:', err);
      setError('Errore nel collegamento del documento alla candidatura');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <ApplicationListSkeleton count={5} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('applications.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {applications.length} {t('applications.total')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', sm: 'flex' } }}>
          <Button
            variant={selectionMode ? 'contained' : 'outlined'}
            startIcon={selectionMode ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) {
                setSelectedIds([]);
              }
            }}
          >
            {selectionMode ? t('common.deselectAll') || 'Selezione' : t('common.selectAll') || 'Seleziona'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CalendarIcon />}
            onClick={() => navigate('/calendar')}
          >
            {t('applications.calendar')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArchiveIcon />}
            onClick={() => navigate('/archived')}
          >
            {t('applications.archived')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            {t('applications.newApplication')}
          </Button>
        </Stack>
      </Box>

      {error && (
        <ErrorAlert
          error={error}
          onRetry={() => {
            setError(null);
            // Retry logic here if needed
          }}
        />
      )}

      {/* Quick Filters */}
      {applications.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <ButtonGroup variant="outlined" size="small">
            <Button
              variant={quickFilter === 'noResponse' ? 'contained' : 'outlined'}
              onClick={() => {
                setQuickFilter(quickFilter === 'noResponse' ? null : 'noResponse');
                setStatusFilter(null); // Clear status filter when using quick filter
                navigate('/applications'); // Clear URL params
              }}
            >
              {t('applications.filters.noResponse') || 'Senza risposta'}
            </Button>
            <Button
              variant={quickFilter === 'withInterview' ? 'contained' : 'outlined'}
              onClick={() => {
                setQuickFilter(quickFilter === 'withInterview' ? null : 'withInterview');
                setStatusFilter(null);
                navigate('/applications');
              }}
            >
              {t('applications.filters.withInterview') || 'Con colloquio'}
            </Button>
            <Button
              variant={quickFilter === 'toFollow' ? 'contained' : 'outlined'}
              onClick={() => {
                setQuickFilter(quickFilter === 'toFollow' ? null : 'toFollow');
                setStatusFilter(null);
                navigate('/applications');
              }}
            >
              {t('applications.filters.toFollow') || 'Da seguire'}
            </Button>
          </ButtonGroup>
          {(statusFilter || quickFilter) && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setStatusFilter(null);
                setQuickFilter(null);
                navigate('/applications');
              }}
            >
              {t('common.clearFilters') || 'Rimuovi filtri'}
            </Button>
          )}
        </Box>
      )}

      {applications.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: 'background.paper',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {t('applications.noApplications')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('applications.startAdding')}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
            {t('applications.addFirst')}
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            height: 'calc(100vh - 250px)', // Fixed height: full viewport minus header/footer
            minHeight: '500px',
            overflow: 'auto', // Enable both horizontal and vertical scroll
            backgroundColor: 'background.default',
            borderRadius: 2,
            p: 2,
          }}
        >
          <KanbanBoard
            applications={applications}
            statusFilter={statusFilter}
            quickFilter={quickFilter}
            onEdit={handleEdit}
            onDelete={handleDeleteApplication}
            onViewDetails={handleViewDetails}
            onOptimizeCV={handleOptimizeCV}
            onGenerateCoverLetter={handleGenerateCoverLetter}
            onUploadCV={handleUploadCV}
            onUploadCoverLetter={handleUploadCoverLetter}
            onAnalyzeCV={handleAnalyzeCV}
            onSendEmail={handleSendEmail}
            onOpenCompanyResearch={handleOpenCompanyResearch}
            onOpenJobAnalyzer={handleOpenJobAnalyzer}
            onRefresh={() => refetch(false)}
            selectedIds={selectedIds}
            selectionMode={selectionMode}
            onSelect={handleSelect}
          />
        </Box>
      )}

      {/* Send Application Email (AI) */}
      {currentUser && applicationForEmail && (
        <Suspense fallback={<div>Loading...</div>}>
          <EmailAIDialog
            open={emailDialogOpen}
          onClose={() => {
            setEmailDialogOpen(false);
            setApplicationForEmail(null);
          }}
          userId={currentUser.uid}
          prefilledCompanyName={applicationForEmail.company}
          prefilledJobTitle={applicationForEmail.jobTitle}
          prefilledCompanyEmail={applicationForEmail.companyEmail}
          prefilledJobDescription={applicationForEmail.jobDescription}
          prefilledJobUrl={applicationForEmail.jobUrl}
          preselectedCVId={applicationForEmail.cvId}
          preselectedCoverLetterId={applicationForEmail.coverLetterId}
          applicationStatus={applicationForEmail.status}
          applicationId={applicationForEmail.id}
          lockCVSelection={!!applicationForEmail.cvId}
          lockCoverLetterSelection={!!applicationForEmail.coverLetterId}
          />
        </Suspense>
      )}

      {/* Bulk Actions */}
      {selectionMode && (
        <BulkActions
          selectedIds={selectedIds}
          applications={applications}
          onDelete={handleBulkDelete}
          onArchive={handleBulkArchive}
          onStatusChange={handleBulkStatusChange}
          onExport={handleBulkExport}
          onClearSelection={() => {
            setSelectedIds([]);
            setSelectionMode(false);
          }}
        />
      )}

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleOpenDialog}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
          zIndex: selectionMode ? 999 : 1000, // Below BulkActions when in selection mode
        }}
      >
        <AddIcon />
      </Fab>

      <Suspense fallback={<div>Loading...</div>}>
        <ApplicationFormDialog
          open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedApplication(null);
          // Reset uploaded document IDs when closing dialog
          setUploadedCVId(null);
          setUploadedCoverLetterId(null);
        }}
        onSubmit={selectedApplication ? handleUpdateApplication : handleCreateApplication}
        application={selectedApplication}
        onOpenCompanyResearch={handleOpenCompanyResearch}
        onOpenJobAnalyzer={handleOpenJobAnalyzer}
        onUploadCV={handleUploadCV}
        onUploadCoverLetter={handleUploadCoverLetter}
        onAnalyzeCV={handleAnalyzeCV}
        onOptimizeCV={handleOptimizeCV}
        onGenerateCoverLetter={handleGenerateCoverLetter}
        autoSelectCVId={uploadedCVId}
        autoSelectCoverLetterId={uploadedCoverLetterId}
        />
      </Suspense>

      {currentUser && applicationForTailoring && (
        <Suspense fallback={<div>Loading...</div>}>
          <CVTailoringDialog
          open={cvTailoringOpen}
          onClose={() => {
            setCvTailoringOpen(false);
            setApplicationForTailoring(null);
          }}
          userId={currentUser.uid}
          prefilledJobDescription={applicationForTailoring.jobDescription}
          prefilledJobUrl={applicationForTailoring.jobUrl}
          prefilledCompany={applicationForTailoring.company}
          prefilledJobTitle={applicationForTailoring.jobTitle}
          prefilledCVId={applicationForTailoring.cvId}
          lockCVSelection={!!applicationForTailoring.cvId}
          />
        </Suspense>
      )}

      {applicationForCoverLetter && (
        <Suspense fallback={<div>Loading...</div>}>
          <CoverLetterGenerator
          open={coverLetterGeneratorOpen}
          onClose={() => {
            setCoverLetterGeneratorOpen(false);
            setApplicationForCoverLetter(null);
          }}
          onSaveToApplication={handleSaveCoverLetterToApplication}
          prefilledCompany={applicationForCoverLetter.company}
          prefilledJobTitle={applicationForCoverLetter.jobTitle}
          prefilledJobDescription={applicationForCoverLetter.jobDescription}
          prefilledJobUrl={applicationForCoverLetter.jobUrl}
          prefilledCVId={applicationForCoverLetter.cvId}
          lockCVSelection={!!applicationForCoverLetter.cvId}
          />
        </Suspense>
      )}

      {/* Company Research Dialog */}
      <Suspense fallback={<div>Loading...</div>}>
        <CompanyResearchDialog
        open={companyResearchOpen}
        onClose={() => {
          setCompanyResearchOpen(false);
          setCompanyToResearch('');
          setApplicationForCompanyResearch(null);
        }}
        prefilledCompany={_companyToResearch}
        applicationCompany={applicationForCompanyResearch?.company}
        applicationJobTitle={applicationForCompanyResearch?.jobTitle}
        />
      </Suspense>

      {/* Job Analyzer Dialog */}
      <Suspense fallback={<div>Loading...</div>}>
        <JobAnalyzerDialog
        open={jobAnalyzerOpen}
        onClose={() => {
          setJobAnalyzerOpen(false);
          setJobDescToAnalyze('');
          setApplicationForJobAnalyzer(null);
        }}
        prefilledJobDescription={applicationForJobAnalyzer?.jobDescription}
        prefilledJobUrl={applicationForJobAnalyzer?.jobUrl}
        applicationCompany={applicationForJobAnalyzer?.company}
        applicationJobTitle={applicationForJobAnalyzer?.jobTitle}
        />
      </Suspense>

      {/* CV Matcher Dialog */}
      <Suspense fallback={<div>Loading...</div>}>
        <CVMatcherDialog
        open={cvMatcherOpen}
        onClose={() => {
          setCvMatcherOpen(false);
          setApplicationForCVMatcher(null);
        }}
        prefilledCVId={_applicationForCVMatcher?.cvId}
        prefilledJobDescription={_applicationForCVMatcher?.jobDescription}
        prefilledJobUrl={_applicationForCVMatcher?.jobUrl}
        prefilledJobTitle={_applicationForCVMatcher?.jobTitle}
        applicationCompany={_applicationForCVMatcher?.company}
        lockCVSelection={!!_applicationForCVMatcher?.cvId}
        />
      </Suspense>

      {/* CV Upload Dialog */}
      {currentUser && applicationForUpload && (
        <Suspense fallback={<div>Loading...</div>}>
          <CVUploadDialog
          open={cvUploadOpen}
          onClose={() => {
            setCvUploadOpen(false);
            setApplicationForUpload(null);
          }}
          userId={currentUser.uid}
          onSuccess={handleCVUploadSuccess}
          suggestedCategory={cvUploadType === 'cv' ? 'CV' : 'Cover Letter'}
          autoAssignFolder={cvUploadType === 'cv' ? 'CV' : 'Cover Letter'}
          lockFolder={!!applicationForUpload.id}
          hideFolderField={!applicationForUpload.id}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete} maxWidth="sm" fullWidth>
        <DialogTitle>Conferma Eliminazione</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Sei sicuro di voler archiviare questa candidatura? Potrai ripristinarla dallo Storico.
          </Typography>
          {applicationToDelete && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                {applicationToDelete.jobTitle}
              </Typography>
              <Typography variant="caption">
                {applicationToDelete.company}
              </Typography>
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo eliminazione (opzionale)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Es: Stipendio troppo basso, troppo lontano, ruolo non adatto..."
            helperText="Questo testo verrà salvato nelle Note della candidatura"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>
            Annulla
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Elimina
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Application Dialog */}
      <Suspense fallback={<div>Loading...</div>}>
        <QuickApplicationDialog
          open={quickApplicationDialogOpen}
        onClose={() => setQuickApplicationDialogOpen(false)}
        onSubmit={handleQuickCreateApplication}
        />
      </Suspense>

      {/* Floating Action Button */}
      <FloatingActionButton
        onQuickApplication={() => setQuickApplicationDialogOpen(true)}
        onNewApplication={() => {
          setDialogOpen(true);
          setSelectedApplication(null);
        }}
        onAIAssistant={() => navigate('/ai-assistant')}
        onCalendar={() => navigate('/calendar')}
        onArchived={() => navigate('/archived')}
      />
    </Box>
  );
};

export default Applications;


