import React, { useState, useEffect } from 'react';
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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Lightbulb,
  Psychology,
  Link as LinkIcon,
  TextFields as TextIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { analyzeCVMatch } from '../services/aiService';
import { GAEvents } from '../services/googleAnalytics';
import { useAuth } from '../contexts/AuthContext';
import { getUserCVs } from '../services/cvService';
import { extractTextFromCV, fetchJobDescriptionFromURL } from '../services/cvTailoringService';
import { useTranslation } from '../hooks/useTranslation';
import { uploadCVFile, createCV } from '../services/cvService';
import jsPDF from 'jspdf';
import i18n from '../i18n/i18n';

interface CVMatcherDialogProps {
  open: boolean;
  onClose: () => void;
  prefilledCVId?: string;
  prefilledJobDescription?: string;
  prefilledJobUrl?: string; // URL of job description from application
  prefilledJobTitle?: string;
  applicationCompany?: string; // Company name from application context (used to determine folder)
  lockCVSelection?: boolean; // If true, CV field is disabled and cannot be changed
}

const CVMatcherDialog: React.FC<CVMatcherDialogProps> = ({
  open,
  onClose,
  prefilledCVId,
  prefilledJobDescription,
  prefilledJobUrl,
  prefilledJobTitle,
  applicationCompany,
  lockCVSelection = false,
}) => {
  const { t, language } = useTranslation();
  const { currentUser } = useAuth();
  
  // Internal form state
  const [cvs, setCvs] = useState<any[]>([]);
  const [selectedCVId, setSelectedCVId] = useState('');
  const [jobDescriptionType, setJobDescriptionType] = useState<'url' | 'text'>('text');
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Prefill when props change
  useEffect(() => {
    if (prefilledCVId) {
      setSelectedCVId(prefilledCVId);
    }
    // Prefer URL if available, otherwise use text description
    if (prefilledJobUrl) {
      setJobDescriptionType('url');
      setJobUrl(prefilledJobUrl);
      // Also set text if available (for display)
      if (prefilledJobDescription) {
        setJobDescription(prefilledJobDescription);
      }
    } else if (prefilledJobDescription) {
      // Check if it's a URL or text
      if (prefilledJobDescription.startsWith('http://') || prefilledJobDescription.startsWith('https://')) {
        setJobDescriptionType('url');
        setJobUrl(prefilledJobDescription);
      } else {
        setJobDescriptionType('text');
        setJobDescription(prefilledJobDescription);
      }
    }
    if (prefilledJobTitle) {
      setJobTitle(prefilledJobTitle);
    }
  }, [prefilledCVId, prefilledJobDescription, prefilledJobUrl, prefilledJobTitle]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    score: number;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    summary: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load CVs on mount
  useEffect(() => {
    if (currentUser && open) {
      loadCVs();
    }
  }, [currentUser, open]);

  const loadCVs = async () => {
    if (!currentUser) return;
    try {
      const userCVs = await getUserCVs(currentUser.uid);
      setCvs(userCVs);
      // Non preselezionare nessun CV
    } catch (err) {
      console.error('Error loading CVs:', err);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedCVId) {
      setError(t('cvMatcher.errorSelectCV'));
      return;
    }
    
    if (jobDescriptionType === 'url' && !jobUrl) {
      setError(t('cvMatcher.errorRequiredUrl'));
      return;
    }
    
    if (jobDescriptionType === 'text' && !jobDescription) {
      setError(t('cvMatcher.errorRequiredText'));
      return;
    }
    
    // Get CV content from selected CV
    const selectedCV = cvs.find(cv => cv.id === selectedCVId);
    if (!selectedCV) {
      setError(t('cvMatcher.errorCVNotFound'));
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      console.log('Starting CV analysis...');
      
      // Extract text from CV file
      console.log('Extracting text from CV:', selectedCV.fileName);
      const cvContent = await extractTextFromCV(selectedCV.fileUrl, selectedCV.fileName);
      console.log('CV text extracted successfully, length:', cvContent.length);
      
      // Get job description text (extract from URL if needed)
      let jobDescriptionText = jobDescription;
      
      if (jobDescriptionType === 'url' && jobUrl) {
        try {
          console.log('Fetching job description from URL:', jobUrl);
          jobDescriptionText = await fetchJobDescriptionFromURL(jobUrl);
          console.log('Job description fetched successfully, length:', jobDescriptionText.length);
        } catch (urlError: any) {
          console.error('Error fetching from URL:', urlError);
          setError(t('cvMatcher.errorFetchingUrl'));
          setAnalyzing(false);
          return;
        }
      }
      
      // Get current language directly from i18n to ensure it's up-to-date
      const currentLanguage = i18n.language || 'it';
      const result = await analyzeCVMatch(cvContent, jobDescriptionText, currentLanguage);
      console.log('Analysis complete:', result);
      
      // Track analytics event
      GAEvents.useCVMatcher(result.score);
      
      setAnalysis(result);
    } catch (err: any) {
      console.error('Error analyzing CV:', err);
      const errorMessage = err.message || 'Errore durante l\'analisi AI';
      setError(errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

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

  const handleSaveToDocuments = async () => {
    if (!currentUser || !analysis || !selectedCVId) return;

    try {
      setError(null);
      
      // Generate PDF content
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text(`${t('aiAssistant.dialogTitleCVMatcher')} - ${jobTitle || t('aiAssistant.cvAnalysisTitle')}`, 14, 20);
      
      // Date
      doc.setFontSize(10);
      const dateLocale = language === 'en' ? 'en-US' : 'it-IT';
      const dateText = new Date().toLocaleDateString(dateLocale);
      doc.text(`${t('cvMatcher.generatedOn')} ${dateText}`, 14, 30);
      
      // Score Section
      let yPos = 40;
      doc.setFontSize(16);
      doc.text(`Match Score: ${analysis.score}%`, 14, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.text(`Label: ${getScoreLabel(analysis.score)}`, 14, yPos);
      yPos += 15;
      
      // Summary
      doc.setFontSize(14);
      doc.text(`${t('jobAnalyzer.summaryLabel')}:`, 14, yPos);
      yPos += 8;
      
      doc.setFontSize(11);
      const summaryLines = doc.splitTextToSize(analysis.summary, 175);
      doc.text(summaryLines, 14, yPos);
      yPos += summaryLines.length * 6 + 10;
      
      // Strengths
      if (analysis.strengths.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text(`${t('cvMatcher.strengths')}:`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        analysis.strengths.forEach((strength) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${strength}`, 165);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        });
        yPos += 5;
      }
      
      // Gaps
      if (analysis.gaps.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text(`${t('cvMatcher.gapsToFill')}:`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        analysis.gaps.forEach((gap) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${gap}`, 165);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        });
        yPos += 5;
      }
      
      // Recommendations
      if (analysis.recommendations.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text(`${t('cvMatcher.recommendations')}:`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        analysis.recommendations.forEach((recommendation) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${recommendation}`, 165);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        });
      }
      
      // Generate PDF blob
      const pdfBlob = doc.output('blob');
      
      // Create File from Blob
      const timestamp = Date.now();
      const fileName = `CV_Match_${jobTitle?.replace(/[^a-zA-Z0-9]/g, '_') || 'Analysis'}_${timestamp}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      // Upload to Firebase Storage
      const uploadResult = await uploadCVFile(currentUser.uid, pdfFile);
      
      // Determine folder: if opened from application context, use application folder; otherwise use "Documenti AI"
      let documentFolder = 'Documenti AI';
      // For new applications (applicationId empty) or existing applications, check if we have jobTitle and company
      if (applicationCompany && jobTitle) {
        // Save to application folder when opened from application context (even for new applications)
        documentFolder = `${applicationCompany} - ${jobTitle}`;
      }
      
      // Create document entry in Firestore
      const tags = ['AI Analysis', 'CV Matcher'];
      if (applicationCompany) tags.push(applicationCompany);
      if (jobTitle) tags.push(jobTitle);
      
      const titleParts = ['CV Matcher'];
      if (applicationCompany) titleParts.push(applicationCompany);
      if (jobTitle) titleParts.push(jobTitle);
      
      await createCV(currentUser.uid, {
        name: titleParts.join(' - '),
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.url,
        fileSize: pdfFile.size,
        tags: tags.filter(Boolean),
        category: 'AI Analyzed',
        description: t('cvMatcher.descriptionDocument', { 
          jobTitle: jobTitle || t('cvMatcher.jobTitle'), 
          score: analysis.score 
        }),
        folder: documentFolder,
      });
      
      alert(t('cvMatcher.successSaving'));
      GAEvents.uploadCV('pdf');
      setSaved(true);
    } catch (err: any) {
      console.error('Error saving PDF to documents:', err);
      setError('Errore nel salvataggio del PDF: ' + err.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Psychology color="primary" />
          <Typography variant="h6">
            {t('aiAssistant.dialogTitleCVMatcher')}
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

        {/* Input Form */}
        {!analyzing && !analysis && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              <Typography variant="body2">
                💡 {t('aiAssistant.cvMatcherTip')}
              </Typography>
            </Alert>

            {/* CV Selection */}
            {cvs.length > 0 ? (
              <TextField
                select
                fullWidth
                required
                label={t('aiAssistant.selectYourCV')}
                value={selectedCVId}
                onChange={(e) => setSelectedCVId(e.target.value)}
                disabled={lockCVSelection}
                helperText={lockCVSelection ? t('cvMatcher.cvAutoSelected') : t('aiAssistant.aiWillAnalyzeCV')}
              >
                <MenuItem value="">
                  <em>{t('cvMatcher.selectCV')}</em>
                </MenuItem>
                {cvs.map((cv) => (
                  <MenuItem key={cv.id} value={cv.id}>
                    {cv.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Alert severity="warning">
                {t('cvMatcher.noCVFound')}
              </Alert>
            )}

            {/* Job Description Type Toggle */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('cvMatcher.jobDescription')}
              </Typography>
              <ToggleButtonGroup
                value={jobDescriptionType}
                exclusive
                onChange={(_, newValue) => {
                  if (newValue) setJobDescriptionType(newValue);
                }}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              >
                <ToggleButton value="url">
                  <LinkIcon sx={{ mr: 1 }} fontSize="small" />
                  URL
                </ToggleButton>
                <ToggleButton value="text">
                  <TextIcon sx={{ mr: 1 }} fontSize="small" />
                  {t('cvMatcher.text')}
                </ToggleButton>
              </ToggleButtonGroup>

              {jobDescriptionType === 'url' ? (
                <TextField
                  fullWidth
                  required
                  label={t('cvMatcher.urlJobDescription')}
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://..."
                  helperText={t('cvMatcher.urlJobDescriptionHelper')}
                />
              ) : (
                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  required
                  label={t('cvMatcher.jobDescription')}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder={t('aiAssistant.pasteJobDescription')}
                  helperText={t('aiAssistant.aiWillAnalyzeText')}
                />
              )}
            </Box>

            <TextField
              fullWidth
              label={t('cvMatcher.jobTitle')}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={t('cvMatcher.jobTitlePlaceholder')}
            />
          </Box>
        )}

        {analyzing && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              {t('cvMatcher.analyzingWithAI')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('cvMatcher.mayTakeSeconds')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              💡 Se il server è occupato, riproverò automaticamente...
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
                  {t('cvMatcher.strengths')}
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
                  {t('cvMatcher.gapsToFill')}
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
                  {t('cvMatcher.recommendations')}
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
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('cvMatcher.close')}</Button>
        {analysis && (
          <>
            <Button 
              onClick={() => {
                setAnalysis(null);
                if (!lockCVSelection) {
                  setSelectedCVId('');
                }
                setJobDescriptionType('text');
                setJobUrl('');
                setJobDescription('');
                setJobTitle('');
                setSaved(false);
              }} 
              startIcon={<Psychology />}
            >
              {t('cvMatcher.reanalyze')}
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveToDocuments}
              startIcon={<DescriptionIcon />}
              disabled={!currentUser || saved}
            >
              {saved ? t('cvMatcher.alreadySaved') : t('cvMatcher.saveToDocuments')}
            </Button>
          </>
        )}
        {!analysis && !analyzing && (
          <Button
            variant="contained"
            onClick={handleAnalyze}
            disabled={!selectedCVId || (jobDescriptionType === 'url' ? !jobUrl : !jobDescription)}
            startIcon={<Psychology />}
          >
            {t('aiAssistant.buttonAnalyzeCV')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CVMatcherDialog;

