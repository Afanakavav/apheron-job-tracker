import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  FormControl,
  Radio,
  RadioGroup,
  FormControlLabel,
  MenuItem,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { requestAccessToken, getGmailUserEmailWithToken, isGmailConnected as checkGmailConnected } from '../services/gmailServiceClient';
import { generateApplicationEmail } from '../services/emailGeneratorService';
import { sendEmailViaGmailWithAttachments } from '../services/gmailSendService';
import { getUserCVs } from '../services/cvService';
import { GAEvents } from '../services/googleAnalytics';
import EmailPreviewDialog, { EmailAttachment } from './EmailPreviewDialog';
import { getCleanFileName } from '../utils/fileNameUtils';

interface EmailAIDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  // Optional prefilled data coming from an Application
  prefilledCompanyName?: string;
  prefilledJobTitle?: string;
  prefilledCompanyEmail?: string;
  prefilledJobDescription?: string;
  prefilledJobUrl?: string; // URL of job description from application
  preselectedCVId?: string;
  preselectedCoverLetterId?: string;
  // Application status to determine email type
  applicationStatus?: 'saved' | 'interview_1' | 'interview_2' | 'interview_3' | 'interview_4' | 'rejected' | 'offer' | 'applied';
  // Application ID to link email to application
  applicationId?: string;
  lockCVSelection?: boolean; // If true, CV field is disabled and cannot be changed
  lockCoverLetterSelection?: boolean; // If true, Cover Letter field is disabled and cannot be changed
}

const EmailAIDialog: React.FC<EmailAIDialogProps> = ({
  open,
  onClose,
  userId,
  prefilledCompanyName,
  prefilledJobTitle,
  prefilledCompanyEmail,
  prefilledJobDescription,
  prefilledJobUrl,
  preselectedCVId,
  preselectedCoverLetterId,
  applicationStatus,
  applicationId,
  lockCVSelection = false,
  lockCoverLetterSelection = false,
}) => {
  const { t, language } = useTranslation();
  
  // Form states
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  
  // Determine email type based on application status
  const getDefaultEmailType = (): 'apply' | 'confirm' | 'interview_feedback' | 'feedback_request' | 'offer_accepted' | 'offer_declined' | 'follow_up' | 'thank_you' | 'rejection_response' => {
    if (applicationStatus === 'interview_1' || 
        applicationStatus === 'interview_2' || 
        applicationStatus === 'interview_3' || 
        applicationStatus === 'interview_4') {
      return 'interview_feedback';
    }
    if (applicationStatus === 'rejected') {
      return 'feedback_request';
    }
    if (applicationStatus === 'offer') {
      return 'offer_accepted'; // Default to accepted, but user can choose
    }
    return 'apply'; // Default for 'saved' status
  };
  
  const [emailType, setEmailType] = useState<'apply' | 'confirm' | 'interview_feedback' | 'feedback_request' | 'offer_accepted' | 'offer_declined' | 'follow_up' | 'thank_you' | 'rejection_response'>(getDefaultEmailType());
  const [draftSaved, setDraftSaved] = useState(false);
  const [selectedCVId, setSelectedCVId] = useState('');
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState('');
  
  // UI states
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cvs, setCvs] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);

  // Compute initial attachments with clean filenames
  const initialAttachments = useMemo(() => {
    const atts: EmailAttachment[] = [];
    if (selectedCVId) {
      const cv = cvs.find(cv => cv.id === selectedCVId);
      if (cv) {
        atts.push({ fileUrl: cv.fileUrl, fileName: getCleanFileName(cv) });
      }
    }
    if (selectedCoverLetterId) {
      const cl = coverLetters.find(cl => cl.id === selectedCoverLetterId);
      if (cl) {
        atts.push({ fileUrl: cl.fileUrl, fileName: getCleanFileName(cl) });
      }
    }
    return atts;
  }, [selectedCVId, selectedCoverLetterId, cvs, coverLetters]);

  // Check Gmail connection status (from Firestore tokens)
  React.useEffect(() => {
    if (userId && open) {
      checkGmailConnection();
    }
  }, [userId, open]);

  const checkGmailConnection = async () => {
    try {
      console.log('🔍 [EmailAIDialog] Checking Gmail connection from Firestore...');
      const connected = await checkGmailConnected(userId);
      console.log('📧 [EmailAIDialog] Gmail connection status:', connected);
      setIsGmailConnected(connected);
    } catch (err) {
      console.error('❌ [EmailAIDialog] Error checking Gmail connection:', err);
      setIsGmailConnected(false);
    }
  };

  // Load CVs
  React.useEffect(() => {
    if (userId && open) {
      loadCVs();
    }
  }, [userId, open]);

  // Load draft from localStorage when dialog opens
  React.useEffect(() => {
    if (!open || !userId) return;
    
    const draftKey = `email_draft_${userId}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.companyName) setCompanyName(draft.companyName);
        if (draft.jobTitle) setJobTitle(draft.jobTitle);
        if (draft.companyEmail) setCompanyEmail(draft.companyEmail);
        if (draft.jobUrl) setJobUrl(draft.jobUrl);
        if (draft.jobDescription) setJobDescription(draft.jobDescription);
        if (draft.selectedCVId) setSelectedCVId(draft.selectedCVId);
        if (draft.selectedCoverLetterId) setSelectedCoverLetterId(draft.selectedCoverLetterId);
        if (draft.emailType) setEmailType(draft.emailType);
      } catch (err) {
        console.error('Error loading draft:', err);
      }
    }
  }, [open, userId]);

  // Auto-save draft while typing (debounced)
  React.useEffect(() => {
    if (!open || !userId) return;
    
    const draftKey = `email_draft_${userId}`;
    const timeoutId = setTimeout(() => {
      const draft = {
        companyName,
        jobTitle,
        companyEmail,
        jobUrl,
        jobDescription,
        selectedCVId,
        selectedCoverLetterId,
        emailType,
        savedAt: Date.now(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 1000); // Save after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [open, userId, companyName, jobTitle, companyEmail, jobUrl, jobDescription, selectedCVId, selectedCoverLetterId, emailType]);

  // Prefill from props when dialog opens (after draft is loaded)
  React.useEffect(() => {
    if (!open) return;
    if (prefilledCompanyName) setCompanyName(prefilledCompanyName);
    if (prefilledJobTitle) setJobTitle(prefilledJobTitle);
    if (prefilledCompanyEmail) setCompanyEmail(prefilledCompanyEmail);
    if (prefilledJobUrl) setJobUrl(prefilledJobUrl);
    if (prefilledJobDescription) setJobDescription(prefilledJobDescription);
    if (preselectedCVId) setSelectedCVId(preselectedCVId);
    if (preselectedCoverLetterId) setSelectedCoverLetterId(preselectedCoverLetterId);
    // Set email type based on application status
    const defaultType = getDefaultEmailType();
    setEmailType(defaultType);
  }, [open, prefilledCompanyName, prefilledJobTitle, prefilledCompanyEmail, prefilledJobDescription, prefilledJobUrl, preselectedCVId, preselectedCoverLetterId, applicationStatus]);

  const loadCVs = async () => {
    try {
      const userCVs = await getUserCVs(userId);
      // Separate CVs and Cover Letters by folder
      const actualCVs = userCVs.filter(cv => cv.folder !== 'Cover Letter');
      const actualCoverLetters = userCVs.filter(cv => cv.folder === 'Cover Letter');
      
      setCvs(actualCVs);
      setCoverLetters(actualCoverLetters);
      // Do NOT pre-select first CV/Cover Letter - let user choose
    } catch (err) {
      console.error('Error loading CVs:', err);
    }
  };

  const handleConnectGmail = async () => {
    setConnecting(true);
    setError(null);
    
    try {
      const accessToken = await requestAccessToken(userId);
      const email = await getGmailUserEmailWithToken(accessToken);
      
      setIsGmailConnected(true);
      
      // Persist state to localStorage
      const stateKey = `gmail_integration_state_${userId}`;
      const state = {
        isConnected: true,
        gmailEmail: email,
        jobOffers: [],
        customQuery: '',
        maxResults: 20,
        daysBack: 30,
        confidenceThreshold: 60,
        scanning: false,
        scanProgress: { current: 0, total: 0 },
        timestamp: Date.now(),
      };
      
      localStorage.setItem(stateKey, JSON.stringify(state));
      setError(null);
    } catch (err: any) {
      console.error('Gmail connection failed:', err);
      setError(t('emailDialog.errorConnecting'));
      setIsGmailConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  const handleGenerate = async () => {
    if (!companyEmail) {
      setError(t('emailDialog.errorEmail'));
      return;
    }

    // Valida email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail)) {
      setError(t('emailDialog.errorInvalidEmail'));
      return;
    }

    if (!companyName) {
      setError('Inserisci il nome dell\'azienda');
      return;
    }

    if (!jobTitle) {
      setError('Inserisci il titolo della posizione');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      // Generate email with AI
      const mockApplication = {
        company: companyName,
        jobTitle: jobTitle,
        jobDescription: jobDescription || '',
        jobUrl: jobUrl || '',
      } as any; // Using 'as any' since we only need these fields for email generation

      // Map new template types to existing types for backend compatibility
      let backendEmailType: 'apply' | 'confirm' | 'interview_feedback' | 'feedback_request' | 'offer_accepted' | 'offer_declined' = 'apply';
      
      if (emailType === 'apply') {
        backendEmailType = 'apply';
      } else if (emailType === 'confirm' || emailType === 'follow_up' || emailType === 'thank_you') {
        backendEmailType = 'confirm'; // Use confirm template for follow-up and thank you
      } else if (emailType === 'interview_feedback') {
        backendEmailType = 'interview_feedback';
      } else if (emailType === 'feedback_request' || emailType === 'rejection_response') {
        backendEmailType = 'feedback_request'; // Use feedback_request template for rejection response
      } else if (emailType === 'offer_accepted') {
        backendEmailType = 'offer_accepted';
      } else if (emailType === 'offer_declined') {
        backendEmailType = 'offer_declined';
      }

      const emailData = await generateApplicationEmail(
        mockApplication,
        backendEmailType,
        companyEmail,
        language // Pass current language to generate email in correct language
      );
      
      // Customize subject/body for template types
      if (emailType === 'follow_up') {
        emailData.subject = emailData.subject.replace(/conferma|confirmation/gi, 'Follow-up');
      } else if (emailType === 'thank_you') {
        emailData.subject = emailData.subject.replace(/conferma|confirmation/gi, 'Thank You');
      } else if (emailType === 'rejection_response') {
        emailData.subject = emailData.subject.replace(/feedback|richiesta/gi, 'Rejection Response');
      }

      setGeneratedEmail(emailData);
      setPreviewOpen(true);
      // Map emailType to supported types for GA tracking
      const gaEmailType: 'apply' | 'confirm' | 'interview_feedback' | 'feedback_request' | 'offer_accepted' | 'offer_declined' = 
        emailType === 'apply' ? 'apply' :
        emailType === 'confirm' || emailType === 'follow_up' || emailType === 'thank_you' ? 'confirm' :
        emailType === 'interview_feedback' ? 'interview_feedback' :
        emailType === 'feedback_request' || emailType === 'rejection_response' ? 'feedback_request' :
        emailType === 'offer_accepted' ? 'offer_accepted' :
        emailType === 'offer_declined' ? 'offer_declined' : 'apply';
      GAEvents.sendApplicationEmail(gaEmailType);
    } catch (err: any) {
      console.error('Error generating email:', err);
      setError(err.message || t('emailDialog.errorSending'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmail = async (
    subject: string, 
    body: string, 
    recipientEmail: string,
    attachments: EmailAttachment[]
  ) => {
    try {
      setGenerating(true);
      
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
      const emailTypeForSave: 'application' | 'confirmation' | 'interview_feedback' | 'feedback_request' | 'offer_accepted' | 'offer_declined' | undefined = 
        emailType === 'apply' ? 'application' :
        emailType === 'confirm' ? 'confirmation' :
        emailType === 'interview_feedback' ? 'interview_feedback' :
        emailType === 'feedback_request' ? 'feedback_request' :
        emailType === 'offer_accepted' ? 'offer_accepted' :
        emailType === 'offer_declined' ? 'offer_declined' : undefined;

      // Send email with all attachments using a helper function
      await sendEmailViaGmailWithAttachments(
        recipientEmail,
        subject,
        body,
        processedAttachments,
        {
          applicationId,
          emailType: emailTypeForSave,
        }
      );

      setPreviewOpen(false);
      onClose();
      
      // Reset form
      setCompanyName('');
      setJobTitle('');
      setCompanyEmail('');
      setJobDescription('');
      setSelectedCVId(''); // Reset to empty - user must choose
      setSelectedCoverLetterId(''); // Reset to empty - user must choose
      setGeneratedEmail(null);
    } catch (err: any) {
      console.error('Error sending email:', err);
      setError(err.message || t('emailDialog.errorSending'));
      throw err; // Re-throw to let EmailPreviewDialog handle it
    } finally {
      setGenerating(false);
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

  const handleClose = () => {
    if (!generating) {
      // Clear draft when closing
      if (userId) {
        const draftKey = `email_draft_${userId}`;
        localStorage.removeItem(draftKey);
      }
      setCompanyName('');
      setJobTitle('');
      setCompanyEmail('');
      setJobDescription('');
      setError(null);
      setGeneratedEmail(null);
      onClose();
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        disableRestoreFocus
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon color="primary" />
            <Typography variant="h6">
              AI Email Generator
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Show info for interview feedback or feedback request - MOVED TO TOP */}
            {emailType === 'interview_feedback' && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>💬 Feedback Colloquio</strong>
                  <br />
                  Genereremo un'email per condividere il tuo giudizio personale su come è andato il colloquio.
                </Typography>
              </Alert>
            )}
            
            {emailType === 'feedback_request' && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>📝 Richiesta Feedback</strong>
                  <br />
                  Genereremo un'email per richiedere un feedback su come è andato il colloquio.
                </Typography>
              </Alert>
            )}

            {/* Gmail Connection Status */}
            {!isGmailConnected && (
              <Alert 
                severity="warning"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={connecting ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                    onClick={handleConnectGmail}
                    disabled={connecting || generating}
                  >
                    {connecting ? t('emailDialog.connecting') : t('emailDialog.connectGmail')}
                  </Button>
                }
              >
                <Typography variant="body2">
                  <strong>⚠️ {t('emailDialog.gmailNotConnected')}</strong>
                  <br />
                  {t('emailDialog.gmailNotConnectedDesc')}
                </Typography>
              </Alert>
            )}

            {isGmailConnected && (
              <Alert severity="success">
                <Typography variant="body2">
                  <strong>✅ {t('emailDialog.gmailConnected')}</strong>
                  <br />
                  {t('emailDialog.gmailConnectedDesc')}
                </Typography>
              </Alert>
            )}

            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {draftSaved && (
              <Alert severity="success" sx={{ py: 0.5 }}>
                <Typography variant="caption">
                  💾 {t('emailDialog.draftSaved') || 'Bozza salvata automaticamente'}
                </Typography>
              </Alert>
            )}

            <Divider />

            {/* Form Fields */}
            <TextField
              fullWidth
              required
              label="Nome Azienda"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={generating || connecting || !isGmailConnected}
              placeholder="es: Google"
            />

            <TextField
              fullWidth
              required
              label="Titolo Posizione"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={generating || connecting || !isGmailConnected}
              placeholder="es: Senior Software Engineer"
            />

            <TextField
              fullWidth
              required
              label={t('emailDialog.companyEmail')}
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder={t('emailDialog.companyEmailPlaceholder')}
              disabled={generating || connecting || !isGmailConnected}
              helperText={t('emailDialog.companyEmailHelper')}
            />

            {/* Job Description - Show both URL and text if both are available */}
            {jobUrl && jobDescription ? (
              <>
                <TextField
                  fullWidth
                  required
                  label="URL Job Description"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  disabled={generating || connecting || !isGmailConnected}
                  placeholder="https://..."
                  helperText="URL della job description"
                />
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Testo Job Description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={generating || connecting || !isGmailConnected}
                  placeholder="Testo copiato della job description..."
                  helperText="Testo della job description se già copiato"
                />
              </>
            ) : jobUrl ? (
              <TextField
                fullWidth
                required
                label="URL Job Description"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                disabled={generating || connecting || !isGmailConnected}
                placeholder="https://..."
                helperText="URL della job description"
              />
            ) : (
              <>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Job Description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={generating || connecting || !isGmailConnected}
                  placeholder="Incolla qui la job description per personalizzare l'email..."
                  helperText="Testo della job description per personalizzare l'email"
                />
                {jobUrl && (
                  <TextField
                    fullWidth
                    label="URL Job Description"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    disabled={generating || connecting || !isGmailConnected}
                    placeholder="https://..."
                    helperText="URL della job description se disponibile"
                  />
                )}
              </>
            )}

            {/* CV Selection */}
            <TextField
              select
              fullWidth
              label={t('emailDialog.cvToAttach')}
              value={selectedCVId}
              onChange={(e) => setSelectedCVId(e.target.value)}
              disabled={generating || connecting || !isGmailConnected || lockCVSelection}
              helperText={lockCVSelection ? t('emailDialog.cvToAttachHelperAuto') : t('emailDialog.cvToAttachHelper')}
            >
              <MenuItem value="">{t('emailDialog.noCV')}</MenuItem>
              {cvs.map((cv) => (
                <MenuItem key={cv.id} value={cv.id}>
                  {cv.name}
                </MenuItem>
              ))}
            </TextField>

            {/* Cover Letter Selection */}
            <TextField
              select
              fullWidth
              label={t('emailDialog.coverLetterToAttach')}
              value={selectedCoverLetterId}
              onChange={(e) => setSelectedCoverLetterId(e.target.value)}
              disabled={generating || connecting || !isGmailConnected || lockCoverLetterSelection}
              helperText={lockCoverLetterSelection ? t('emailDialog.coverLetterToAttachHelperAuto') : t('emailDialog.coverLetterToAttachHelper')}
            >
              <MenuItem value="">{t('emailDialog.noCoverLetter')}</MenuItem>
              {coverLetters.map((cl) => (
                <MenuItem key={cl.id} value={cl.id}>
                  {cl.name}
                </MenuItem>
              ))}
            </TextField>

            <Divider />

            {/* Email Type Selection - Only show for 'saved' status */}
            {applicationStatus === 'saved' && (
              <FormControl component="fieldset" disabled={generating || connecting || !isGmailConnected}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('emailDialog.emailType')}
                </Typography>
                <RadioGroup value={emailType} onChange={(e) => setEmailType(e.target.value as 'apply' | 'confirm')}>
                  <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
                    <FormControlLabel
                      value="apply"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            📧 {t('emailDialog.emailTypeApplication')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('emailDialog.emailTypeApplicationDesc')}
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <FormControlLabel
                      value="confirm"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            ✅ {t('emailDialog.emailTypeConfirm')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('emailDialog.emailTypeConfirmDesc')}
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>
                </RadioGroup>
              </FormControl>
            )}

            {/* Email Type Selection - For 'offer' status */}
            {applicationStatus === 'offer' && (
              <FormControl component="fieldset" disabled={generating || connecting || !isGmailConnected}>
                <Typography variant="subtitle2" gutterBottom>
                  Tipo di Risposta all'Offerta
                </Typography>
                <RadioGroup value={emailType} onChange={(e) => setEmailType(e.target.value as 'offer_accepted' | 'offer_declined')}>
                  <Paper variant="outlined" sx={{ p: 2, mb: 1 }}>
                    <FormControlLabel
                      value="offer_accepted"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            ✅ Accettazione Offerta
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Genera un'email per accettare l'offerta ricevuta.
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <FormControlLabel
                      value="offer_declined"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            ❌ Rifiuto Offerta
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Genera un'email per rifiutare cortesemente l'offerta ricevuta.
                          </Typography>
                        </Box>
                      }
                    />
                  </Paper>
                </RadioGroup>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={generating || connecting} startIcon={<CloseIcon />}>
            {t('aiAssistant.cancel')}
          </Button>
          <Button
            onClick={handleGenerate}
            variant="contained"
            disabled={!companyEmail || !companyName || !jobTitle || generating || connecting || !isGmailConnected}
            startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          >
            {generating ? t('aiAssistant.generating') : t('aiAssistant.buttonGenerateEmail')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Preview Dialog */}
      {generatedEmail && (
        <EmailPreviewDialog
          open={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setGeneratedEmail(null);
          }}
          onSend={handleSendEmail}
          onCancel={() => {
            setPreviewOpen(false);
            setGeneratedEmail(null);
          }}
          application={{
            company: companyName,
            jobTitle: jobTitle,
          } as any}
          initialSubject={generatedEmail.subject}
          initialBody={generatedEmail.body}
          companyEmail={companyEmail}
          initialAttachments={initialAttachments}
        />
      )}
    </>
  );
};

export default EmailAIDialog;

