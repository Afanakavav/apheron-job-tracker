import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { Application } from '../types';
import { useTranslation } from '../hooks/useTranslation';

export interface EmailAttachment {
  fileUrl: string;
  fileName: string;
  file?: File; // For newly uploaded files
}

interface EmailPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (
    subject: string, 
    body: string, 
    recipientEmail: string,
    attachments: EmailAttachment[]
  ) => Promise<void>;
  onCancel: () => void;
  application: Application | null;
  initialSubject: string;
  initialBody: string;
  companyEmail: string;
  initialAttachments?: EmailAttachment[];
}

const EmailPreviewDialog: React.FC<EmailPreviewDialogProps> = ({
  open,
  onClose,
  onSend,
  onCancel,
  application,
  initialSubject,
  initialBody,
  companyEmail,
  initialAttachments = [],
}) => {
  const { t } = useTranslation();
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [recipientEmail, setRecipientEmail] = useState(companyEmail);
  const [attachments, setAttachments] = useState<EmailAttachment[]>(initialAttachments);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('📧 [EmailPreview] Component mounted/updated:', { hasSubject: !!initialSubject, hasBody: !!initialBody });
    setSubject(initialSubject);
    setBody(initialBody);
    setRecipientEmail(companyEmail);
    setAttachments(initialAttachments);
  }, [initialSubject, initialBody, companyEmail, initialAttachments]);

  useEffect(() => {
    console.log('📧 [EmailPreview] Dialog open state changed:', open);
    if (open) {
      console.log('📧 [EmailPreview] Dialog opened with:', { 
        subject: initialSubject?.substring(0, 50), 
        bodyLength: initialBody?.length,
        hasApplication: !!application,
        companyEmail 
      });
    }
  }, [open]);

  const handleSend = async () => {
    if (!subject || !body) {
      setError(t('emailPreview.errorRequired'));
      return;
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setError('Inserisci un indirizzo email destinatario valido');
      return;
    }

    // Check for Word files in attachments and warn user
    const hasWordFile = attachments.some(att => {
      const fileName = att.fileName.toLowerCase();
      return fileName.endsWith('.doc') || fileName.endsWith('.docx');
    });

    if (hasWordFile) {
      const proceed = window.confirm(
        `${t('emailPreview.wordFileWarningTitle')}\n\n${t('emailPreview.wordFileWarningMessage')}`
      );
      if (!proceed) {
        return;
      }
    }

    try {
      setSending(true);
      setError(null);
      await onSend(subject, body, recipientEmail, attachments);
      onClose();
    } catch (err: any) {
      console.error('Error sending email:', err);
      setError(err.message || t('emailDialog.errorSending'));
    } finally {
      setSending(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleAddAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Create a temporary URL for preview (for new files)
      const tempUrl = URL.createObjectURL(file);
      const newAttachment: EmailAttachment = {
        fileUrl: tempUrl,
        fileName: file.name,
        file: file,
      };
      setAttachments([...attachments, newAttachment]);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  if (!application) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      disableRestoreFocus
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {editMode ? <EditIcon color="primary" /> : <VisibilityIcon color="primary" />}
            <Typography variant="h6">
              {editMode ? t('emailPreview.titleEdit') : t('emailPreview.title')}
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() => setEditMode(!editMode)}
            startIcon={editMode ? <VisibilityIcon /> : <EditIcon />}
          >
            {editMode ? t('emailPreview.preview') : t('emailPreview.edit')}
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Email Header */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t('emailPreview.from')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {localStorage.getItem('gmail_user_email') || 'tuo-email@gmail.com'}
            </Typography>

            <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mt: 1 }}>
              {t('emailPreview.to')}
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={sending}
              placeholder="email@example.com"
              sx={{ mb: 1 }}
            />

            <Typography variant="caption" color="text.secondary" gutterBottom>
              {t('emailPreview.company')}
            </Typography>
            <Typography variant="body2">
              {application.company} - {application.jobTitle}
            </Typography>

            {/* Attachments */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Allegati ({attachments.length})
                </Typography>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleAddAttachment}
                />
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  variant="outlined"
                >
                  Aggiungi
                </Button>
              </Box>
              {attachments.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {attachments.map((attachment, index) => (
                    <Chip
                      key={index}
                      icon={<AttachFileIcon />}
                      label={attachment.fileName}
                      size="small"
                      color="primary"
                      variant="outlined"
                      onDelete={() => handleRemoveAttachment(index)}
                      deleteIcon={<DeleteIcon />}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Nessun allegato
                </Typography>
              )}
            </Box>
          </Paper>

          <Divider />

          {editMode ? (
            <>
              {/* Edit Mode */}
              <TextField
                fullWidth
                required
                label={t('emailPreview.subject')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
              />
              <TextField
                fullWidth
                required
                multiline
                rows={12}
                label={t('emailPreview.body')}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={sending}
                helperText={t('emailPreview.bodyHelper')}
              />
            </>
          ) : (
            <>
              {/* Preview Mode */}
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('emailPreview.subjectLabel')}
                </Typography>
                <Typography variant="h6" gutterBottom>
                  {subject}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('emailPreview.messageLabel')}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.7,
                  }}
                >
                  {body}
                </Typography>
              </Paper>
            </>
          )}

          {/* Info Alert */}
          <Alert severity="info">
            <Typography variant="body2">
              💡 <strong>{t('emailPreview.tipTitle')}</strong> {t('emailPreview.tipDesc')}
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={sending} startIcon={<CloseIcon />}>
          {t('emailPreview.cancel')}
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={!subject || !body || sending}
          startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          color="success"
        >
          {sending ? t('emailPreview.sending') : t('emailPreview.send')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailPreviewDialog;

