import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import type { ApplicationStatus } from '../types';

interface InterviewDatePromptDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (date: Date, notes: string) => void;
  interviewType: ApplicationStatus;
}

const getInterviewTypeLabel = (type: ApplicationStatus): string => {
  switch (type) {
    case 'interview_1':
      return 'Colloquio Recruiter';
    case 'interview_2':
      return 'Colloquio Manager';
    case 'interview_3':
      return 'Colloquio Tecnico';
    case 'interview_4':
      return 'Colloquio Panel';
    default:
      return 'Colloquio';
  }
};

const InterviewDatePromptDialog: React.FC<InterviewDatePromptDialogProps> = ({
  open,
  onClose,
  onSubmit,
  interviewType,
}) => {
  const { t } = useTranslation();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!date) {
      alert(t('interviewPrompt.enterDate'));
      return;
    }

    // Combine date and time
    const dateTimeString = time ? `${date}T${time}` : `${date}T09:00`;
    const interviewDate = new Date(dateTimeString);

    onSubmit(interviewDate, notes);
    
    // Reset form
    setDate('');
    setTime('');
    setNotes('');
  };

  const handleCancel = () => {
    // Reset form and close
    setDate('');
    setTime('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="primary" />
          <Typography variant="h6">
            {t('interviewPrompt.title')} {getInterviewTypeLabel(interviewType)}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
            {t('interviewPrompt.subtitle')}
          </Typography>
          
          <TextField
            label={t('interviewPrompt.date') + ' *'}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
          />
          
          <TextField
            label={t('interviewPrompt.time')}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            helperText={t('interviewPrompt.timeOptional')}
            fullWidth
          />
          
          <TextField
            label={t('interviewPrompt.notes')}
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('interviewPrompt.notesPlaceholder')}
            helperText={t('interviewPrompt.notesOptional')}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!date}>
          {t('interviewPrompt.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InterviewDatePromptDialog;

