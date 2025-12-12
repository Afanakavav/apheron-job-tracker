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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Analytics,
  Work,
  School,
  TrendingUp,
  AttachMoney,
  Link as LinkIcon,
  TextFields as TextIcon,
} from '@mui/icons-material';
import { analyzeJobDescription } from '../services/aiService';
import { GAEvents } from '../services/googleAnalytics';
import { fetchJobDescriptionFromURL } from '../services/cvTailoringService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { uploadCVFile, createCV } from '../services/cvService';
import jsPDF from 'jspdf';
import { Description as DescriptionIcon } from '@mui/icons-material';
import i18n from '../i18n/i18n';

interface JobAnalyzerDialogProps {
  open: boolean;
  onClose: () => void;
  onAnalysisComplete?: (analysis: any) => void;
  prefilledJobDescription?: string;
  prefilledJobUrl?: string; // URL of job description from application
  applicationCompany?: string; // Company name from application context (used to determine folder)
  applicationJobTitle?: string; // Job title from application context (used to determine folder)
}

const JobAnalyzerDialog: React.FC<JobAnalyzerDialogProps> = ({
  open,
  onClose,
  onAnalysisComplete,
  prefilledJobDescription,
  prefilledJobUrl,
  applicationCompany,
  applicationJobTitle,
}) => {
  const { currentUser } = useAuth();
  const { t, language } = useTranslation();
  // Internal form state
  const [jobDescriptionType, setJobDescriptionType] = useState<'url' | 'text'>('text');
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Prefill job description when prop changes
  useEffect(() => {
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
  }, [prefilledJobDescription, prefilledJobUrl]);
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
  const [saved, setSaved] = useState(false);
  const [showUrlErrorSuggestion, setShowUrlErrorSuggestion] = useState(false);
  const [jobDescriptionBeforeAnalysis, setJobDescriptionBeforeAnalysis] = useState<string>('');

  // Check if analysis result is incomplete or indicates an error
  const isAnalysisIncomplete = (result: any): boolean => {
    if (!result) return true;
    
    // Check if summary contains error indicators
    const summaryLower = (result.summary || '').toLowerCase();
    const errorIndicators = [
      'incomplete',
      'error message',
      'no details',
      'appears to be an error',
      'unable to extract',
      'failed to',
      'could not'
    ];
    
    const hasErrorInSummary = errorIndicators.some(indicator => 
      summaryLower.includes(indicator)
    );
    
    // Check if key fields are missing or contain "not specified"
    const hasNotSpecified = 
      (result.experienceLevel && result.experienceLevel.toLowerCase().includes('not specified')) ||
      (result.workType && result.workType.toLowerCase().includes('not specified'));
    
    // Check if no meaningful data was extracted
    const hasNoData = 
      (!result.requiredSkills || result.requiredSkills.length === 0) &&
      (!result.preferredSkills || result.preferredSkills.length === 0) &&
      (!result.responsibilities || result.responsibilities.length === 0) &&
      (!result.qualifications || result.qualifications.length === 0);
    
    return hasErrorInSummary || hasNotSpecified || hasNoData;
  };

  const handleAnalyze = async () => {
    if (jobDescriptionType === 'url' && !jobUrl) {
      setError(t('jobAnalyzer.errorRequiredUrl'));
      return;
    }
    
    if (jobDescriptionType === 'text' && !jobDescription) {
      setError(t('jobAnalyzer.errorRequiredText'));
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      console.log('Starting job description analysis...');
      
      // Save the current job description state before analysis (to restore it if URL analysis fails)
      setJobDescriptionBeforeAnalysis(jobDescription);
      
      let jobDescriptionText = jobDescription;
      
      // If URL is provided, fetch content from URL
      if (jobDescriptionType === 'url' && jobUrl) {
        try {
          console.log('Fetching job description from URL:', jobUrl);
          jobDescriptionText = await fetchJobDescriptionFromURL(jobUrl);
          console.log('Job description fetched successfully, length:', jobDescriptionText.length);
        } catch (urlError: any) {
          console.error('Error fetching from URL:', urlError);
          setError(t('jobAnalyzer.errorFetchingUrl'));
          setAnalyzing(false);
          return;
        }
      }
      
      // Get current language directly from i18n to ensure it's up-to-date
      const currentLanguage = i18n.language || 'it';
      const result = await analyzeJobDescription(jobDescriptionText, currentLanguage);
      console.log('Analysis complete:', result);
      
      // Check if analysis is incomplete or indicates an error
      if (jobDescriptionType === 'url' && isAnalysisIncomplete(result)) {
        // If analysis from URL failed, reset to input form and suggest using text
        // Restore the job description to its state before analysis
        setShowUrlErrorSuggestion(true);
        setJobDescriptionType('text');
        setJobDescription(jobDescriptionBeforeAnalysis); // Restore previous state
        setAnalysis(null);
        setAnalyzing(false);
        return;
      }
      
      // If we get here, analysis is good
      setShowUrlErrorSuggestion(false);
      
      // Track analytics event
      GAEvents.analyzeJob();
      
      setAnalysis(result);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (err: any) {
      console.error('Error analyzing job description:', err);
      setError(err.message || t('jobAnalyzer.error'));
    } finally {
      setAnalyzing(false);
    }
  };

  // Reset error suggestion when dialog closes
  useEffect(() => {
    if (!open) {
      setShowUrlErrorSuggestion(false);
    }
  }, [open]);

  // Auto-analyze when dialog opens
  useEffect(() => {
    if (open && !analysis && !analyzing && jobDescription) {
      handleAnalyze();
    }
  }, [open]);

  const getExperienceLevelColor = (level: string | null | undefined): string => {
    if (!level) return 'default';
    const lowerLevel = level.toLowerCase();
    if (lowerLevel.includes('entry')) return 'success';
    if (lowerLevel.includes('mid')) return 'info';
    if (lowerLevel.includes('senior') || lowerLevel.includes('lead')) return 'warning';
    return 'default';
  };

  const getWorkTypeIcon = (type: string | null | undefined) => {
    if (!type) return '📍';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('remote')) return '🏠';
    if (lowerType.includes('hybrid')) return '🔀';
    if (lowerType.includes('onsite')) return '🏢';
    return '📍';
  };

  const handleSaveToDocuments = async () => {
    if (!currentUser || !analysis) return;

    try {
      setError(null);
      
      // Generate PDF content
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text(t('jobAnalyzer.title'), 14, 20);
      
      // Date
      doc.setFontSize(10);
      const dateLocale = language === 'en' ? 'en-US' : 'it-IT';
      const dateText = new Date().toLocaleDateString(dateLocale);
      doc.text(`${t('jobAnalyzer.generatedOn')} ${dateText}`, 14, 30);
      
      let yPos = 40;
      
      // Summary
      doc.setFontSize(14);
      doc.text(`${t('jobAnalyzer.summaryLabel')}:`, 14, yPos);
      yPos += 8;
      
      doc.setFontSize(11);
      const summaryLines = doc.splitTextToSize(analysis.summary, 175);
      doc.text(summaryLines, 14, yPos);
      yPos += summaryLines.length * 6 + 10;
      
      // Experience Level, Work Type, Salary
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      if (analysis.experienceLevel) {
        doc.text(`${t('jobAnalyzer.experienceLevelLabel')}: ${analysis.experienceLevel}`, 14, yPos);
        yPos += 7;
      }
      if (analysis.workType) {
        doc.text(`${t('jobAnalyzer.workTypeLabel')}: ${analysis.workType}`, 14, yPos);
        yPos += 7;
      }
      if (analysis.salaryRange) {
        doc.text(`${t('jobAnalyzer.salaryRangeLabel')}: ${analysis.salaryRange}`, 14, yPos);
        yPos += 7;
      }
      yPos += 5;
      
      // Required Skills
      if (analysis.requiredSkills.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text(`${t('jobAnalyzer.requiredSkillsSection')}:`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        analysis.requiredSkills.forEach((skill) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${skill}`, 165);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        });
        yPos += 5;
      }
      
      // Preferred Skills
      if (analysis.preferredSkills.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text(`${t('jobAnalyzer.preferredSkillsSection')}:`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        analysis.preferredSkills.forEach((skill) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${skill}`, 165);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        });
        yPos += 5;
      }
      
      // Responsibilities
      if (analysis.responsibilities.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text(`${t('jobAnalyzer.responsibilitiesSection')}:`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        analysis.responsibilities.forEach((resp) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${resp}`, 165);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        });
        yPos += 5;
      }
      
      // Qualifications
      if (analysis.qualifications.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text(`${t('jobAnalyzer.qualificationsSection')}:`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        analysis.qualifications.forEach((qual) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${qual}`, 165);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        });
      }
      
      // Generate PDF blob
      const pdfBlob = doc.output('blob');
      
      // Create File from Blob
      const timestamp = Date.now();
      const fileName = `Job_Analyzer_${timestamp}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      // Upload to Firebase Storage
      const uploadResult = await uploadCVFile(currentUser.uid, pdfFile);
      
      // Determine folder: if opened from application context, use application folder; otherwise use "Documenti AI"
      let documentFolder = 'Documenti AI';
      // For new applications (applicationId empty) or existing applications, check if we have jobTitle and company
      if (applicationCompany && applicationJobTitle) {
        // Save to application folder when opened from application context (even for new applications)
        documentFolder = `${applicationCompany} - ${applicationJobTitle}`;
      }
      
      // Create document entry in Firestore
      const tags = ['AI Analysis', 'Job Analyzer'];
      if (applicationCompany) tags.push(applicationCompany);
      if (applicationJobTitle) tags.push(applicationJobTitle);
      
      const titleParts = ['Job Analyzer'];
      if (applicationCompany) titleParts.push(applicationCompany);
      if (applicationJobTitle) titleParts.push(applicationJobTitle);
      
      await createCV(currentUser.uid, {
        name: titleParts.join(' - '),
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.url,
        fileSize: pdfFile.size,
        tags: tags.filter(Boolean),
        category: 'AI Analyzed',
        description: t('jobAnalyzer.descriptionDocument'),
        folder: documentFolder,
      });
      
      alert(t('jobAnalyzer.pdfSavedSuccess'));
      GAEvents.uploadCV('pdf');
      setSaved(true);
    } catch (err: any) {
      console.error('Error saving PDF to documents:', err);
      setError(t('jobAnalyzer.errorSavingPdf', { error: err.message }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Analytics color="primary" />
          <Typography variant="h6">
            {t('jobAnalyzer.title')}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Input Form - Show when not analyzing and no results */}
        {!analyzing && !analysis && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {showUrlErrorSuggestion ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  {t('jobAnalyzer.urlAnalysisIncompleteTitle')}
                </Typography>
                <Typography variant="body2">
                  {t('jobAnalyzer.urlAnalysisIncompleteSuggestion')}
                  {jobUrl && (
                    <>
                      <br />
                      <Typography component="span" variant="caption" sx={{ fontStyle: 'italic' }}>
                        (URL originale: {jobUrl})
                      </Typography>
                    </>
                  )}
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  {t('jobAnalyzer.infoMessage')}
                </Typography>
              </Alert>
            )}

            {/* Job Description Type Toggle */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Job Description
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
                  {t('jobAnalyzer.urlToggle')}
                </ToggleButton>
                <ToggleButton value="text">
                  <TextIcon sx={{ mr: 1 }} fontSize="small" />
                  {t('jobAnalyzer.textToggle')}
                </ToggleButton>
              </ToggleButtonGroup>

              {jobDescriptionType === 'url' ? (
                <TextField
                  fullWidth
                  required
                  label={t('jobAnalyzer.urlLabel')}
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder={t('jobAnalyzer.urlPlaceholder')}
                  helperText={t('jobAnalyzer.urlHelper')}
                />
              ) : (
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={10}
                  label={t('jobAnalyzer.textLabel')}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder={t('jobAnalyzer.textPlaceholder')}
                  helperText={t('jobAnalyzer.textHelper')}
                />
              )}
            </Box>
          </Box>
        )}

        {analyzing && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              {t('jobAnalyzer.analyzing')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('jobAnalyzer.analyzingSubtext')}
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
              {analysis.experienceLevel && (
                <Chip
                  icon={<TrendingUp />}
                  label={`${t('jobAnalyzer.levelLabel')}: ${analysis.experienceLevel}`}
                  color={getExperienceLevelColor(analysis.experienceLevel) as any}
                  variant="outlined"
                />
              )}
              {analysis.workType && (
                <Chip
                  label={`${getWorkTypeIcon(analysis.workType)} ${analysis.workType}`}
                  variant="outlined"
                />
              )}
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
                  {t('jobAnalyzer.requiredSkillsSection')}
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
                  {t('jobAnalyzer.preferredSkillsSection')}
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
                  {t('jobAnalyzer.responsibilitiesSection')}
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
                  {t('jobAnalyzer.qualificationsSection')}
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
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('jobAnalyzer.close')}</Button>
        {analysis && (
          <>
            <Button 
              onClick={() => {
                setAnalysis(null);
                setJobDescriptionType('text');
                setJobUrl('');
                setJobDescription('');
                setSaved(false);
                setShowUrlErrorSuggestion(false);
              }} 
              startIcon={<Analytics />}
            >
              {t('jobAnalyzer.reanalyze')}
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveToDocuments}
              startIcon={<DescriptionIcon />}
              disabled={!currentUser || saved}
            >
              {saved ? t('jobAnalyzer.alreadySaved') : t('jobAnalyzer.saveToDocuments')}
            </Button>
          </>
        )}
        {!analysis && !analyzing && (
          <Button
            variant="contained"
            onClick={handleAnalyze}
            disabled={jobDescriptionType === 'url' ? !jobUrl : !jobDescription}
            startIcon={<Analytics />}
          >
            {t('jobAnalyzer.analyzeJob')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default JobAnalyzerDialog;

