import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
  Collapse,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close,
  AutoAwesome,
  ContentCopy,
  ExpandMore,
  ExpandLess,
  Link as LinkIcon,
  Description,
  AddCircle,
} from '@mui/icons-material';
import { getUserCVs, uploadCVFile, createCV } from '../services/cvService';
import {
  extractTextFromCV,
  tailorCVToJob,
  fetchJobDescriptionFromURL,
  type CVTailoringResult,
} from '../services/cvTailoringService';
import { generateWordFromText, generateCVFilenameWord } from '../services/wordGenerationService';
import { GAEvents } from '../services/googleAnalytics';
import { useTranslation } from '../hooks/useTranslation';
import type { CV } from '../types';
import i18n from '../i18n/i18n';

interface CVTailoringDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  // Pre-fill from application (optional)
  prefilledJobDescription?: string;
  prefilledJobUrl?: string; // URL of job description from application
  prefilledCompany?: string;
  prefilledJobTitle?: string;
  prefilledCVId?: string;
  lockCVSelection?: boolean; // If true, CV field is disabled and cannot be changed
}

const CVTailoringDialog: React.FC<CVTailoringDialogProps> = ({
  open,
  onClose,
  userId,
  prefilledJobDescription,
  prefilledJobUrl,
  prefilledCompany,
  prefilledJobTitle,
  prefilledCVId,
  lockCVSelection = false,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [companyName, setCompanyName] = useState(prefilledCompany || '');
  const [jobTitle, setJobTitle] = useState(prefilledJobTitle || '');
  
  // Initialize inputMode and prefilledJobDescription when dialog opens or prop changes
  useEffect(() => {
    if (open) {
      // Prefer URL if available, otherwise use text description
      if (prefilledJobUrl) {
        setInputMode('url');
        setJobUrl(prefilledJobUrl);
        // Also set text if available (for display)
        if (prefilledJobDescription) {
          setJobDescription(prefilledJobDescription);
        } else {
          setJobDescription('');
        }
      } else if (prefilledJobDescription) {
        // Check if it's a URL or text
        if (prefilledJobDescription.startsWith('http://') || prefilledJobDescription.startsWith('https://')) {
          setInputMode('url');
          setJobUrl(prefilledJobDescription);
          setJobDescription('');
        } else {
          setInputMode('text');
          setJobDescription(prefilledJobDescription);
          setJobUrl('');
        }
      }
    }
  }, [prefilledJobDescription, prefilledJobUrl, open]);
  
  // Prefill CV when prop changes
  useEffect(() => {
    if (prefilledCVId) {
      setSelectedCvId(prefilledCVId);
    }
  }, [prefilledCVId]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CVTailoringResult | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text');
  const [tabValue, setTabValue] = useState(0);
  const [cvAdded, setCvAdded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      loadCVs();
    }
  }, [open, userId]);

  const loadCVs = async () => {
    try {
      const userCVs = await getUserCVs(userId);
      setCvs(userCVs);
    } catch (err) {
      console.error('Error loading CVs:', err);
      setError('Errore nel caricamento dei CV');
    }
  };

  const handleAnalyze = async () => {
    // Validate based on input mode
    const jobDescriptionInput = inputMode === 'text' ? jobDescription : jobUrl;
    
    if (!selectedCvId || !jobDescriptionInput) {
      setError(t('cvTailoring.errorRequiredFields'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const selectedCV = cvs.find(cv => cv.id === selectedCvId);
      if (!selectedCV) {
        throw new Error('CV non trovato');
      }

      // Extract text from CV (supports both PDF and Word)
      const cvText = await extractTextFromCV(selectedCV.fileUrl, selectedCV.fileName);

      // Fetch job description if URL, otherwise use text
      let finalJobDescription: string;
      if (inputMode === 'url') {
        // Fetch job description from URL using Cloud Function
        finalJobDescription = await fetchJobDescriptionFromURL(jobUrl);
      } else {
        finalJobDescription = jobDescription;
      }

      // Tailor CV to job
      // Get current language directly from i18n to ensure it's up-to-date
      const currentLanguage = i18n.language || 'it';
      const tailoredResult = await tailorCVToJob(
        cvText,
        finalJobDescription,
        companyName,
        jobTitle,
        currentLanguage
      );

      setResult(tailoredResult);
      setStep(1);
    } catch (err: any) {
      console.error('Error tailoring CV:', err);
      setError(err.message || 'Errore durante l\'ottimizzazione del CV');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToManager = async () => {
    if (!result) return;

    try {
      setSaving(true);
      setError(null);

      // Generate Word document from optimized CV text
      const wordBlob = await generateWordFromText(
        result.tailoredCV,
        companyName || 'Unknown Company',
        jobTitle
      );

      // Generate filename
      const filename = generateCVFilenameWord(companyName || 'Unknown_Company');

      // Convert Blob to File
      const wordFile = new File([wordBlob], filename, { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      // Upload Word document to Firebase Storage
      const uploadResult = await uploadCVFile(userId, wordFile);

      // Determine folder: if saving from application context, use application folder; otherwise use "Documenti AI"
      let documentFolder: string = 'Documenti AI';
      // For new applications (applicationId empty) or existing applications, check if we have jobTitle and company
      if (companyName && jobTitle) {
        // Save to application folder when opened from application context (even for new applications)
        documentFolder = `${companyName} - ${jobTitle}`;
      }
      
      // Get original CV name
      const selectedCV = cvs.find(cv => cv.id === selectedCvId);
      const originalCVName = selectedCV?.name || 'CV';
      
      // Create document name in format: "nome_CV - nome_azienda - nome_posizione"
      const documentName = `${originalCVName} - ${companyName || 'Unknown Company'} - ${jobTitle || 'Unknown Position'}`;
      
      // Create CV entry in Firestore
      const tags = ['AI Generated', 'CV'];
      if (companyName) tags.push(companyName);
      if (jobTitle) tags.push(jobTitle);
      
      await createCV(userId, {
        name: documentName,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.url,
        fileSize: wordFile.size,
        tags: tags.filter(Boolean),
        category: 'AI Generated',
        description: t('cvTailoring.descriptionDocument', { 
          jobTitle: jobTitle || t('cvTailoring.position'), 
          companyName: companyName || t('cvTailoring.company'),
          matchScore: result.matchScore 
        }),
        folder: documentFolder,
      });

      setSuccessMessage(`✅ CV aggiunto a Documenti come "${documentName}" (Word)`);
      setCvAdded(true); // Mark CV as added
      setSaved(true); // Mark as saved to disable button
      
      // Track analytics
      GAEvents.uploadCV('word');
      
      // Success message stays visible (don't auto-close)

    } catch (err: any) {
      console.error('Error adding CV to manager:', err);
      setError(err.message || 'Errore nel salvataggio del CV');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.tailoredCV);
    alert('CV copiato negli appunti!');
  };

  const handleClose = () => {
    setStep(0);
    if (!lockCVSelection) {
      setSelectedCvId('');
    }
    setJobDescription(prefilledJobDescription || '');
    setJobUrl(prefilledJobUrl || '');
    setCompanyName(prefilledCompany || '');
    setJobTitle(prefilledJobTitle || '');
    setResult(null);
    setError(null);
    setSuccessMessage(null);
    setExpandedSection(null);
    setCvAdded(false); // Reset on close
    setSaved(false);
    onClose();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome color="primary" />
            <Typography variant="h6">{t('aiAssistant.dialogTitleCVTailoring')}</Typography>
          </Box>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>{t('cvTailoring.stepConfigure')}</StepLabel>
          </Step>
          <Step>
            <StepLabel>{t('cvTailoring.stepResults')}</StepLabel>
          </Step>
        </Stepper>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {step === 0 && (
          <Stack spacing={3}>
            {/* CV Selection */}
            <TextField
              select
              fullWidth
              required
              label={t('cvTailoring.selectCV')}
              value={selectedCvId}
              onChange={(e) => setSelectedCvId(e.target.value)}
              disabled={loading || lockCVSelection}
              helperText={lockCVSelection ? t('cvTailoring.cvAutoSelected') : t('cvTailoring.chooseCVToOptimize')}
            >
              {cvs.length === 0 ? (
                <MenuItem value="" disabled>
                  {t('cvTailoring.noCVAvailable')}
                </MenuItem>
              ) : (
                cvs.map((cv) => (
                  <MenuItem key={cv.id} value={cv.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description fontSize="small" />
                      {cv.name}
                      {cv.category && <Chip label={cv.category} size="small" />}
                    </Box>
                  </MenuItem>
                ))
              )}
            </TextField>

            {/* Company & Job Title */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label={t('cvTailoring.company')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={loading}
                placeholder={t('cvTailoring.companyPlaceholder')}
              />
              <TextField
                fullWidth
                label={t('cvTailoring.position')}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={loading}
                placeholder={t('cvTailoring.positionPlaceholder')}
              />
            </Box>

            {/* Job Description Input Mode */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('cvTailoring.jobDescription')}
              </Typography>
              <Tabs
                value={inputMode === 'text' ? 0 : 1}
                onChange={(_, value) => setInputMode(value === 0 ? 'text' : 'url')}
                sx={{ mb: 2 }}
              >
                <Tab label={t('cvTailoring.text')} />
                <Tab label={t('cvTailoring.url')} />
              </Tabs>

              {inputMode === 'text' ? (
                <TextField
                  fullWidth
                  required
                  multiline
                  rows={10}
                  label={t('cvTailoring.jobDescription')}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={loading}
                  placeholder={t('cvTailoring.jobDescriptionTextPlaceholder')}
                  helperText={t('cvTailoring.jobDescriptionTextHelper')}
                />
              ) : (
                <TextField
                  fullWidth
                  required
                  label={t('cvTailoring.urlJobDescription')}
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  disabled={loading}
                  placeholder={t('cvTailoring.urlJobDescriptionPlaceholder')}
                  InputProps={{
                    startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  helperText={t('cvTailoring.urlJobDescriptionHelper')}
                />
              )}
            </Box>
          </Stack>
        )}

        {step === 1 && result && (
          <Stack spacing={3}>
            {/* Match Score */}
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">{t('cvTailoring.matchScore')}</Typography>
                  <Chip 
                    label={`${result.matchScore}%`} 
                    color={getScoreColor(result.matchScore)} 
                    sx={{ fontSize: '1.2rem', fontWeight: 'bold', px: 2, py: 1 }}
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={result.matchScore} 
                  color={getScoreColor(result.matchScore)}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📝 {t('cvTailoring.summaryOfChanges')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {result.summary}
                </Typography>
              </CardContent>
            </Card>

            {/* Keywords & Skills */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    🔑 {t('cvTailoring.suggestedKeywords')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {result.keywordsSuggested.map((keyword, index) => (
                      <Chip key={index} label={keyword} size="small" color="primary" variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    💪 {t('cvTailoring.skillsToHighlight')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {result.skillsToHighlight.map((skill, index) => (
                      <Chip key={index} label={skill} size="small" color="success" variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Modified Sections */}
            <Box>
              <Typography variant="h6" gutterBottom>
                📋 Sezioni Modificate
              </Typography>
              {result.sectionsToModify.map((section, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        {section.section}
                      </Typography>
                      <IconButton size="small">
                        {expandedSection === index ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                    
                    <Collapse in={expandedSection === index}>
                      <Box sx={{ mt: 2 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          {section.reasoning}
                        </Alert>

                        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                          <Tab label={t('cvTailoring.original')} />
                          <Tab label={t('cvTailoring.optimized')} />
                        </Tabs>

                        {tabValue === 0 ? (
                          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {section.currentContent}
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, color: 'success.contrastText' }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {section.suggestedContent}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              ))}
            </Box>

            {/* Full Tailored CV */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📄 {t('cvTailoring.fullOptimizedCV')}
                </Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'action.hover', 
                    borderRadius: 1, 
                    maxHeight: '400px', 
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {result.tailoredCV}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        )}

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={60} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              L'AI sta ottimizzando il tuo CV...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Questo potrebbe richiedere fino a 30 secondi
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading || saving}>
          {step === 1 ? t('cvTailoring.close') : t('cvTailoring.cancel')}
        </Button>

        {step === 0 && (
          <Button
            onClick={handleAnalyze}
            variant="contained"
            disabled={
              !selectedCvId || 
              (inputMode === 'text' ? !jobDescription : !jobUrl) || 
              loading
            }
            startIcon={<AutoAwesome />}
          >
            {t('cvTailoring.optimizeCVWithAI')}
          </Button>
        )}

        {step === 1 && result && (
          <>
            <Button
              onClick={handleCopy}
              variant="outlined"
              startIcon={<ContentCopy />}
              disabled={saving || cvAdded}
            >
              {t('cvTailoring.copyCV')}
            </Button>
            <Button
              onClick={handleAddToManager}
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <AddCircle />}
              disabled={saving || saved}
            >
              {saved ? t('cvTailoring.alreadySaved') : cvAdded ? '✅ CV Già Aggiunto' : saving ? t('common.saving') : t('cvTailoring.addToDocuments')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CVTailoringDialog;

