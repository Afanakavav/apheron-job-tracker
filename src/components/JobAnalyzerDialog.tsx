import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material';
import {
  Analytics,
  Work,
  School,
  TrendingUp,
  AttachMoney,
} from '@mui/icons-material';
import { analyzeJobDescription } from '../services/aiService';
import { GAEvents } from '../services/googleAnalytics';

interface JobAnalyzerDialogProps {
  open: boolean;
  onClose: () => void;
  jobDescription: string;
  onAnalysisComplete?: (analysis: any) => void;
}

const JobAnalyzerDialog: React.FC<JobAnalyzerDialogProps> = ({
  open,
  onClose,
  jobDescription,
  onAnalysisComplete,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    requiredSkills: string[];
    preferredSkills: string[];
    experienceLevel: string;
    responsibilities: string[];
    qualifications: string[];
    salaryRange?: string;
    workType: string;
    summary: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!jobDescription) {
      setError('Job Description è obbligatoria');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      console.log('Starting job description analysis...');
      
      const result = await analyzeJobDescription(jobDescription);
      console.log('Analysis complete:', result);
      
      // Track analytics event
      GAEvents.analyzeJob();
      
      setAnalysis(result);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (err: any) {
      console.error('Error analyzing job description:', err);
      setError(err.message || 'Errore durante l\'analisi AI');
    } finally {
      setAnalyzing(false);
    }
  };

  // Auto-analyze when dialog opens
  useEffect(() => {
    if (open && !analysis && !analyzing && jobDescription) {
      handleAnalyze();
    }
  }, [open]);

  const getExperienceLevelColor = (level: string): string => {
    const lowerLevel = level.toLowerCase();
    if (lowerLevel.includes('entry')) return 'success';
    if (lowerLevel.includes('mid')) return 'info';
    if (lowerLevel.includes('senior') || lowerLevel.includes('lead')) return 'warning';
    return 'default';
  };

  const getWorkTypeIcon = (type: string) => {
    if (type.toLowerCase().includes('remote')) return '🏠';
    if (type.toLowerCase().includes('hybrid')) return '🔀';
    if (type.toLowerCase().includes('onsite')) return '🏢';
    return '📍';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Analytics color="primary" />
          <Typography variant="h6">
            AI Job Analyzer
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
              Analisi job description con AI...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Estrazione requisiti e skills in corso
            </Typography>
          </Box>
        )}

        {!analyzing && analysis && (
          <Box>
            {/* Summary */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                {analysis.summary}
              </Typography>
            </Paper>

            {/* Key Info */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Chip
                icon={<TrendingUp />}
                label={`Level: ${analysis.experienceLevel}`}
                color={getExperienceLevelColor(analysis.experienceLevel) as any}
                variant="outlined"
              />
              <Chip
                label={`${getWorkTypeIcon(analysis.workType)} ${analysis.workType}`}
                variant="outlined"
              />
              {analysis.salaryRange && (
                <Chip
                  icon={<AttachMoney />}
                  label={analysis.salaryRange}
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Required Skills */}
            {analysis.requiredSkills.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Work color="error" />
                  Skills Richieste (Must-Have)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {analysis.requiredSkills.map((skill, index) => (
                    <Chip
                      key={index}
                      label={skill}
                      color="error"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Preferred Skills */}
            {analysis.preferredSkills.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp color="primary" />
                  Skills Preferite (Nice-to-Have)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {analysis.preferredSkills.map((skill, index) => (
                    <Chip
                      key={index}
                      label={skill}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Responsibilities */}
            {analysis.responsibilities.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📋 Responsabilità
                </Typography>
                <List dense>
                  {analysis.responsibilities.map((resp, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={`• ${resp}`} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Qualifications */}
            {analysis.qualifications.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <School color="info" />
                  Qualifiche Richieste
                </Typography>
                <List dense>
                  {analysis.qualifications.map((qual, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={`• ${qual}`} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}

        {!analyzing && !analysis && !error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Analytics sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Analizza questa job description per estrarre skills, requisiti e responsabilità
            </Typography>
            <Button
              variant="contained"
              onClick={handleAnalyze}
              sx={{ mt: 2 }}
              startIcon={<Analytics />}
            >
              Avvia Analisi AI
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {analysis && (
          <Button onClick={() => setAnalysis(null)} startIcon={<Analytics />}>
            Rianalizza
          </Button>
        )}
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobAnalyzerDialog;

