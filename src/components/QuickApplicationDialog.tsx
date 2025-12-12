import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';

interface QuickApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { company: string; jobTitle: string }) => void;
}

const QuickApplicationDialog: React.FC<QuickApplicationDialogProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const handleSubmit = () => {
    if (company.trim() && jobTitle.trim()) {
      onSubmit({ company: company.trim(), jobTitle: jobTitle.trim() });
      setCompany('');
      setJobTitle('');
      onClose();
    }
  };

  const handleClose = () => {
    setCompany('');
    setJobTitle('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('dashboard.quickApplication') || 'Nuova Candidatura Rapida'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.quickApplicationHint') || 'Inserisci solo azienda e posizione. Potrai aggiungere altri dettagli dopo.'}
          </Typography>
          <TextField
            label={t('applicationForm.company') || 'Azienda'}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            fullWidth
            required
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && company.trim() && jobTitle.trim()) {
                handleSubmit();
              }
            }}
          />
          <TextField
            label={t('applicationForm.jobTitle') || 'Titolo Posizione'}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            fullWidth
            required
            onKeyDown={(e) => {
              if (e.key === 'Enter' && company.trim() && jobTitle.trim()) {
                handleSubmit();
              }
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel') || 'Annulla'}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!company.trim() || !jobTitle.trim()}
        >
          {t('common.create') || 'Crea'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickApplicationDialog;

