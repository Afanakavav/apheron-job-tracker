import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Close, CloudDownload } from '@mui/icons-material';
import type { CV } from '../types';

interface CVViewerDialogProps {
  open: boolean;
  onClose: () => void;
  cv: CV | null;
}

const CVViewerDialog: React.FC<CVViewerDialogProps> = ({ open, onClose, cv }) => {
  if (!cv) return null;

  const handleDownload = () => {
    window.open(cv.fileUrl, '_blank');
  };

  const isPDF = cv.fileName.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{cv.name}</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {isPDF ? (
          <Box
            sx={{
              width: '100%',
              height: '70vh',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <iframe
              src={`${cv.fileUrl}#view=FitH`}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title={cv.name}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40vh',
              gap: 2,
            }}
          >
            <Typography variant="h6">Anteprima non disponibile</Typography>
            <Typography variant="body2" color="text.secondary">
              Questo tipo di file non può essere visualizzato nel browser.
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudDownload />}
              onClick={handleDownload}
            >
              Scarica per Visualizzare
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CloudDownload />} onClick={handleDownload}>
          Scarica
        </Button>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVViewerDialog;

