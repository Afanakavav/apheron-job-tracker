import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  MenuItem,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import type { Application } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { requestAccessToken, getGmailUserEmailWithToken } from '../services/gmailServiceClient';
import { useTranslation } from '../hooks/useTranslation';
import { getUserCVs } from '../services/cvService';

interface EmailApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  application: Application | null;
  onSendEmail: (emailType: 'apply' | 'confirm', companyEmail: string, selectedCVId?: string, selectedCoverLetterId?: string) => Promise<void>;
  onSkip: () => void;
}

const EmailApplicationDialog: React.FC<EmailApplicationDialogProps> = ({
  open,
  onClose,
  application,
  onSendEmail,
  onSkip,
}) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [emailType, setEmailType] = useState<'apply' | 'confirm'>('apply');
  const [companyEmail, setCompanyEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedCVId, setSelectedCVId] = useState('');
  const [selectedCoverLetterId, setSelectedCoverLetterId] = useState('');
  const [cvs, setCvs] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);

  // Check Gmail connection status
  React.useEffect(() => {
    if (currentUser && open) {
      const stateKey = `gmail_integration_state_${currentUser.uid}`;
      console.log('🔍 [EmailDialog] Checking Gmail connection, key:', stateKey);
      
      const gmailState = localStorage.getItem(stateKey);
      console.log('🔍 [EmailDialog] Gmail state:', gmailState);
      
      if (gmailState) {
        try {
          const state = JSON.parse(gmailState);
          console.log('🔍 [EmailDialog] Parsed state:', state);
          console.log('🔍 [EmailDialog] isConnected:', state.isConnected);
          setIsGmailConnected(state.isConnected || false);
        } catch (err) {
          console.error('❌ [EmailDialog] Error parsing Gmail state:', err);
          setIsGmailConnected(false);
        }
      } else {
        console.log('⚠️ [EmailDialog] No Gmail state found in localStorage');
        console.log('🔍 [EmailDialog] All localStorage keys:', Object.keys(localStorage));
        setIsGmailConnected(false);
      }
    }
  }, [currentUser, open]);

  // Load CVs and Cover Letters
  React.useEffect(() => {
    if (currentUser && open) {
      loadCVs();
    }
  }, [currentUser, open]);

  // Pre-fill fields from application data AFTER CVs are loaded
  React.useEffect(() => {
    if (open && application) {
      // Pre-fill company email if available (can be done immediately)
      if (application.companyEmail) {
        setCompanyEmail(application.companyEmail);
      }
      
      // Pre-select CV if available and exists in the list (wait for CVs to load)
      if (application.cvId && cvs.length > 0) {
        const cvExists = cvs.some(cv => cv.id === application.cvId);
        if (cvExists) {
          setSelectedCVId(application.cvId);
        }
      }
      
      // Pre-select Cover Letter if available and exists in the list (wait for Cover Letters to load)
      if (application.coverLetterId && coverLetters.length > 0) {
        const coverLetterExists = coverLetters.some(cl => cl.id === application.coverLetterId);
        if (coverLetterExists) {
          setSelectedCoverLetterId(application.coverLetterId);
        }
      }
      
      // Also handle case where CVs/Cover Letters are loaded but application doesn't have them yet
      // This ensures we set empty values if application doesn't have cvId/coverLetterId
      if (cvs.length > 0 && !application.cvId) {
        setSelectedCVId('');
      }
      if (coverLetters.length > 0 && !application.coverLetterId) {
        setSelectedCoverLetterId('');
      }
    } else if (!open) {
      // Reset fields when dialog closes
      setCompanyEmail('');
      setSelectedCVId('');
      setSelectedCoverLetterId('');
    }
  }, [open, application, cvs, coverLetters]);

  const loadCVs = async () => {
    if (!currentUser) return;
    
    try {
      const userCVs = await getUserCVs(currentUser.uid);
      // Separate CVs and Cover Letters by folder
      const actualCVs = userCVs.filter(cv => cv.folder !== 'Cover Letter');
      const actualCoverLetters = userCVs.filter(cv => cv.folder === 'Cover Letter');
      
      setCvs(actualCVs);
      setCoverLetters(actualCoverLetters);
    } catch (err) {
      console.error('Error loading CVs:', err);
    }
  };

  const handleSend = async () => {
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

    try {
      setSending(true);
      setError(null);
      // Pass selected CV and Cover Letter IDs to parent
      await onSendEmail(
        emailType,
        companyEmail,
        selectedCVId || undefined,
        selectedCoverLetterId || undefined
      );
      onClose();
    } catch (err: any) {
      console.error('Error sending email:', err);
      setError(err.message || t('emailDialog.errorSending'));
    } finally {
      setSending(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  const handleConnectGmail = async () => {
    if (!currentUser) return;
    
    setConnecting(true);
    setError(null);
    console.log('🔗 [EmailDialog] Starting Gmail connection...');
    
    try {
      // Request OAuth2 access token (opens popup)
      const accessToken = await requestAccessToken(currentUser.uid);
      console.log('✅ [EmailDialog] Gmail connected successfully');
      
      // Get Gmail email using the access token
      const email = await getGmailUserEmailWithToken(accessToken);
      console.log('📧 [EmailDialog] Gmail email:', email);
      
      // Update local state
      setIsGmailConnected(true);
      
      // Persist state to localStorage (for sync with Gmail Integration page)
      const stateKey = `gmail_integration_state_${currentUser.uid}`;
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
      console.log('✅ [EmailDialog] Gmail state persisted to localStorage:', state);
      
      // Show success message
      setError(null);
    } catch (err: any) {
      console.error('❌ [EmailDialog] Gmail connection failed:', err);
      setError(t('emailDialog.errorConnecting'));
      setIsGmailConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  if (!application) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      disableRestoreFocus
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color="primary" />
          <Typography variant="h6">
            {t('emailDialog.title')}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>📧 {t('emailDialog.subtitle')}</strong>
              <br />
              {t('emailDialog.subtitleDesc')}
            </Typography>
          </Alert>

          {/* Info Box - Come funziona */}
          <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary">
              <strong>ℹ️ {t('emailDialog.howItWorksTitle')}</strong>
              <br />
              {t('emailDialog.howItWorksStep1')}
              <br />
              {t('emailDialog.howItWorksStep2')}
              <br />
              {t('emailDialog.howItWorksStep3')}
            </Typography>
          </Paper>

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
                  disabled={connecting || sending}
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

          {/* Company Email Input */}
          <TextField
            fullWidth
            required
            label={t('emailDialog.companyEmail')}
            type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            placeholder={t('emailDialog.companyEmailPlaceholder')}
            disabled={sending || connecting || !isGmailConnected}
            helperText={t('emailDialog.companyEmailHelper')}
          />

          {/* CV Selection */}
          <TextField
            select
            fullWidth
            label={t('emailDialog.cvToAttach')}
            value={selectedCVId}
            onChange={(e) => setSelectedCVId(e.target.value)}
            disabled={sending || connecting || !isGmailConnected}
            helperText={t('emailDialog.cvToAttachHelper')}
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
            disabled={sending || connecting || !isGmailConnected}
            helperText={t('emailDialog.coverLetterToAttachHelper')}
          >
            <MenuItem value="">{t('emailDialog.noCoverLetter')}</MenuItem>
            {coverLetters.map((cl) => (
              <MenuItem key={cl.id} value={cl.id}>
                {cl.name}
              </MenuItem>
            ))}
          </TextField>

          <Divider />

          {/* Email Type Selection */}
          <FormControl component="fieldset" disabled={sending || connecting || !isGmailConnected}>
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSkip} disabled={sending || connecting} startIcon={<CloseIcon />}>
          {t('emailDialog.skip')}
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={!companyEmail || sending || connecting || !isGmailConnected}
          startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        >
          {sending ? t('emailDialog.generating') : t('emailDialog.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailApplicationDialog;

