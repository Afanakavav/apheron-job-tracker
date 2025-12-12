import React, { useState, useEffect } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  MenuItem,
} from '@mui/material';
import {
  AutoAwesome,
  ContentCopy,
  Download,
  Refresh,
  Link as LinkIcon,
  TextFields as TextIcon,
} from '@mui/icons-material';
import { generateCoverLetter } from '../services/aiService';
import { GAEvents } from '../services/googleAnalytics';
import { useAuth } from '../contexts/AuthContext';
import { getUserCVs, uploadCVFile, createCV } from '../services/cvService';
import { extractTextFromCV, fetchJobDescriptionFromURL } from '../services/cvTailoringService';
import { generateWordFromText } from '../services/wordGenerationService';
import { useTranslation } from '../hooks/useTranslation';
import i18n from '../i18n/i18n';

interface CoverLetterGeneratorProps {
  open: boolean;
  onClose: () => void;
  onSave?: (coverLetter: string) => void;
  onSaveToApplication?: (coverLetterId: string) => void;
  prefilledCompany?: string;
  prefilledJobTitle?: string;
  prefilledJobDescription?: string;
  prefilledJobUrl?: string;
  prefilledCVId?: string;
  lockCVSelection?: boolean; // If true, CV field is disabled and cannot be changed
}

const CoverLetterGenerator: React.FC<CoverLetterGeneratorProps> = ({
  open,
  onClose,
  onSave,
  onSaveToApplication,
  prefilledCompany,
  prefilledJobTitle,
  prefilledJobDescription,
  prefilledJobUrl,
  prefilledCVId,
  lockCVSelection = false,
}) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  
  // Internal form state
  const [cvs, setCvs] = useState<any[]>([]);
  const [selectedCVId, setSelectedCVId] = useState('');
  const [jobDescriptionType, setJobDescriptionType] = useState<'url' | 'text'>('text');
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load CVs on mount
  useEffect(() => {
    if (currentUser && open) {
      loadCVs();
    }
  }, [currentUser, open]);

  // Pre-fill fields when dialog opens with prefilled data
  useEffect(() => {
    if (open) {
      if (prefilledCompany) setCompanyName(prefilledCompany);
      if (prefilledJobTitle) setJobTitle(prefilledJobTitle);
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
      if (prefilledCVId) setSelectedCVId(prefilledCVId);
    }
  }, [open, prefilledCompany, prefilledJobTitle, prefilledJobDescription, prefilledJobUrl, prefilledCVId]);

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

  const handleGenerate = async () => {
    if (!selectedCVId) {
      setError(t('coverLetterGenerator.errorSelectCV'));
      return;
    }
    
    if (jobDescriptionType === 'url' && !jobUrl) {
      setError(t('coverLetterGenerator.errorRequiredUrl'));
      return;
    }
    
    if (jobDescriptionType === 'text' && !jobDescription) {
      setError(t('coverLetterGenerator.errorRequiredText'));
      return;
    }
    
    if (!companyName || !jobTitle) {
      setError(t('coverLetterGenerator.errorRequiredFields'));
      return;
    }
    
    // Get CV content from selected CV
    const selectedCV = cvs.find(cv => cv.id === selectedCVId);
    if (!selectedCV) {
      setError(t('coverLetterGenerator.errorCVNotFound'));
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      console.log('Generating cover letter...');
      
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
          setError(t('coverLetterGenerator.errorFetchingUrl'));
          setGenerating(false);
          return;
        }
      }
      
      // Get current language directly from i18n to ensure it's up-to-date
      const currentLanguage = i18n.language || 'it';
      const result = await generateCoverLetter(
        cvContent,
        jobDescriptionText,
        companyName,
        jobTitle,
        additionalInfo || undefined,
        currentLanguage
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

  const handleSaveToCVManager = async () => {
    if (!currentUser || !coverLetter || !companyName || !jobTitle) {
      setError(t('coverLetterGenerator.errorMissingData'));
      return;
    }

    try {
      setSaving(true);
      setError(null);
      console.log('💾 [CoverLetter] Generating Word document...');

      // Generate Word document from cover letter
      const wordBlob = await generateWordFromText(
        coverLetter,
        companyName,
        jobTitle
      );

      // Convert Blob to File
      const fileName = `CoverLetter_${companyName}_${jobTitle}_${Date.now()}.docx`;
      const wordFile = new File([wordBlob], fileName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      console.log('📤 [CoverLetter] Uploading to Firebase Storage...');
      // Upload to Firebase Storage
      const { url, fileName: uploadedFileName } = await uploadCVFile(
        currentUser.uid,
        wordFile
      );

      console.log('✅ [CoverLetter] File uploaded, creating CV record...');
      // Determine folder: if saving to application, use application folder; otherwise use "Documenti AI"
      let documentFolder: string = 'Documenti AI';
      // For new applications (applicationId empty) or existing applications, check if we have jobTitle and company
      if (companyName && jobTitle) {
        // Save to application folder when opened from application context (even for new applications)
        documentFolder = `${companyName} - ${jobTitle}`;
      }
      
      // Get original CV name to extract base name for Cover Letter
      const selectedCV = cvs.find(cv => cv.id === selectedCVId);
      // Extract base name from CV and convert to Cover Letter format
      let baseName = 'Cover_Letter';
      if (selectedCV?.name) {
        // Replace "CV" with "Cover_Letter" while preserving underscores and other formatting
        // Handle both "CV" and "CV_" patterns
        baseName = selectedCV.name
          .replace(/^CV_/i, 'Cover_Letter_')
          .replace(/^CV\s/i, 'Cover_Letter ')
          .replace(/^CV$/i, 'Cover_Letter')
          .replace(/_CV_/g, '_Cover_Letter_')
          .replace(/\sCV\s/g, ' Cover_Letter ')
          .replace(/\sCV$/g, ' Cover_Letter')
          .trim() || 'Cover_Letter';
      }
      
      // Create document name in format: "nome_Cover_Letter - nome_azienda - nome_posizione"
      const coverLetterName = `${baseName} - ${companyName} - ${jobTitle}`;
      
      // Create CV record in Firestore with category "AI Generated"
      const tags = ['AI Generated', 'Cover Letter'];
      if (companyName) tags.push(companyName);
      if (jobTitle) tags.push(jobTitle);
      
      const coverLetterId = await createCV(currentUser.uid, {
        name: coverLetterName,
        fileName: uploadedFileName,
        fileUrl: url,
        fileSize: wordFile.size,
        tags: tags.filter(Boolean),
        category: 'AI Generated',
        description: t('coverLetterGenerator.descriptionDocument', { 
          jobTitle, 
          companyName 
        }),
        folder: documentFolder,
      });

      console.log('🎉 [CoverLetter] Successfully saved to Documenti! ID:', coverLetterId);
      
      // Track analytics
      GAEvents.generateCoverLetter();
      
      // If saving to application, call the callback
      if (onSaveToApplication) {
        console.log('💾 [CoverLetter] Saving to application...');
        onSaveToApplication(coverLetterId);
      } else {
        alert(t('coverLetterGenerator.successSaving'));
        onClose();
      }
    } catch (err: any) {
      console.error('❌ [CoverLetter] Error saving to Documenti:', err);
      setError(`Errore nel salvataggio: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome color="primary" />
          <Typography variant="h6">
            {t('aiAssistant.dialogTitleCoverLetterGenerator')}
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

        {/* Input Form */}
        {!coverLetter && !generating && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <Alert severity="info">
              <Typography variant="body2">
                💡 {t('aiAssistant.coverLetterTip')}
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
                helperText={lockCVSelection ? t('coverLetterGenerator.cvAutoSelected') : t('coverLetterGenerator.aiWillGenerate')}
              >
                <MenuItem value="">
                  <em>{t('coverLetterGenerator.selectCV')}</em>
                </MenuItem>
                {cvs.map((cv) => (
                  <MenuItem key={cv.id} value={cv.id}>
                    {cv.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Alert severity="warning">
                {t('coverLetterGenerator.noCVFound')}
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
                  URL
                </ToggleButton>
                <ToggleButton value="text">
                  <TextIcon sx={{ mr: 1 }} fontSize="small" />
                  {t('coverLetterGenerator.text')}
                </ToggleButton>
              </ToggleButtonGroup>

              {jobDescriptionType === 'url' ? (
                <TextField
                  fullWidth
                  required
                  label={t('coverLetterGenerator.urlJobDescription')}
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://..."
                  helperText={t('coverLetterGenerator.urlJobDescriptionHelper')}
                />
              ) : (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  required
                  label={t('coverLetterGenerator.jobDescription')}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder={t('coverLetterGenerator.jobDescriptionPlaceholder')}
                  helperText={t('coverLetterGenerator.jobDescriptionHelper')}
                />
              )}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                fullWidth
                required
                label={t('coverLetterGenerator.companyName')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t('coverLetterGenerator.companyNamePlaceholder')}
              />

              <TextField
                fullWidth
                required
                label={t('coverLetterGenerator.jobTitle')}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t('coverLetterGenerator.jobTitlePlaceholder')}
              />
            </Box>

            <TextField
              fullWidth
              multiline
              rows={2}
              label={t('coverLetterGenerator.additionalInfo')}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder={t('coverLetterGenerator.additionalInfoPlaceholder')}
              helperText={t('coverLetterGenerator.additionalInfoHelper')}
            />
          </Box>
        )}

        {/* Generating State */}
        {generating && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              {t('coverLetterGenerator.generatingCoverLetter')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('coverLetterGenerator.mayTakeSeconds')}
            </Typography>
          </Box>
        )}

        {/* Generated Cover Letter */}
        {!generating && coverLetter && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {t('coverLetterGenerator.coverLetterGenerated')}
              </Typography>
              <Box>
                <Tooltip title={copied ? t('coverLetterGenerator.copied') : t('coverLetterGenerator.copy')}>
                  <IconButton size="small" onClick={handleCopy}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('coverLetterGenerator.download')}>
                  <IconButton size="small" onClick={handleDownload}>
                    <Download fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('coverLetterGenerator.regenerate')}>
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
              💡 {t('coverLetterGenerator.editBeforeSave')}
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {coverLetter ? t('coverLetterGenerator.close') : t('coverLetterGenerator.cancel')}
        </Button>
        {coverLetter && (
          <Button 
            onClick={() => {
              setCoverLetter('');
              if (!lockCVSelection) {
                setSelectedCVId('');
              }
              setJobDescriptionType('text');
              setJobUrl('');
              setJobDescription('');
              setCompanyName('');
              setJobTitle('');
              setAdditionalInfo('');
            }}
            startIcon={<Refresh />}
          >
            {t('coverLetterGenerator.regenerate')}
          </Button>
        )}
        {!coverLetter && !generating && (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={!selectedCVId || (jobDescriptionType === 'url' ? !jobUrl : !jobDescription) || !companyName || !jobTitle}
            startIcon={<AutoAwesome />}
          >
            {t('aiAssistant.buttonGenerateCoverLetter')}
          </Button>
        )}
        {coverLetter && onSave && (
          <Button onClick={handleSave} variant="contained" color="primary">
            {t('coverLetterGenerator.saveToApplication')}
          </Button>
        )}
        {coverLetter && (
          <Button
            onClick={handleSaveToCVManager}
            variant="contained"
            color="success"
            disabled={saving || generating}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Download />}
          >
            {saving ? t('coverLetterGenerator.saving') : t('coverLetterGenerator.saveToDocuments')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CoverLetterGenerator;

