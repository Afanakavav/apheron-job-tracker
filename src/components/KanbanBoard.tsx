import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Box, Paper, Typography, CircularProgress, Chip } from '@mui/material';
import type { Application, ApplicationStatus, InterviewDate } from '../types';
import ApplicationCard from './ApplicationCard';
import { updateApplicationStatus, updateApplication } from '../services/applicationService';
import { getUserCVs } from '../services/cvService';
import { useAuth } from '../contexts/AuthContext';
import { GAEvents } from '../services/googleAnalytics';
import InterviewDatePromptDialog from './InterviewDatePromptDialog';
import EmailApplicationDialog from './EmailApplicationDialog';
import EmailPreviewDialog, { EmailAttachment } from './EmailPreviewDialog';
import EmailAIDialog from './EmailAIDialog';
import { generateApplicationEmail } from '../services/emailGeneratorService';
import { sendEmailViaGmailWithAttachments } from '../services/gmailSendService';
import { useTranslation } from '../hooks/useTranslation';
import { ErrorAlert } from './ErrorAlert';
import { useNavigate } from 'react-router-dom';

interface KanbanBoardProps {
  applications: Application[];
  statusFilter?: ApplicationStatus | null;
  quickFilter?: 'noResponse' | 'withInterview' | 'toFollow' | null;
  onEdit: (application: Application) => void;
  onDelete: (applicationId: string) => void;
  onViewDetails: (application: Application) => void;
  onOptimizeCV?: (application: Application) => void;
  onGenerateCoverLetter?: (application: Application) => void;
  onUploadCV?: (application: Application) => void;
  onUploadCoverLetter?: (application: Application) => void;
  onAnalyzeCV?: (application: Application) => void;
  onSendEmail?: (application: Application) => void;
  onOpenCompanyResearch?: (companyName: string) => void;
  onOpenJobAnalyzer?: (jobDescription: string) => void;
  onRefresh: () => void;
  // Bulk selection
  selectedIds?: string[];
  selectionMode?: boolean;
  onSelect?: (applicationId: string, selected: boolean) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  applications,
  statusFilter,
  quickFilter,
  onEdit,
  onDelete,
  onViewDetails,
  onOptimizeCV,
  onGenerateCoverLetter,
  onUploadCV,
  onUploadCoverLetter,
  onAnalyzeCV,
  onSendEmail,
  onOpenCompanyResearch,
  onOpenJobAnalyzer,
  onRefresh,
  selectedIds = [],
  selectionMode = false,
  onSelect,
}) => {
  const { t, language } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const COLUMNS: { id: ApplicationStatus; title: string; color: string }[] = [
    { id: 'saved', title: t('applicationStatus.saved'), color: '#9e9e9e' },
    { id: 'applied', title: t('applicationStatus.applied'), color: '#2196f3' },
    { id: 'interview_1', title: t('applicationStatus.interview1'), color: '#ff9800' },
    { id: 'interview_2', title: t('applicationStatus.interview2'), color: '#9c27b0' },
    { id: 'interview_3', title: t('applicationStatus.interview3'), color: '#673ab7' },
    { id: 'interview_4', title: t('applicationStatus.interview4'), color: '#00bcd4' },
    { id: 'offer', title: t('applicationStatus.offer'), color: '#4caf50' },
    { id: 'rejected', title: t('applicationStatus.rejected'), color: '#f44336' },
  ];

  // Helper function to get status order (for validation)
  const getStatusOrder = (status: ApplicationStatus): number => {
    const order: Record<ApplicationStatus, number> = {
      saved: 0,
      applied: 1,
      interview_1: 2,
      interview_2: 3,
      interview_3: 4,
      interview_4: 5,
      offer: 6,
      rejected: 7,
    };
    return order[status];
  };

  // Validate if a move is allowed based on business rules
  const isMoveAllowed = (sourceStatus: ApplicationStatus, destStatus: ApplicationStatus): boolean => {
    const sourceOrder = getStatusOrder(sourceStatus);
    const destOrder = getStatusOrder(destStatus);

    // Can always move forward
    if (destOrder > sourceOrder) {
      return true;
    }

    // Can move to rejected from any state
    if (destStatus === 'rejected') {
      return true;
    }

    // Cannot go back to "saved" if already applied
    if (destStatus === 'saved' && sourceOrder >= getStatusOrder('applied')) {
      return false;
    }

    // Cannot go back to "applied" if already had recruiter interview
    if (destStatus === 'applied' && sourceOrder >= getStatusOrder('interview_1')) {
      return false;
    }

    // Can move backward within interview stages (e.g., from interview_2 to interview_1)
    // But not to applied or saved
    if (sourceStatus.startsWith('interview_') && destStatus.startsWith('interview_')) {
      return true;
    }

    // Can move to offer from any interview stage
    if (destStatus === 'offer' && sourceStatus.startsWith('interview_')) {
      return true;
    }

    return false;
  };
  const [columns, setColumns] = useState<Record<ApplicationStatus, Application[]>>({} as any);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datePromptOpen, setDatePromptOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailAIDialogOpen, setEmailAIDialogOpen] = useState(false);
  const [applicationForEmailAI, setApplicationForEmailAI] = useState<Application | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [emailCompany, setEmailCompany] = useState('');
  const [emailType, setEmailType] = useState<'apply' | 'confirm'>('apply');
  const [initialAttachments, setInitialAttachments] = useState<EmailAttachment[]>([]);
  const isTransitioningRef = useRef(false); // Track dialog transition (using ref for immediate sync)
  const [pendingMove, setPendingMove] = useState<{
    applicationId: string;
    application: Application;
    newStatus: ApplicationStatus;
    sourceColumn: ApplicationStatus;
    destColumn: ApplicationStatus;
    selectedCVId?: string;
    selectedCoverLetterId?: string;
  } | null>(null);
  
  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  // Ref for the mouse move handler to properly clean it up
  const mouseMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  // Organize applications by status with filtering
  useEffect(() => {
    let filteredApps = [...applications];

    // Apply quick filters
    if (quickFilter === 'noResponse') {
      const now = new Date();
      filteredApps = filteredApps.filter((app) => {
        if (!app.appliedDate) return false;
        const appliedDate = new Date(app.appliedDate);
        const daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceApplied >= 7 && app.status === 'applied' && !app.interviewDates?.length;
      });
    } else if (quickFilter === 'withInterview') {
      filteredApps = filteredApps.filter((app) => {
        return app.interviewDates && app.interviewDates.length > 0;
      });
    } else if (quickFilter === 'toFollow') {
      filteredApps = filteredApps.filter((app) => {
        return app.followUpEnabled && app.nextFollowUpDate;
      });
    }

    // Apply status filter
    if (statusFilter) {
      filteredApps = filteredApps.filter((app) => app.status === statusFilter);
    }

    const organized: Record<ApplicationStatus, Application[]> = {
      saved: [],
      applied: [],
      interview_1: [],
      interview_2: [],
      interview_3: [],
      interview_4: [],
      offer: [],
      rejected: [],
    };

    filteredApps.forEach((app) => {
      if (organized[app.status]) {
        organized[app.status].push(app);
      }
    });

    setColumns(organized);
  }, [applications, statusFilter, quickFilter]);

  // Debug: Log email preview state changes
  useEffect(() => {
    console.log('📧 [KanbanBoard] Email preview state changed:', {
      emailPreviewOpen,
      hasGeneratedEmail: !!generatedEmail,
      hasPendingMove: !!pendingMove,
      emailCompany,
    });
  }, [emailPreviewOpen, generatedEmail, pendingMove, emailCompany]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    // Dropped in the same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Get source and destination columns
    // onDragUpdate ensures the destination column is visible and correctly identified
    const sourceColumn = source.droppableId as ApplicationStatus;
    const destColumn = destination.droppableId as ApplicationStatus;

    // Same column - just reordering
    if (sourceColumn === destColumn) {
      const newItems = Array.from(columns[sourceColumn]);
      const [removed] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, removed);

      setColumns({
        ...columns,
        [sourceColumn]: newItems,
      });
      return;
    }

    // ⚠️ BUSINESS RULE VALIDATION: Check if move is allowed
    if (!isMoveAllowed(sourceColumn, destColumn)) {
      let errorMessage = '';
      if (destColumn === 'saved') {
        errorMessage = t('applications.cannotReturnToSaved', { defaultValue: 'Non puoi tornare a "Da candidarsi" dopo aver già candidato.' });
      } else if (destColumn === 'applied') {
        errorMessage = t('applications.cannotReturnToApplied', { defaultValue: 'Non puoi tornare a "Candidatura inviata" dopo il colloquio con il recruiter.' });
      } else {
        errorMessage = t('applications.moveNotAllowed', { defaultValue: 'Questo spostamento non è consentito.' });
      }
      setError(errorMessage);
      return; // Block the move
    }

    // Moving to different column - update status
    setLoading(true);
    setError(null);

    try {
      const sourceItems = Array.from(columns[sourceColumn]);
      const destItems = Array.from(columns[destColumn]);
      const [movedItem] = sourceItems.splice(source.index, 1);

          // ⚠️ VALIDATION: CV is required to move from "Saved" to any other status
          if (sourceColumn === 'saved' && destColumn !== 'saved') {
            if (!movedItem.cvId) {
              // Block the move - CV is required!
              setError(t('applications.cvRequired'));
              setLoading(false);
              return; // Don't proceed with the move
            }
          }

      // 📧 EMAIL AUTOMATION: Check if moving from "saved" to "applied"
      if (sourceColumn === 'saved' && destColumn === 'applied') {
        // ALWAYS open email dialog (Gmail check happens later)
        console.log('📧 [KanbanBoard] Opening email dialog for:', movedItem.jobTitle);
        
        setPendingMove({
          applicationId: draggableId,
          application: movedItem,
          newStatus: destColumn,
          sourceColumn,
          destColumn,
        });
        setEmailDialogOpen(true);
        setLoading(false);
        return; // Wait for user decision
      }

      // Check if moving to interview status - prompt for date
      const isInterviewStatus = destColumn.startsWith('interview_');
      
      if (isInterviewStatus) {
        // Store pending move and open date prompt
        setPendingMove({
          applicationId: draggableId,
          application: movedItem,
          newStatus: destColumn,
          sourceColumn,
          destColumn,
        });
        setDatePromptOpen(true);
        setLoading(false);
        return; // Wait for date input
      }

      // Update item status
      movedItem.status = destColumn;
      destItems.splice(destination.index, 0, movedItem);

      // Optimistic update
      setColumns({
        ...columns,
        [sourceColumn]: sourceItems,
        [destColumn]: destItems,
      });

      // Update in Firebase
      await updateApplicationStatus(draggableId, destColumn);
      
      // Track analytics event
      GAEvents.moveApplication(sourceColumn, destColumn);
      
      onRefresh();
    } catch (err) {
      console.error('Error updating application status:', err);
      setError(t('applications.errorUpdatingStatus'));
      // Revert on error
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDateSubmit = async (date: Date, notes: string) => {
    if (!pendingMove) return;

    console.log('🗓️ [KanbanBoard] Handling date submit:', {
      date,
      notes,
      dateType: typeof date,
      dateISO: date.toISOString(),
    });

    setLoading(true);
    setDatePromptOpen(false);

    try {
      const { applicationId, application, newStatus, sourceColumn, destColumn } = pendingMove;
      
      // Create interview date entry
      const interviewDate: InterviewDate = {
        date,
        type: newStatus as any, // interview_1, interview_2, etc.
        notes,
      };

      console.log('🗓️ [KanbanBoard] Created interviewDate object:', interviewDate);

      // Update application with new status and interview date
      const existingInterviewDates = application.interviewDates || [];
      const updatedInterviewDates = [...existingInterviewDates, interviewDate];
      
      console.log('🗓️ [KanbanBoard] Updating application with:', {
        applicationId,
        newStatus,
        existingInterviewDates: existingInterviewDates.length,
        updatedInterviewDates: updatedInterviewDates.length,
      });
      
      await updateApplicationStatus(applicationId, newStatus);
      await updateApplication(applicationId, {
        interviewDates: updatedInterviewDates,
      });

      console.log('✅ [KanbanBoard] Application updated successfully with interview date');

      // Track analytics event
      GAEvents.moveApplication(sourceColumn, destColumn);
      
      // Check if moving from one interview stage to another - open email AI dialog for feedback
      const isMovingBetweenInterviews = sourceColumn.startsWith('interview_') && destColumn.startsWith('interview_');
      
      if (isMovingBetweenInterviews) {
        // Create updated application object with new status
        const updatedApplication: Application = {
          ...application,
          status: newStatus,
          interviewDates: updatedInterviewDates,
        };
        
        console.log('📧 [KanbanBoard] Opening email AI dialog for interview feedback');
        setApplicationForEmailAI(updatedApplication);
        setEmailAIDialogOpen(true);
        setPendingMove(null); // Clear pending move since we're opening email dialog
      } else {
        // Refresh only if not opening email dialog
        onRefresh();
        setPendingMove(null);
      }
    } catch (err) {
      console.error('❌ [KanbanBoard] Error updating application with interview date:', err);
      setError(t('applications.errorUpdating'));
      onRefresh();
      setPendingMove(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePromptClose = () => {
    setDatePromptOpen(false);
    setPendingMove(null);
    onRefresh(); // Refresh to reset any optimistic updates
  };

  // 📧 EMAIL HANDLERS
  const handleEmailSend = async (
    emailType: 'apply' | 'confirm',
    companyEmail: string,
    selectedCVId?: string,
    selectedCoverLetterId?: string
  ) => {
    if (!pendingMove || !currentUser) {
      console.error('❌ [KanbanBoard] Missing pendingMove or currentUser');
      return;
    }
    
    // Store selected attachments for use in handleEmailPreviewSend
    if (selectedCVId) {
      pendingMove.selectedCVId = selectedCVId;
    }
    if (selectedCoverLetterId) {
      pendingMove.selectedCoverLetterId = selectedCoverLetterId;
    }

    // ✅ CHECK GMAIL CONNECTION HERE (not before dialog opens)
    const stateKey = `gmail_integration_state_${currentUser.uid}`;
    console.log('🔍 [KanbanBoard] Checking Gmail connection with key:', stateKey);
    
    const gmailState = localStorage.getItem(stateKey);
    console.log('🔍 [KanbanBoard] Gmail state from localStorage:', gmailState ? 'Found' : 'Not found');
    
    if (!gmailState) {
      console.error('❌ [KanbanBoard] Gmail NOT connected - no state found');
      console.log('🔍 [KanbanBoard] All localStorage keys:', Object.keys(localStorage));
      setError('⚠️ Gmail non connesso! Connetti il tuo account Gmail dal pulsante qui sotto per inviare email automatiche.');
      return; // Keep dialog open, don't proceed
    }
    
    try {
      const state = JSON.parse(gmailState);
      console.log('🔍 [KanbanBoard] Parsed Gmail state:', state);
      
      if (!state.isConnected) {
        console.error('❌ [KanbanBoard] Gmail NOT connected - state.isConnected is false');
        setError('⚠️ Gmail non connesso! Connetti il tuo account Gmail dal pulsante qui sotto per inviare email automatiche.');
        return;
      }
      
      console.log('✅ [KanbanBoard] Gmail connected! Proceeding with email generation...');
    } catch (err) {
      console.error('❌ [KanbanBoard] Error parsing Gmail state:', err);
      setError('⚠️ Errore nel verificare la connessione Gmail. Riconnetti il tuo account.');
      return;
    }

    try {
      console.log('📧 [KanbanBoard] Generating email...', { emailType, companyEmail, pendingMove: pendingMove.application.jobTitle });
      
      setLoading(true);

      // Generate email with AI
      const { subject, body } = await generateApplicationEmail(
        pendingMove.application,
        emailType,
        'Francesco Perone', // Default user name
        language // Pass current language to generate email in correct language
      );

      console.log('✅ [KanbanBoard] Email generated:', { subjectLength: subject.length, bodyLength: body.length });
      console.log('📧 [KanbanBoard] Preparing to show preview...');

      // Prepare data BEFORE closing first dialog
      const emailData = { subject, body };
      
      // Load initial attachments from pendingMove
      const atts: EmailAttachment[] = [];
      if (currentUser) {
        try {
          const allUserCVs = await getUserCVs(currentUser.uid);
          
          // Add CV if available
          const cvIdToUse = pendingMove.selectedCVId || pendingMove.application.cvId;
          if (cvIdToUse) {
            const cv = allUserCVs.find((c) => c.id === cvIdToUse && c.folder !== 'Cover Letter');
            if (cv) {
              const { getCleanFileName } = await import('../utils/fileNameUtils');
              atts.push({ fileUrl: cv.fileUrl, fileName: getCleanFileName(cv) });
            }
          }
          
          // Add Cover Letter if available
          if (pendingMove.selectedCoverLetterId) {
            const cl = allUserCVs.find((c) => c.id === pendingMove.selectedCoverLetterId);
            if (cl) {
              const { getCleanFileName } = await import('../utils/fileNameUtils');
              atts.push({ fileUrl: cl.fileUrl, fileName: getCleanFileName(cl) });
            }
          }
        } catch (err) {
          console.error('Error loading initial attachments:', err);
        }
      }
      
      console.log('📧 [KanbanBoard] Setting generated email state...');
      setGeneratedEmail(emailData);
      setEmailCompany(companyEmail);
      setEmailType(emailType);
      setInitialAttachments(atts);
      
      // Mark as transitioning to prevent handleEmailCancel from resetting state
      console.log('📧 [KanbanBoard] Starting transition between dialogs...');
      isTransitioningRef.current = true; // ← Use ref for immediate sync
      
      // Close first dialog
      console.log('📧 [KanbanBoard] Closing first dialog...');
      setEmailDialogOpen(false);
      
      // Use setTimeout to ensure dialog transition
      console.log('📧 [KanbanBoard] Waiting for dialog transition...');
      setTimeout(() => {
        console.log('📧 [KanbanBoard] Opening preview dialog NOW');
        console.log('📧 [KanbanBoard] Email data ready:', { subject: emailData.subject, bodyLength: emailData.body.length });
        console.log('📧 [KanbanBoard] Current pendingMove:', pendingMove ? pendingMove.application.jobTitle : 'NULL');
        setEmailPreviewOpen(true);
        isTransitioningRef.current = false; // ← Transition complete
        setLoading(false);
      }, 300); // Increased timeout
    } catch (err: any) {
      console.error('❌ [KanbanBoard] Error generating email:', err);
      setError(err.message || 'Errore nella generazione dell\'email');
      setLoading(false);
      isTransitioningRef.current = false; // ← Reset transition state
      handleEmailCancel(); // Revert on error
    }
  };

  // Helper to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:*/*;base64, prefix
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper to fetch file from URL and convert to base64
  const fetchFileAsBase64 = async (fileUrl: string): Promise<string> => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Impossibile scaricare il file');
      }
      const blob = await response.blob();
      return await fileToBase64(new File([blob], 'file', { type: blob.type }));
    } catch (error) {
      console.error('Error fetching file:', error);
      throw new Error('Errore nel caricamento del file da allegare');
    }
  };

  const handleEmailPreviewSend = async (
    subject: string, 
    body: string,
    recipientEmail: string,
    attachments: EmailAttachment[]
  ) => {
    if (!pendingMove || !currentUser) return;

    try {
      setLoading(true);
      isTransitioningRef.current = false; // ← Reset transition state
      setEmailPreviewOpen(false);

      console.log('📧 [KanbanBoard] Sending email via Gmail...', { recipientEmail, attachmentsCount: attachments.length });

      // Process attachments: convert Files to base64 if needed, or use fileUrl
      const processedAttachments: Array<{ base64: string; fileName: string }> = [];

      for (const attachment of attachments) {
        let base64: string;
        
        if (attachment.file) {
          // New file from user's device - convert to base64
          base64 = await fileToBase64(attachment.file);
        } else {
          // Existing file from Firebase Storage - fetch and convert
          base64 = await fetchFileAsBase64(attachment.fileUrl);
        }
        
        processedAttachments.push({
          base64,
          fileName: attachment.fileName,
        });
      }

      // Map emailType for saving
      const emailTypeForSave: 'application' | 'confirmation' | 'interview_feedback' | 'feedback_request' | undefined = 
        emailType === 'apply' ? 'application' :
        emailType === 'confirm' ? 'confirmation' :
        emailType === 'interview_feedback' ? 'interview_feedback' :
        emailType === 'feedback_request' ? 'feedback_request' : undefined;

      // Send email with all attachments
      await sendEmailViaGmailWithAttachments(
        recipientEmail,
        subject,
        body,
        processedAttachments,
        {
          applicationId: pendingMove.applicationId,
          emailType: emailTypeForSave,
        }
      );

      console.log('✅ [KanbanBoard] Email sent successfully!');

      // Move application to "applied" status
      const { applicationId, newStatus, sourceColumn, destColumn } = pendingMove;
      await updateApplicationStatus(applicationId, newStatus);

      // Track analytics event
      GAEvents.moveApplication(sourceColumn, destColumn);
      GAEvents.sendApplicationEmail(emailType);

      onRefresh();
      setPendingMove(null);
    } catch (err: any) {
      console.error('❌ [KanbanBoard] Error sending email:', err);
      setError(err.message || 'Errore nell\'invio dell\'email');
      handleEmailCancel(); // Revert on error
      throw err; // Re-throw to let EmailPreviewDialog handle it
    } finally {
      setLoading(false);
      isTransitioningRef.current = false;
    }
  };

  const handleEmailSkip = async () => {
    if (!pendingMove) return;

    try {
      setLoading(true);
      isTransitioningRef.current = false; // ← Reset transition state
      setEmailDialogOpen(false);

      console.log('⏭️ [KanbanBoard] Skipping email, moving application...');

      // Move application to "applied" status without sending email
      const { applicationId, newStatus, sourceColumn, destColumn } = pendingMove;
      await updateApplicationStatus(applicationId, newStatus);

      // Track analytics event
      GAEvents.moveApplication(sourceColumn, destColumn);

      onRefresh();
      setPendingMove(null);
    } catch (err: any) {
      console.error('❌ [KanbanBoard] Error skipping email:', err);
      setError(err.message || 'Errore nell\'aggiornamento della candidatura');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailCancel = () => {
    // Don't cancel if we're transitioning between dialogs (use ref for immediate check)
    if (isTransitioningRef.current) {
      console.log('⏸️ [KanbanBoard] Ignoring cancel during transition (isTransitioning:', isTransitioningRef.current, ')');
      return;
    }
    
    // Prevent multiple simultaneous calls
    if (!pendingMove && !generatedEmail && !emailDialogOpen && !emailPreviewOpen) {
      console.log('⏸️ [KanbanBoard] Already cancelled, ignoring');
      return;
    }
    
    console.log('❌ [KanbanBoard] Email process cancelled');
    setEmailDialogOpen(false);
    setEmailPreviewOpen(false);
    setGeneratedEmail(null);
    setEmailCompany('');
    setPendingMove(null);
    isTransitioningRef.current = false; // ← Reset transition state
    onRefresh(); // Refresh to reset any optimistic updates
  };

  return (
    <Box>
      {error && (
        <ErrorAlert
          error={error}
          onRetry={() => setError(null)}
        />
      )}

      <DragDropContext 
        onDragEnd={(result) => {
          // Clean up mouse listener and scroll interval on drag end
          if (mouseMoveHandlerRef.current) {
            document.removeEventListener('mousemove', mouseMoveHandlerRef.current);
            mouseMoveHandlerRef.current = null;
          }
          // Clean up scroll interval if exists
          if ((mouseMoveHandlerRef as any).cleanup) {
            (mouseMoveHandlerRef as any).cleanup();
            (mouseMoveHandlerRef as any).cleanup = null;
          }
          onDragEnd(result);
        }}
        onDragStart={() => {
          // Set up mouse listener for auto-scroll during drag
          let scrollInterval: number | null = null;
          
          const handleMouseMove = (e: MouseEvent) => {
            const container = scrollContainerRef.current;
            if (!container) return;
            
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX;
            const scrollLeft = container.scrollLeft;
            const scrollWidth = container.scrollWidth;
            const clientWidth = container.clientWidth;
            
            // Threshold for auto-scroll (100px from edges - more aggressive)
            const scrollThreshold = 100;
            // Scroll speed (pixels per frame) - increased for faster scrolling
            const scrollSpeed = 25;
            
            // Clear any existing interval
            if (scrollInterval) {
              cancelAnimationFrame(scrollInterval);
              scrollInterval = null;
            }
            
            // Check if mouse is near right edge
            if (mouseX > rect.right - scrollThreshold && scrollLeft < scrollWidth - clientWidth - 1) {
              const scroll = () => {
                const currentScroll = container.scrollLeft;
                const maxScroll = scrollWidth - clientWidth;
                
                if (currentScroll < maxScroll) {
                  const newScrollLeft = Math.min(currentScroll + scrollSpeed, maxScroll);
                  container.scrollLeft = newScrollLeft;
                  scrollInterval = requestAnimationFrame(scroll);
                } else {
                  scrollInterval = null;
                }
              };
              scrollInterval = requestAnimationFrame(scroll);
            }
            // Check if mouse is near left edge
            else if (mouseX < rect.left + scrollThreshold && scrollLeft > 0) {
              const scroll = () => {
                const currentScroll = container.scrollLeft;
                
                if (currentScroll > 0) {
                  const newScrollLeft = Math.max(currentScroll - scrollSpeed, 0);
                  container.scrollLeft = newScrollLeft;
                  scrollInterval = requestAnimationFrame(scroll);
                } else {
                  scrollInterval = null;
                }
              };
              scrollInterval = requestAnimationFrame(scroll);
            }
          };
          
          mouseMoveHandlerRef.current = handleMouseMove;
          document.addEventListener('mousemove', handleMouseMove);
          
          // Store interval cleanup function
          (mouseMoveHandlerRef as any).cleanup = () => {
            if (scrollInterval) {
              cancelAnimationFrame(scrollInterval);
              scrollInterval = null;
            }
          };
        }}
        onDragUpdate={(update) => {
          // This helps @hello-pangea/dnd track columns that become visible during scroll
          // Ensure the destination column is visible and centered for accurate drop detection
          if (update.destination && scrollContainerRef.current) {
            const destinationColumnId = update.destination.droppableId;
            const container = scrollContainerRef.current;
            
            // Find the column index to calculate its position
            const columnIndex = COLUMNS.findIndex(col => col.id === destinationColumnId);
            if (columnIndex === -1) return;
            
            // Calculate column position based on index
            const columnWidth = 300; // Fixed width from sx
            const gap = 16; // gap: 2 = 16px
            const columnLeft = columnIndex * (columnWidth + gap);
            
            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const currentScrollLeft = container.scrollLeft;
            
            // Calculate target scroll to center the column (more aggressive centering)
            const targetScrollLeft = columnLeft - (containerWidth / 2) + (columnWidth / 2);
            
            // Clamp scroll position to valid range
            const maxScroll = container.scrollWidth - containerWidth;
            const clampedScroll = Math.max(0, Math.min(targetScrollLeft, maxScroll));
            
            // Immediate scroll (not smooth) for better responsiveness during drag
            // Use a threshold to avoid micro-adjustments
            if (Math.abs(currentScrollLeft - clampedScroll) > 10) {
              container.scrollLeft = clampedScroll;
              
              // Force a reflow to ensure the DOM updates before the next drag update
              // This helps @hello-pangea/dnd detect the column correctly
              void container.offsetHeight;
            }
            
            // Also verify with actual DOM element to ensure it's visible
            // Use requestAnimationFrame to check after scroll has taken effect
            requestAnimationFrame(() => {
              let columnElement = document.querySelector(`[data-rbd-droppable-id="${destinationColumnId}"]`);
              if (!columnElement && scrollContainerRef.current) {
                const allColumns = scrollContainerRef.current.querySelectorAll('[data-rbd-droppable-id]');
                columnElement = Array.from(allColumns).find((el) => {
                  const droppableId = el.getAttribute('data-rbd-droppable-id');
                  return droppableId === destinationColumnId;
                }) || null;
              }
              
              if (columnElement && scrollContainerRef.current) {
                const columnRect = columnElement.getBoundingClientRect();
                const containerRect = scrollContainerRef.current.getBoundingClientRect();
                
                // Check if column is visible (at least partially) with some margin
                const margin = 50; // Add margin to ensure column is well within view
                const isVisible = 
                  columnRect.right > (containerRect.left + margin) && 
                  columnRect.left < (containerRect.right - margin);
                
                if (!isVisible) {
                  // Column is not visible enough, scroll to center it
                  const columnLeftInScroll = columnRect.left - containerRect.left + scrollContainerRef.current.scrollLeft;
                  const targetScroll = columnLeftInScroll - (containerRect.width / 2) + (columnRect.width / 2);
                  const maxScroll = scrollContainerRef.current.scrollWidth - containerRect.width;
                  const clampedScroll = Math.max(0, Math.min(targetScroll, maxScroll));
                  scrollContainerRef.current.scrollLeft = clampedScroll;
                  
                  // Force another reflow
                  void scrollContainerRef.current.offsetHeight;
                }
              }
            });
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: '100%',
            pb: 2,
          }}
        >
          {/* Quick Filters */}
          {(quickFilter || statusFilter) && (
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexShrink: 0, px: 1 }}>
              {statusFilter && (
                <Chip
                  label={`${t('applications.filteredBy') || 'Filtrato per'}: ${COLUMNS.find(c => c.id === statusFilter)?.title || statusFilter}`}
                  onDelete={() => {
                    navigate('/applications');
                  }}
                  color="primary"
                  size="small"
                />
              )}
            </Box>
          )}
          
          <Box 
            ref={(el: HTMLDivElement | null) => {
              if (el) scrollContainerRef.current = el;
            }}
            sx={{ 
              display: 'flex', 
              gap: 2, 
              flex: 1, 
              overflowX: 'auto',
              overflowY: 'hidden',
              position: 'relative',
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '4px',
              },
            }}
          >
          {COLUMNS.map((column) => (
            <Paper
              key={column.id}
              sx={{
                minWidth: 300,
                maxWidth: 300,
                flex: '0 0 300px',
                p: 2,
                backgroundColor: '#f5f5f5',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                  pb: 1,
                  borderBottom: `3px solid ${column.color}`,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {column.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    backgroundColor: column.color,
                    color: 'white',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  {columns[column.id]?.length || 0}
                </Typography>
              </Box>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    data-rbd-droppable-id={column.id}
                    sx={{
                      minHeight: 100,
                      maxHeight: 'calc(100vh - 350px)',
                      overflowY: 'auto',
                      flex: 1,
                      backgroundColor: snapshot.isDraggingOver ? column.color + '20' : 'transparent',
                      border: snapshot.isDraggingOver ? `2px dashed ${column.color}` : '2px dashed transparent',
                      borderRadius: 1,
                      transition: 'all 0.2s ease',
                      p: 1,
                      position: 'relative',
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor: '#f1f1f1',
                        borderRadius: 1,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: column.color,
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: column.color + 'dd',
                        },
                      },
                    }}
                  >
                    {columns[column.id]?.map((application, index) => (
                      <Draggable
                        key={application.id}
                        draggableId={application.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.9 : 1,
                              transform: snapshot.isDragging 
                                ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                                : provided.draggableProps.style?.transform,
                              boxShadow: snapshot.isDragging 
                                ? '0 8px 16px rgba(0,0,0,0.2)' 
                                : 'none',
                            }}
                          >
                            <ApplicationCard
                              application={application}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onViewDetails={onViewDetails}
                              onOptimizeCV={onOptimizeCV}
                              onGenerateCoverLetter={onGenerateCoverLetter}
                              onUploadCV={onUploadCV}
                              onUploadCoverLetter={onUploadCoverLetter}
                              onAnalyzeCV={onAnalyzeCV}
                              onSendEmail={onSendEmail}
                              onOpenCompanyResearch={onOpenCompanyResearch}
                              onOpenJobAnalyzer={onOpenJobAnalyzer}
                              selected={selectedIds.includes(application.id)}
                              selectionMode={selectionMode}
                              onSelect={onSelect}
                              onDropCV={async (app, cvId) => {
                                if (!currentUser) return;
                                try {
                                  await updateApplication(app.id, {
                                    ...app,
                                    cvId,
                                  } as any);
                                  onRefresh();
                                } catch (error) {
                                  console.error('Error updating application with CV:', error);
                                }
                              }}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Paper>
          ))}
          </Box>
        </Box>
      </DragDropContext>

      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <InterviewDatePromptDialog
        open={datePromptOpen}
        onClose={handleDatePromptClose}
        onSubmit={handleDateSubmit}
        interviewType={pendingMove?.newStatus || 'interview_1'}
      />

      <EmailApplicationDialog
        open={emailDialogOpen}
        onClose={handleEmailCancel}
        application={pendingMove?.application || null}
        onSendEmail={handleEmailSend}
        onSkip={handleEmailSkip}
      />

      {pendingMove && (
        <EmailPreviewDialog
          open={emailPreviewOpen}
          onClose={handleEmailCancel}
          onSend={handleEmailPreviewSend}
          onCancel={handleEmailCancel}
          application={pendingMove.application}
          initialSubject={generatedEmail?.subject || ''}
          initialBody={generatedEmail?.body || ''}
          companyEmail={emailCompany}
          initialAttachments={initialAttachments}
        />
      )}

      {/* Email AI Dialog for interview feedback */}
      {currentUser && applicationForEmailAI && (
        <EmailAIDialog
          open={emailAIDialogOpen}
          onClose={() => {
            setEmailAIDialogOpen(false);
            setApplicationForEmailAI(null);
            onRefresh(); // Refresh to update the board with the new status
          }}
          userId={currentUser.uid}
          prefilledCompanyName={applicationForEmailAI.company}
          prefilledJobTitle={applicationForEmailAI.jobTitle}
          prefilledCompanyEmail={applicationForEmailAI.companyEmail}
          prefilledJobDescription={applicationForEmailAI.jobDescription}
          prefilledJobUrl={applicationForEmailAI.jobUrl}
          preselectedCVId={applicationForEmailAI.cvId}
          preselectedCoverLetterId={applicationForEmailAI.coverLetterId}
          applicationStatus={applicationForEmailAI.status}
          applicationId={applicationForEmailAI.id}
          lockCVSelection={!!applicationForEmailAI.cvId}
          lockCoverLetterSelection={!!applicationForEmailAI.coverLetterId}
        />
      )}
    </Box>
  );
};

export default KanbanBoard;

