import React, { useState } from 'react';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AutoAwesome,
  ContentCopy,
  Download,
  Refresh,
} from '@mui/icons-material';
import { generateCoverLetter } from '../services/aiService';
import { GAEvents } from '../services/googleAnalytics';

interface CoverLetterGeneratorProps {
  open: boolean;
  onClose: () => void;
  cvText: string;
  jobDescription: string;
  companyName: string;
  jobTitle: string;
  onSave?: (coverLetter: string) => void;
}

const CoverLetterGenerator: React.FC<CoverLetterGeneratorProps> = ({
  open,
  onClose,
  cvText,
  jobDescription,
  companyName,
  jobTitle,
  onSave,
}) => {
  const [generating, setGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!cvText || !jobDescription) {
      setError('CV e Job Description sono obbligatori');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      console.log('Generating cover letter...');
      
      const result = await generateCoverLetter(
        cvText,
        jobDescription,
        companyName,
        jobTitle,
        additionalInfo || undefined
      );
      
      console.log('Cover letter generated');
      
      // Track analytics event
      GAEvents.generateCoverLetter();
      
      setCoverLetter(result);
    } catch (err: any) {
      console.error('Error generating cover letter:', err);
      setError(err.message || 'Errore durante la generazione');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${companyName.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (onSave && coverLetter) {
      onSave(coverLetter);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome color="primary" />
          <Typography variant="h6">
            AI Cover Letter Generator
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {companyName} - {jobTitle}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Additional Info Input */}
        {!coverLetter && !generating && (
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Informazioni Aggiuntive (opzionale)"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Es: Perché sei interessato a questa azienda? Hai qualche connessione particolare?"
              helperText="L'AI userà queste info per personalizzare ulteriormente la cover letter"
            />
          </Box>
        )}

        {/* Generating State */}
        {generating && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Generazione cover letter con AI...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Può richiedere 10-20 secondi
            </Typography>
          </Box>
        )}

        {/* Generated Cover Letter */}
        {!generating && coverLetter && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Cover Letter Generata
              </Typography>
              <Box>
                <Tooltip title={copied ? 'Copiato!' : 'Copia'}>
                  <IconButton size="small" onClick={handleCopy}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Scarica">
                  <IconButton size="small" onClick={handleDownload}>
                    <Download fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Rigenera">
                  <IconButton size="small" onClick={handleGenerate} color="primary">
                    <Refresh fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={15}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                },
              }}
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              💡 Puoi modificare il testo direttamente nel campo sopra prima di salvarlo
            </Alert>
          </Box>
        )}

        {/* Initial State */}
        {!generating && !coverLetter && !error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AutoAwesome sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Pronto a generare una cover letter personalizzata per questa posizione
            </Typography>
            <Button
              variant="contained"
              onClick={handleGenerate}
              sx={{ mt: 2 }}
              startIcon={<AutoAwesome />}
            >
              Genera Cover Letter
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {coverLetter && onSave && (
          <Button onClick={handleSave} variant="contained" color="primary">
            Salva nella Candidatura
          </Button>
        )}
        <Button onClick={onClose}>
          {coverLetter ? 'Chiudi' : 'Annulla'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CoverLetterGenerator;

