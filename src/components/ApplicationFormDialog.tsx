import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Transform as TransformIcon,
  Analytics as AnalyticsIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { getUserCVs, getCV } from '../services/cvService';
import { getDocumentIconEmoji } from '../utils/documentIcons';
import { getApplicationFolderName } from '../utils/documentFolders';
import { GAEvents } from '../services/googleAnalytics';
import type { Application, ApplicationFormData, CV } from '../types';
// Import refactored components
import { ApplicationBasicInfo } from './application-form/ApplicationBasicInfo';
import { ApplicationJobDescription } from './application-form/ApplicationJobDescription';
import { ApplicationSalaryInfo } from './application-form/ApplicationSalaryInfo';
import { ApplicationStatusInfo } from './application-form/ApplicationStatusInfo';
import { ApplicationTags } from './application-form/ApplicationTags';
import { ApplicationNotes } from './application-form/ApplicationNotes';
import { ApplicationFollowUp } from './application-form/ApplicationFollowUp';

interface ApplicationFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ApplicationFormData) => void;
  application?: Application | null;
  viewOnly?: boolean; // If true, hide submit button (read-only mode)
  onOpenCompanyResearch?: (companyNameOrApplication: string | Application) => void;
  onOpenJobAnalyzer?: (jobDescriptionTextOrApplication: string | Application) => void;
  onUploadCV?: (application: Application) => void;
  onUploadCoverLetter?: (application: Application) => void;
  onAnalyzeCV?: (application: Application) => void;
  onOptimizeCV?: (application: Application) => void;
  onGenerateCoverLetter?: (application: Application) => void;
  autoSelectCVId?: string | null; // Auto-select this CV ID when provided (for newly uploaded CVs)
  autoSelectCoverLetterId?: string | null; // Auto-select this Cover Letter ID when provided (for newly uploaded Cover Letters)
}

const ApplicationFormDialog: React.FC<ApplicationFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  application,
  viewOnly = false,
  onOpenCompanyResearch,
  onOpenJobAnalyzer,
  onUploadCV,
  onUploadCoverLetter,
  onAnalyzeCV,
  onOptimizeCV,
  onGenerateCoverLetter,
  autoSelectCVId,
  autoSelectCoverLetterId,
}) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  
  // Initialize jobDescInputType based on what's available in the application
  const getInitialJobDescType = (): 'url' | 'text' => {
    if (application) {
      // If application has URL, prefer URL; otherwise use text
      return application.jobUrl ? 'url' : 'text';
    }
    return 'url'; // Default for new applications
  };
  
  const [jobDescInputType, setJobDescInputType] = useState<'url' | 'text'>(getInitialJobDescType());

  // Helper to safely format dates
  const safeFormatDate = (date: any): string | null => {
    if (!date) return null;
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return null;
      return format(dateObj, "dd MMMM yyyy 'alle' HH:mm", { locale: it });
    } catch {
      return null;
    }
  };

  const [cvs, setCVs] = useState<CV[]>([]);
  const [coverLetters, setCoverLetters] = useState<CV[]>([]);
  // Store recently uploaded documents for immediate display
  const [recentlyUploadedCVs, setRecentlyUploadedCVs] = useState<Map<string, CV>>(new Map());
  const [recentlyUploadedCoverLetters, setRecentlyUploadedCoverLetters] = useState<Map<string, CV>>(new Map());
  const [formData, setFormData] = useState<ApplicationFormData>({
    jobTitle: '',
    company: '',
    location: '',
    isRemote: false,
    jobUrl: '',
    jobDescription: '',
    companyEmail: '',
    salaryMin: undefined,
    salaryMax: undefined,
    salaryCurrency: 'EUR',
    source: '' as any, // Empty by default, user must select
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
  });

  const [tagInput, setTagInput] = useState('');

  // Fetch user's CVs and Cover Letters
  // Refresh when dialog opens or when application changes to show newly uploaded documents
  useEffect(() => {
    const fetchCVs = async () => {
      if (currentUser && open) {
        try {
          const userCVs = await getUserCVs(currentUser.uid);
          
          // Determine application folder if editing existing application or if form has jobTitle/company
          const applicationFolderName = (application && application.jobTitle && application.company)
            ? getApplicationFolderName(application)
            : (formData.jobTitle && formData.company)
            ? `${formData.company} - ${formData.jobTitle}`
            : null;
          
          // Filter CVs based on application status
          // For "saved" status: only CVs from "CV" folder and application folder
          // For other statuses: CVs with "CV" tag OR in "CV" folder OR in application folder
          const isSavedStatus = (application?.status || formData.status) === 'saved';
          
          const actualCVs = userCVs.filter(cv => {
            // Exclude documents in "Cover Letter" folder (unless they're in application folder with CV tag)
            if (cv.folder === 'Cover Letter' && (!applicationFolderName || cv.folder !== applicationFolderName)) {
              return false;
            }
            
            const isInCVFolder = cv.folder === 'CV';
            const isInApplicationFolder = applicationFolderName && cv.folder === applicationFolderName;
            
            // For "saved" status: only show CVs from CV folder or application folder
            if (isSavedStatus) {
              return isInCVFolder || isInApplicationFolder;
            }
            
            // For other statuses: use existing logic (tag OR folder)
            const hasCVTag = cv.tags?.some(tag => tag.toLowerCase() === 'cv') || false;
            const isCoverLetter = cv.tags?.some(tag => 
              tag.toLowerCase().includes('cover letter') || 
              tag.toLowerCase() === 'cl'
            ) || false;
            
            return (hasCVTag || isInCVFolder || isInApplicationFolder) && !isCoverLetter;
          });
          
          // Sort CVs: application folder first, then CV folder
          actualCVs.sort((a, b) => {
            const aInApp = applicationFolderName && a.folder === applicationFolderName;
            const bInApp = applicationFolderName && b.folder === applicationFolderName;
            if (aInApp && !bInApp) return -1;
            if (!aInApp && bInApp) return 1;
            return 0; // Keep original order within same folder
          });
          
          // Filter Cover Letters based on application status
          // For "saved" status: only Cover Letters from "Cover Letter" folder and application folder
          // For other statuses: Cover Letters with "Cover Letter" tag OR in "Cover Letter" folder OR in application folder
          const actualCoverLetters = userCVs.filter(cv => {
            const isInCoverLetterFolder = cv.folder === 'Cover Letter';
            const isInApplicationFolder = applicationFolderName && cv.folder === applicationFolderName;
            
            // Exclude CVs
            const hasCVTag = cv.tags?.some(tag => tag.toLowerCase() === 'cv') || false;
            const isInCVFolder = cv.folder === 'CV';
            
            // For "saved" status: only show Cover Letters from Cover Letter folder or application folder
            if (isSavedStatus) {
              return (isInCoverLetterFolder || isInApplicationFolder) && !hasCVTag && !isInCVFolder;
            }
            
            // For other statuses: use existing logic (tag OR folder)
            const hasCoverLetterTag = cv.tags?.some(tag => 
              tag.toLowerCase().includes('cover letter') || 
              tag.toLowerCase() === 'cl'
            ) || false;
            
            return (hasCoverLetterTag || isInCoverLetterFolder || isInApplicationFolder) && !hasCVTag && !isInCVFolder;
          });
          
          // Sort Cover Letters: application folder first, then Cover Letter folder
          actualCoverLetters.sort((a, b) => {
            const aInApp = applicationFolderName && a.folder === applicationFolderName;
            const bInApp = applicationFolderName && b.folder === applicationFolderName;
            if (aInApp && !bInApp) return -1;
            if (!aInApp && bInApp) return 1;
            return 0; // Keep original order within same folder
          });
          
          // If we have auto-selected IDs, also fetch those documents individually
          // This ensures they're available even if they're not in the filtered lists yet
          const newRecentlyUploadedCVs = new Map<string, CV>();
          const newRecentlyUploadedCoverLetters = new Map<string, CV>();
          
          if (autoSelectCVId && !actualCVs.find(cv => cv.id === autoSelectCVId)) {
            try {
              const cvDoc = await getCV(autoSelectCVId);
              if (cvDoc) {
                newRecentlyUploadedCVs.set(autoSelectCVId, cvDoc);
              }
            } catch (err) {
              console.error('Error fetching recently uploaded CV:', err);
            }
          }
          
          if (autoSelectCoverLetterId && !actualCoverLetters.find(cl => cl.id === autoSelectCoverLetterId)) {
            try {
              const clDoc = await getCV(autoSelectCoverLetterId);
              if (clDoc) {
                newRecentlyUploadedCoverLetters.set(autoSelectCoverLetterId, clDoc);
              }
            } catch (err) {
              console.error('Error fetching recently uploaded Cover Letter:', err);
            }
          }
          
          // Also fetch CV from application if it's not in the filtered list
          if (application?.cvId && !actualCVs.find(cv => cv.id === application.cvId)) {
            try {
              const cvDoc = await getCV(application.cvId);
              if (cvDoc) {
                newRecentlyUploadedCVs.set(application.cvId, cvDoc);
              }
            } catch (err) {
              console.error('Error fetching application CV:', err);
            }
          }
          
          // Also fetch Cover Letter from application if it's not in the filtered list
          if (application?.coverLetterId && !actualCoverLetters.find(cl => cl.id === application.coverLetterId)) {
            try {
              const clDoc = await getCV(application.coverLetterId);
              if (clDoc) {
                newRecentlyUploadedCoverLetters.set(application.coverLetterId, clDoc);
              }
            } catch (err) {
              console.error('Error fetching application Cover Letter:', err);
            }
          }
          
          setRecentlyUploadedCVs(newRecentlyUploadedCVs);
          setRecentlyUploadedCoverLetters(newRecentlyUploadedCoverLetters);
          setCVs(actualCVs);
          setCoverLetters(actualCoverLetters);
        } catch (error) {
          console.error('Error fetching CVs:', error);
        }
      }
    };
    fetchCVs();
  }, [currentUser, open, application, autoSelectCVId, autoSelectCoverLetterId, formData.jobTitle, formData.company]); // Refresh when dialog opens, application changes, uploaded IDs change, or form data changes

  useEffect(() => {
    if (application && open) {
      // Only update form data when dialog is open and application changes
      setFormData({
        jobTitle: application.jobTitle || '',
        company: application.company || '',
        location: application.location || '',
        isRemote: application.isRemote || false,
        jobUrl: application.jobUrl || '',
        jobDescription: application.jobDescription || '',
        companyEmail: application.companyEmail || '',
        salaryMin: application.salaryMin,
        salaryMax: application.salaryMax,
        salaryCurrency: application.salaryCurrency || 'EUR',
        source: application.source || 'other',
        status: application.status || 'saved',
        priority: application.priority || 'medium',
        notes: application.notes || '',
        tags: application.tags || [],
        cvId: application.cvId,
        coverLetterId: application.coverLetterId,
        recruiterName: application.recruiterName || '',
        recruiterEmail: application.recruiterEmail || '',
        recruiterLinkedin: application.recruiterLinkedin || '',
        followUpEnabled: application.followUpEnabled || false,
        nextFollowUpDate: application.nextFollowUpDate,
      });
      // Update jobDescInputType based on what's available
      setJobDescInputType(application.jobUrl ? 'url' : 'text');
    } else if (!application && open) {
      // Reset form when creating new application
      setFormData({
        jobTitle: '',
        company: '',
        location: '',
        isRemote: false,
        jobUrl: '',
        jobDescription: '',
        companyEmail: '',
        salaryMin: undefined,
        salaryMax: undefined,
        salaryCurrency: 'EUR',
        source: '' as any, // Empty by default, user must select
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
      });
      setTagInput('');
    }
  }, [application, open]);

  // Auto-select uploaded documents when they become available
  useEffect(() => {
    if (!application && open) {
      // Only auto-select if creating a new application (not editing)
      if (autoSelectCVId && !formData.cvId) {
        // Check if the CV is available in the list or recently uploaded
        const cvExists = cvs.some(cv => cv.id === autoSelectCVId) || recentlyUploadedCVs.has(autoSelectCVId);
        if (cvExists) {
          console.log('✅ Auto-selecting uploaded CV:', autoSelectCVId);
          setFormData(prev => ({ ...prev, cvId: autoSelectCVId }));
        }
      }
      
      if (autoSelectCoverLetterId && !formData.coverLetterId) {
        // Check if the Cover Letter is available in the list or recently uploaded
        const clExists = coverLetters.some(cl => cl.id === autoSelectCoverLetterId) || recentlyUploadedCoverLetters.has(autoSelectCoverLetterId);
        if (clExists) {
          console.log('✅ Auto-selecting uploaded Cover Letter:', autoSelectCoverLetterId);
          setFormData(prev => ({ ...prev, coverLetterId: autoSelectCoverLetterId }));
        }
      }
    }
  }, [autoSelectCVId, autoSelectCoverLetterId, cvs, coverLetters, recentlyUploadedCVs, recentlyUploadedCoverLetters, formData.cvId, formData.coverLetterId, application, open]);

  // Auto-save to localStorage with debounce
  useEffect(() => {
    if (!open || application) return; // Only auto-save for new applications
    
    const timeoutId = setTimeout(() => {
      const autoSaveKey = `application_form_draft_${currentUser?.uid || 'anonymous'}`;
      try {
        localStorage.setItem(autoSaveKey, JSON.stringify(formData));
      } catch (error) {
        console.error('Error saving draft to localStorage:', error);
      }
    }, 1000); // Debounce: save after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [formData, open, application, currentUser]);

  // Load draft from localStorage when opening new application dialog
  useEffect(() => {
    if (!open || application || !currentUser) return;
    
    const autoSaveKey = `application_form_draft_${currentUser.uid}`;
    try {
      const savedDraft = localStorage.getItem(autoSaveKey);
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        // Only load if there's meaningful data (company or jobTitle)
        if (draftData.company || draftData.jobTitle) {
          setFormData(prev => ({ ...prev, ...draftData }));
        }
      }
    } catch (error) {
      console.error('Error loading draft from localStorage:', error);
    }
  }, [open, application, currentUser]);

  // Clear draft when form is submitted or closed
  const clearDraft = () => {
    if (!currentUser) return;
    const autoSaveKey = `application_form_draft_${currentUser.uid}`;
    try {
      localStorage.removeItem(autoSaveKey);
    } catch (error) {
      console.error('Error clearing draft from localStorage:', error);
    }
  };

  const handleChange = (field: keyof ApplicationFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToDelete),
    });
  };

  const handleSubmit = async () => {
    console.log('🏷️ [ApplicationForm] Submitting with tags:', formData.tags);
    console.log('🏷️ [ApplicationForm] Full formData:', formData);
    
    // If we have an application (or are creating one) and CV/Cover Letter selected,
    // copy them to the application folder and remove originals from "CV"/"Cover Letter" folders
    let finalFormData = { ...formData };
    
    if (currentUser && formData.jobTitle && formData.company) {
      const applicationFolderName = `${formData.company} - ${formData.jobTitle}`;
      
      try {
        // Copy CV if selected and not already in application folder
        if (finalFormData.cvId) {
          const { copyCVToFolder, getCV } = await import('../services/cvService');
          
          // Check current folder of CV
          const originalCV = await getCV(finalFormData.cvId);
          
          // Only copy if not already in application folder
          if (originalCV?.folder !== applicationFolderName) {
            const copiedCVId = await copyCVToFolder(
              finalFormData.cvId,
              applicationFolderName,
              currentUser.uid,
              formData.company,
              formData.jobTitle
            );
            finalFormData.cvId = copiedCVId;
            console.log('✅ CV copied to application folder:', applicationFolderName);
            // Original CV remains in its original folder (CV/CL) for future use
          } else {
            console.log('✅ CV already in application folder, skipping copy');
          }
        }
        
        // Copy Cover Letter if selected and not already in application folder
        if (finalFormData.coverLetterId) {
          const { copyCVToFolder, getCV } = await import('../services/cvService');
          
          // Check current folder of Cover Letter
          const originalCL = await getCV(finalFormData.coverLetterId);
          
          // Only copy if not already in application folder
          if (originalCL?.folder !== applicationFolderName) {
            const copiedCoverLetterId = await copyCVToFolder(
              finalFormData.coverLetterId,
              applicationFolderName,
              currentUser.uid,
              formData.company,
              formData.jobTitle
            );
            finalFormData.coverLetterId = copiedCoverLetterId;
            console.log('✅ Cover Letter copied to application folder:', applicationFolderName);
            // Original Cover Letter remains in its original folder (CV/CL) for future use
          } else {
            console.log('✅ Cover Letter already in application folder, skipping copy');
          }
        }
      } catch (error) {
        console.error('Error copying documents to application folder:', error);
        // Continue with submission even if copy fails (use original IDs)
      }
    }
    
    // Track analytics event
    if (application) {
      GAEvents.updateApplication(finalFormData.status);
    } else {
      GAEvents.createApplication(finalFormData.status);
    }
    
    clearDraft(); // Clear draft when submitting
    onSubmit(finalFormData);
    onClose();
  };

  const [submitting, setSubmitting] = React.useState(false);

  const handleDialogClose = async () => {
    // If closing without saving and we have company/jobTitle, cleanup orphaned folder
    if (!application && formData.company && formData.jobTitle && currentUser) {
      try {
        const { cleanupFolderForCancelledApplication } = await import('../services/folderCleanupService');
        await cleanupFolderForCancelledApplication(
          currentUser.uid,
          formData.company,
          formData.jobTitle
        );
      } catch (error) {
        console.error('Error cleaning up folder for cancelled application:', error);
        // Don't block dialog close on cleanup error
      }
    }
    
    clearDraft(); // Clear draft when closing
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullWidth>
      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          try {
            await handleSubmit();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <DialogTitle>
          {application 
            ? (application.status !== 'saved' ? t('applicationForm.infoTitle') : t('applicationForm.editTitle'))
            : t('applicationForm.title')
          }
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          
          {/* Basic Info Section */}
          <ApplicationBasicInfo
            formData={formData}
            application={application}
            onChange={handleChange}
            onOpenCompanyResearch={onOpenCompanyResearch}
          />

          {/* Job Description Section */}
          <ApplicationJobDescription
            formData={formData}
            application={application}
            jobDescInputType={jobDescInputType}
            onJobDescInputTypeChange={setJobDescInputType}
            onChange={handleChange}
            onOpenJobAnalyzer={onOpenJobAnalyzer}
            currentUser={currentUser}
          />

          {/* Company Email */}
          <TextField
            fullWidth
            type="email"
            label={t('applicationForm.companyEmail')}
            value={formData.companyEmail || ''}
            onChange={(e) => handleChange('companyEmail', e.target.value)}
            placeholder="es: hr@company.com, jobs@company.com"
          />

          {/* Salary Info Section */}
          <ApplicationSalaryInfo
            formData={formData}
            onChange={handleChange}
          />

          {/* Status Info Section */}
          <ApplicationStatusInfo
            formData={formData}
            application={application}
            onChange={handleChange}
          />

          {/* 9. CV */}
          <Box>
            <TextField
              fullWidth
              select
              label={t('applicationForm.cv').replace(' (Opzionale)', '')}
              value={formData.cvId || ''}
              onChange={(e) => handleChange('cvId', e.target.value)}
              disabled={!!(application && application.status !== 'saved')}
              helperText={
                application && application.status !== 'saved'
                  ? '🔒 CV non modificabile dopo aver candidato'
                  : formData.cvId
                  ? 'CV selezionato'
                  : '⚠️ CV richiesto per spostare la candidatura'
              }
              InputProps={{
                endAdornment: (
                  <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
                    {onUploadCV && (application || (formData.jobTitle && formData.company)) && (
                      <Tooltip title="Carica CV">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (application) {
                              onUploadCV(application);
                            } else if (formData.jobTitle && formData.company) {
                              // For new application, create a temporary application object for upload
                              const tempApp = {
                                id: '',
                                userId: currentUser?.uid || '',
                                jobTitle: formData.jobTitle,
                                company: formData.company,
                                status: 'saved' as const,
                              } as Application;
                              onUploadCV(tempApp);
                            }
                          }}
                          disabled={
                            (application && application.status !== 'saved') ||
                            (!application && (!formData.jobTitle || !formData.company))
                          }
                          sx={{ 
                            color: (application && application.status !== 'saved') 
                              ? 'action.disabled' 
                              : 'info.main' 
                          }}
                        >
                          <CloudUploadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onAnalyzeCV && (
                      <Tooltip title={
                        !formData.cvId ? "Seleziona un CV per analizzarlo" :
                        !formData.jobTitle || !formData.company ? "Compila Posizione e Azienda per salvare nella cartella della candidatura" :
                        "Analizza CV con AI"
                      }>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (application) {
                                onAnalyzeCV(application);
                              } else if (formData.jobTitle && formData.company && formData.cvId) {
                                // For new application, create a temporary application object
                                const tempApp = {
                                  id: '',
                                  userId: currentUser?.uid || '',
                                  jobTitle: formData.jobTitle,
                                  company: formData.company,
                                  jobDescription: formData.jobDescription,
                                  jobUrl: formData.jobUrl,
                                  cvId: formData.cvId,
                                  status: 'saved' as const,
                                } as Application;
                                onAnalyzeCV(tempApp);
                              }
                            }}
                            disabled={
                              (application && application.status !== 'saved') ||
                              !formData.cvId || 
                              (!application && (!formData.jobTitle || !formData.company))
                            }
                            sx={{ 
                              color: (application && application.status !== 'saved') || !formData.cvId || (!application && (!formData.jobTitle || !formData.company))
                                ? 'action.disabled'
                                : '#7b1fa2',
                            }}
                          >
                            <AnalyticsIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {onOptimizeCV && (
                      <Tooltip title={
                        !formData.cvId ? "Seleziona un CV per adattarlo" :
                        !formData.jobTitle || !formData.company ? "Compila Posizione e Azienda per salvare nella cartella della candidatura" :
                        "Adatta CV con AI"
                      }>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (application) {
                                onOptimizeCV(application);
                              } else if (formData.jobTitle && formData.company && formData.cvId) {
                                // For new application, create a temporary application object
                                const tempApp = {
                                  id: '',
                                  userId: currentUser?.uid || '',
                                  jobTitle: formData.jobTitle,
                                  company: formData.company,
                                  jobDescription: formData.jobDescription,
                                  jobUrl: formData.jobUrl,
                                  cvId: formData.cvId,
                                  status: 'saved' as const,
                                } as Application;
                                onOptimizeCV(tempApp);
                              }
                            }}
                            disabled={
                              (application && application.status !== 'saved') ||
                              !formData.cvId || 
                              (!application && (!formData.jobTitle || !formData.company))
                            }
                            sx={{ 
                              color: (application && application.status !== 'saved') || !formData.cvId || (!application && (!formData.jobTitle || !formData.company))
                                ? 'action.disabled'
                                : '#f57c00',
                            }}
                          >
                            <TransformIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                ),
              }}
              SelectProps={{
                renderValue: (value: any) => {
                  if (!value) return '';
                  // Check in cvs list first, then in recently uploaded
                  let selectedCV = cvs.find(cv => cv.id === value);
                  if (!selectedCV && recentlyUploadedCVs.has(value)) {
                    selectedCV = recentlyUploadedCVs.get(value)!;
                  }
                  if (selectedCV) {
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '16px' }}>{getDocumentIconEmoji(selectedCV.category)}</span>
                        <span>{selectedCV.name} (v{selectedCV.version})</span>
                      </Box>
                    );
                  }
                  return value; // Fallback to ID if not found
                },
              }}
            >
              <MenuItem value="">{t('applicationForm.selectCV')}</MenuItem>
              {cvs.map((cv) => (
                <MenuItem key={cv.id} value={cv.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: '16px' }}>{getDocumentIconEmoji(cv.category)}</span>
                    <span>{cv.name} (v{cv.version})</span>
                  </Box>
                </MenuItem>
              ))}
              {/* Include recently uploaded CVs that aren't in the main list */}
              {Array.from(recentlyUploadedCVs.values())
                .filter(cv => !cvs.find(existing => existing.id === cv.id))
                .map((cv) => (
                  <MenuItem key={cv.id} value={cv.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: '16px' }}>{getDocumentIconEmoji(cv.category)}</span>
                      <span>{cv.name} (v{cv.version})</span>
                    </Box>
                  </MenuItem>
                ))}
            </TextField>
          </Box>

          {/* 10. Cover Letter */}
          <Box>
            <TextField
              fullWidth
              select
              label="Cover Letter"
              value={formData.coverLetterId || ''}
              onChange={(e) => handleChange('coverLetterId', e.target.value)}
              disabled={!!(application && application.status !== 'saved')}
              helperText={
                application && application.status !== 'saved'
                  ? '🔒 Non modificabile dopo aver candidato'
                  : formData.coverLetterId
                  ? 'Cover Letter selezionata'
                  : ''
              }
              InputProps={{
                endAdornment: (
                  <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
                    {onUploadCoverLetter && (application || (formData.jobTitle && formData.company)) && (
                      <Tooltip title="Carica Cover Letter">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (application) {
                              onUploadCoverLetter(application);
                            } else if (formData.jobTitle && formData.company) {
                              // For new application, create a temporary application object for upload
                              const tempApp = {
                                id: '',
                                userId: currentUser?.uid || '',
                                jobTitle: formData.jobTitle,
                                company: formData.company,
                                status: 'saved' as const,
                              } as Application;
                              onUploadCoverLetter(tempApp);
                            }
                          }}
                          disabled={
                            (application && application.status !== 'saved') ||
                            (!application && (!formData.jobTitle || !formData.company))
                          }
                          sx={{ 
                            color: (application && application.status !== 'saved') 
                              ? 'action.disabled' 
                              : 'info.main' 
                          }}
                        >
                          <CloudUploadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onGenerateCoverLetter && (
                      <Tooltip title={
                        !formData.coverLetterId ? "Seleziona una Cover Letter per generarla con AI" :
                        !formData.jobTitle || !formData.company ? "Compila Posizione e Azienda per salvare nella cartella della candidatura" :
                        "Genera Cover Letter con AI"
                      }>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (application) {
                                onGenerateCoverLetter(application);
                              } else if (formData.jobTitle && formData.company && formData.coverLetterId) {
                                // For new application, create a temporary application object
                                const tempApp = {
                                  id: '',
                                  userId: currentUser?.uid || '',
                                  jobTitle: formData.jobTitle,
                                  company: formData.company,
                                  jobDescription: formData.jobDescription,
                                  jobUrl: formData.jobUrl,
                                  coverLetterId: formData.coverLetterId,
                                  cvId: formData.cvId,
                                  status: 'saved' as const,
                                } as Application;
                                onGenerateCoverLetter(tempApp);
                              }
                            }}
                            disabled={
                              (application && application.status !== 'saved') ||
                              !formData.coverLetterId || 
                              (!application && (!formData.jobTitle || !formData.company))
                            }
                            sx={{ 
                              color: (application && application.status !== 'saved') || !formData.coverLetterId || (!application && (!formData.jobTitle || !formData.company))
                                ? 'action.disabled'
                                : '#c2185b',
                            }}
                          >
                            <DescriptionIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                ),
              }}
              SelectProps={{
                renderValue: (value: any) => {
                  if (!value) return '';
                  // Check in coverLetters list first, then in recently uploaded
                  let selectedCL = coverLetters.find(cl => cl.id === value);
                  if (!selectedCL && recentlyUploadedCoverLetters.has(value)) {
                    selectedCL = recentlyUploadedCoverLetters.get(value)!;
                  }
                  if (selectedCL) {
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '16px' }}>{getDocumentIconEmoji(selectedCL.category)}</span>
                        <span>{selectedCL.name}</span>
                      </Box>
                    );
                  }
                  return value; // Fallback to ID if not found
                },
              }}
            >
              <MenuItem value="">Nessuna Cover Letter</MenuItem>
              {coverLetters.map((cl) => (
                <MenuItem key={cl.id} value={cl.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: '16px' }}>{getDocumentIconEmoji(cl.category)}</span>
                    <span>{cl.name}</span>
                  </Box>
                </MenuItem>
              ))}
              {/* Include recently uploaded Cover Letters that aren't in the main list */}
              {Array.from(recentlyUploadedCoverLetters.values())
                .filter(cl => !coverLetters.find(existing => existing.id === cl.id))
                .map((cl) => (
                  <MenuItem key={cl.id} value={cl.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: '16px' }}>{getDocumentIconEmoji(cl.category)}</span>
                      <span>{cl.name}</span>
                    </Box>
                  </MenuItem>
                ))}
            </TextField>
          </Box>

          {/* Tags Section */}
          <ApplicationTags
            formData={formData}
            tagInput={tagInput}
            onTagInputChange={setTagInput}
            onAddTag={handleAddTag}
            onDeleteTag={handleDeleteTag}
          />

          {/* Notes Section */}
          <ApplicationNotes
            formData={formData}
            onChange={handleChange}
          />

          {/* Follow-Up Section */}
          <ApplicationFollowUp
            formData={formData}
            onChange={handleChange}
          />

          {/* Date Importanti - Solo in modalità view/edit */}
          {application && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📅 {t('applicationForm.dates')}
              </Typography>
              <List dense>
                {/* Data Creazione */}
                {application.createdAt && safeFormatDate(application.createdAt) && (
                  <ListItem>
                    <ListItemText
                      primary={t('applicationForm.dateCreated')}
                      secondary={safeFormatDate(application.createdAt)}
                    />
                  </ListItem>
                )}

                {/* Data Candidatura (quando si sposta in "applied") */}
                {application.appliedDate && safeFormatDate(application.appliedDate) && (
                  <ListItem>
                    <ListItemText
                      primary={t('applicationForm.dateApplied')}
                      secondary={safeFormatDate(application.appliedDate)}
                    />
                  </ListItem>
                )}

                {/* Date Colloqui */}
                {application.interviewDates && application.interviewDates.length > 0 && (
                  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                      {t('applicationForm.dateInterviewTitle')}
                    </Typography>
                    <List dense sx={{ pl: 2, width: '100%' }}>
                      {application.interviewDates.map((interview, index) => {
                        const formattedDate = safeFormatDate(interview.date);
                        if (!formattedDate) return null;
                        return (
                          <ListItem key={index}>
                            <ListItemText
                              primary={
                                interview.type === 'interview_1' ? t('applicationForm.interviewType1') :
                                interview.type === 'interview_2' ? t('applicationForm.interviewType2') :
                                interview.type === 'interview_3' ? t('applicationForm.interviewType3') :
                                interview.type === 'interview_4' ? t('applicationForm.interviewType4') :
                                t('applicationForm.interviewTypeGeneric')
                              }
                              secondary={`${formattedDate}${interview.notes ? ` - ${interview.notes}` : ''}`}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </ListItem>
                )}

                {/* Data Offerta */}
                {application.offerDate && safeFormatDate(application.offerDate) && (
                  <ListItem>
                    <ListItemText
                      primary={t('applicationForm.dateOffer')}
                      secondary={safeFormatDate(application.offerDate)}
                    />
                  </ListItem>
                )}

                {/* Data Rifiuto/Archiviazione */}
                {application.rejectedDate && safeFormatDate(application.rejectedDate) && (
                  <ListItem>
                    <ListItemText
                      primary={t('applicationForm.dateRejected')}
                      secondary={safeFormatDate(application.rejectedDate)}
                    />
                  </ListItem>
                )}

                {/* Data Eliminazione (per candidature archiviate) */}
                {(application as any).archivedAt && safeFormatDate((application as any).archivedAt) && (
                  <ListItem>
                    <ListItemText
                      primary={t('applicationForm.dateArchived')}
                      secondary={safeFormatDate((application as any).archivedAt)}
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button type="button" onClick={onClose} disabled={submitting}>{t('applicationForm.cancel')}</Button>
        {!viewOnly && (
          <Button
            type="submit"
            variant="contained"
            disabled={!formData.jobTitle || !formData.company || submitting}
          >
            {submitting ? 'Salvataggio...' : (application ? t('applicationForm.update') : t('applicationForm.submit'))}
          </Button>
        )}
      </DialogActions>
      </form>
    </Dialog>
  );
};

export default ApplicationFormDialog;

