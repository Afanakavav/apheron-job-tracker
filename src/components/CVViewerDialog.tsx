import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Close, CloudDownload, EditNote, PictureAsPdf } from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import * as mammoth from 'mammoth';
import type { CV } from '../types';

interface CVViewerDialogProps {
  open: boolean;
  onClose: () => void;
  cv: CV | null;
  onEditContent?: (cv: CV) => void;
  onConvertToPDF?: (cv: CV) => void;
}

const CVViewerDialog: React.FC<CVViewerDialogProps> = ({ open, onClose, cv, onEditContent, onConvertToPDF }) => {
  const { t } = useTranslation();
  const [wordContent, setWordContent] = useState<string | null>(null);
  const [loadingWord, setLoadingWord] = useState(false);
  const [wordError, setWordError] = useState<string | null>(null);

  // Fetch and convert Word to HTML
  const fetchWordContent = useCallback(async (fileUrl: string) => {
    setLoadingWord(true);
    setWordError(null);
    try {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      setWordContent(result.value);
    } catch (err: any) {
      console.error('Error converting Word to HTML:', err);
      setWordError('Errore nel caricamento del documento Word');
      setWordContent(null);
    } finally {
      setLoadingWord(false);
    }
  }, []); // State setters are stable and don't need to be in deps

  // Load Word content when dialog opens
  useEffect(() => {
    if (!cv) {
      setWordContent(null);
      setWordError(null);
      return;
    }

    const isWord = cv.fileName.toLowerCase().endsWith('.docx');

    if (open && isWord && cv.fileUrl) {
      fetchWordContent(cv.fileUrl);
    } else {
      setWordContent(null);
      setWordError(null);
    }
  }, [open, cv, fetchWordContent]);

  if (!cv) return null;

  const handleDownload = async () => {
    const { getCleanFileName, downloadFileWithCleanName } = await import('../utils/fileNameUtils');
    const cleanFileName = getCleanFileName(cv);
    await downloadFileWithCleanName(cv.fileUrl, cleanFileName);
  };

  const isPDF = cv.fileName.toLowerCase().endsWith('.pdf');
  const isWord = cv.fileName.toLowerCase().endsWith('.docx');

  const handleEditContent = () => {
    if (onEditContent) {
      onClose(); // Close viewer first
      onEditContent(cv);
    }
  };

  const handleConvertToPDF = () => {
    if (onConvertToPDF) {
      onClose(); // Close viewer first
      onConvertToPDF(cv);
    }
  };

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
        ) : isWord ? (
          /* Word: Show content in read-only format */
          <Box sx={{ width: '100%', height: '70vh', overflow: 'auto' }}>
            {loadingWord ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>{t('cvViewer.loading')}</Typography>
              </Box>
            ) : wordError ? (
              <Alert severity="error">{wordError}</Alert>
            ) : wordContent ? (
              <Box
                sx={{
                  p: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  '& p': { mb: 1 },
                  '& h1, & h2, & h3': { mt: 2, mb: 1 },
                  '& ul, & ol': { ml: 2 },
                }}
                dangerouslySetInnerHTML={{ __html: wordContent }}
              />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 2,
                }}
              >
                <Typography variant="h6">Contenuto non disponibile</Typography>
                <Typography variant="body2" color="text.secondary">
                  Impossibile caricare il contenuto del documento.
                </Typography>
              </Box>
            )}
          </Box>
        ) : (
          /* Other formats: Download button */
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
        {isPDF ? (
          /* PDF: Solo "Chiudi" */
          <Button onClick={onClose} variant="contained">
            {t('common.close')}
          </Button>
        ) : isWord ? (
          /* Word: Annulla, Modifica contenuto, Converti in PDF */
          <>
            <Button onClick={onClose}>
              {t('common.cancel')}
            </Button>
            {onEditContent && (
              <Button startIcon={<EditNote />} onClick={handleEditContent} variant="outlined">
                {t('cvViewer.editContent')}
              </Button>
            )}
            {onConvertToPDF && (
              <Button startIcon={<PictureAsPdf />} onClick={handleConvertToPDF} variant="outlined">
                {t('cvViewer.convertToPdf')}
              </Button>
            )}
          </>
        ) : (
          /* Altri formati: Scarica e Chiudi */
          <>
            <Button startIcon={<CloudDownload />} onClick={handleDownload}>
              {t('common.download')}
            </Button>
            <Button onClick={onClose}>{t('common.close')}</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CVViewerDialog;

