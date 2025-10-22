import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Lightbulb,
  Psychology,
} from '@mui/icons-material';
import { analyzeCVMatch } from '../services/aiService';

interface CVMatcherDialogProps {
  open: boolean;
  onClose: () => void;
  cvText: string;
  jobDescription: string;
  jobTitle?: string;
}

const CVMatcherDialog: React.FC<CVMatcherDialogProps> = ({
  open,
  onClose,
  cvText,
  jobDescription,
  jobTitle,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    score: number;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    summary: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!cvText || !jobDescription) {
      setError('CV e Job Description sono obbligatori');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      console.log('Starting CV analysis...');
      
      const result = await analyzeCVMatch(cvText, jobDescription);
      console.log('Analysis complete:', result);
      
      setAnalysis(result);
    } catch (err: any) {
      console.error('Error analyzing CV:', err);
      setError(err.message || 'Errore durante l\'analisi AI');
    } finally {
      setAnalyzing(false);
    }
  };

  // Auto-analyze when dialog opens (optional)
  React.useEffect(() => {
    if (open && !analysis && !analyzing && cvText && jobDescription) {
      handleAnalyze();
    }
  }, [open]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Ottimo Match!';
    if (score >= 60) return 'Buon Match';
    if (score >= 40) return 'Match Parziale';
    return 'Match Basso';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Psychology color="primary" />
          <Typography variant="h6">
            AI CV Matcher
            {jobTitle && ` - ${jobTitle}`}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {analyzing && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Analisi in corso con AI...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Può richiedere 5-10 secondi
            </Typography>
          </Box>
        )}

        {!analyzing && analysis && (
          <Box>
            {/* Score Section */}
            <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'background.default', textAlign: 'center' }}>
              <Typography variant="h3" color={`${getScoreColor(analysis.score)}.main`} gutterBottom>
                {analysis.score}%
              </Typography>
              <Chip
                label={getScoreLabel(analysis.score)}
                color={getScoreColor(analysis.score) as any}
                sx={{ mb: 2 }}
              />
              <LinearProgress
                variant="determinate"
                value={analysis.score}
                color={getScoreColor(analysis.score) as any}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Paper>

            {/* Summary */}
            <Typography variant="body1" paragraph sx={{ mb: 3, fontStyle: 'italic' }}>
              {analysis.summary}
            </Typography>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" />
                  Punti di Forza
                </Typography>
                <List dense>
                  {analysis.strengths.map((strength, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircle color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={strength} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Gaps */}
            {analysis.gaps.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Warning color="warning" />
                  Gap da Colmare
                </Typography>
                <List dense>
                  {analysis.gaps.map((gap, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Warning color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={gap} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Lightbulb color="info" />
                  Raccomandazioni
                </Typography>
                <List dense>
                  {analysis.recommendations.map((recommendation, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Lightbulb color="info" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={recommendation} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}

        {!analyzing && !analysis && !error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Psychology sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Pronto ad analizzare il match tra il tuo CV e questa posizione
            </Typography>
            <Button
              variant="contained"
              onClick={handleAnalyze}
              sx={{ mt: 2 }}
              startIcon={<Psychology />}
            >
              Avvia Analisi AI
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {analysis && (
          <Button onClick={() => setAnalysis(null)} startIcon={<Psychology />}>
            Rianalizza
          </Button>
        )}
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVMatcherDialog;

