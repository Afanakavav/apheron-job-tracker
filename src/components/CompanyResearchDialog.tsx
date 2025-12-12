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
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
  TextField,
} from '@mui/material';
import {
  Business,
  Info,
  People,
  EmojiObjects,
  TipsAndUpdates,
  Category,
  Search as SearchIcon,
} from '@mui/icons-material';
import { researchCompany } from '../services/aiService';
import { GAEvents } from '../services/googleAnalytics';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { uploadCVFile, createCV } from '../services/cvService';
import jsPDF from 'jspdf';
import { Description as DescriptionIcon } from '@mui/icons-material';
import i18n from '../i18n/i18n';

interface CompanyResearchDialogProps {
  open: boolean;
  onClose: () => void;
  prefilledCompany?: string;
  applicationCompany?: string; // Company name from application context (used to determine folder)
  applicationJobTitle?: string; // Job title from application context (used to determine folder)
}

const CompanyResearchDialog: React.FC<CompanyResearchDialogProps> = ({
  open,
  onClose,
  prefilledCompany,
  applicationCompany,
  applicationJobTitle,
}) => {
  const { currentUser } = useAuth();
  const { t, language } = useTranslation();
  // Internal form state
  const [companyName, setCompanyName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  // Prefill company name when prop changes
  useEffect(() => {
    if (prefilledCompany) {
      setCompanyName(prefilledCompany);
    }
  }, [prefilledCompany]);
  const [researching, setResearching] = useState(false);
  const [research, setResearch] = useState<{
    overview: string;
    industry: string;
    size: string;
    culture: string[];
    keyFacts: string[];
    interviewTips: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleResearch = async () => {
    if (!companyName) {
      setError(t('companyResearch.errorRequired'));
      return;
    }

    try {
      setResearching(true);
      setError(null);
      // Get current language directly from i18n to ensure it's up-to-date
      const currentLanguage = i18n.language || 'it';
      console.log('Starting company research...', { companyName, currentLanguage });
      
      const result = await researchCompany(companyName, additionalContext, currentLanguage);
      console.log('Research complete:', result);
      
      // Track analytics event
      GAEvents.researchCompany();
      
      setResearch(result);
    } catch (err: any) {
      console.error('Error researching company:', err);
      setError(err.message || t('companyResearch.error'));
    } finally {
      setResearching(false);
    }
  };

  // Auto-research when dialog opens
  useEffect(() => {
    if (open && !research && !researching && companyName) {
      handleResearch();
    }
  }, [open]);

  const handleSaveToDocuments = async () => {
    if (!currentUser || !research) return;

    try {
      setError(null);
      
      // Generate PDF content
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text(`Company Research - ${companyName}`, 14, 20);
      
      // Date
      doc.setFontSize(10);
      const dateLocale = language === 'en' ? 'en-US' : 'it-IT';
      const dateText = new Date().toLocaleDateString(dateLocale);
      doc.text(`${t('companyResearch.generatedOn')} ${dateText}`, 14, 30);
      
      let yPos = 40;
      
      // Overview
      doc.setFontSize(14);
      doc.text(`${t('companyResearch.overview')}:`, 14, yPos);
      yPos += 8;
      
      doc.setFontSize(11);
      const overviewLines = doc.splitTextToSize(research.overview, 175);
      doc.text(overviewLines, 14, yPos);
      yPos += overviewLines.length * 6 + 10;
      
      // Industry & Size
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.text(`${t('companyResearch.industry')}: ${research.industry}`, 14, yPos);
      yPos += 7;
      doc.text(`${t('companyResearch.size')}: ${research.size}`, 14, yPos);
      yPos += 10;
      
      // Culture
      if (research.culture.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text(`${t('companyResearch.companyCulture')}:`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        research.culture.forEach((item) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${item}`, 165);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        });
        yPos += 5;
      }
      
      // Key Facts
      if (research.keyFacts.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text(`${t('companyResearch.keyFacts')}:`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        research.keyFacts.forEach((fact) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${fact}`, 165);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        });
        yPos += 5;
      }
      
      // Interview Tips
      if (research.interviewTips.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(14);
        doc.text(`${t('companyResearch.interviewTips')}:`, 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        research.interviewTips.forEach((tip) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const lines = doc.splitTextToSize(`• ${tip}`, 165);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5 + 5;
        });
      }
      
      // Generate PDF blob
      const pdfBlob = doc.output('blob');
      
      // Create File from Blob
      const timestamp = Date.now();
      const fileName = `Company_Research_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;
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
      await createCV(currentUser.uid, {
        name: `Company Research - ${companyName}`,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.url,
        fileSize: pdfFile.size,
        tags: ['AI Analysis', 'Company Research', companyName].filter(Boolean),
        category: 'AI Analyzed',
        description: t('companyResearch.descriptionDocument', { 
          companyName 
        }),
        folder: documentFolder,
      });
      
      alert(t('companyResearch.successSaving'));
      GAEvents.uploadCV('pdf');
      setSaved(true);
    } catch (err: any) {
      console.error('Error saving PDF to documents:', err);
      setError(t('companyResearch.errorSaving', { error: err.message }));
    }
  };

  const getSizeColor = (size: string): string => {
    const lowerSize = size.toLowerCase();
    if (lowerSize.includes('startup')) return 'success';
    if (lowerSize.includes('small')) return 'info';
    if (lowerSize.includes('medium')) return 'warning';
    if (lowerSize.includes('large') || lowerSize.includes('enterprise')) return 'error';
    return 'default';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Business color="primary" />
          <Typography variant="h6">
            {t('companyResearch.title')}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {companyName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Input Form - Show when not researching and no results */}
        {!researching && !research && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              <Typography variant="body2">
                {t('companyResearch.infoMessage')}
              </Typography>
            </Alert>

            <TextField
              fullWidth
              required
              label={t('companyResearch.companyName')}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t('companyResearch.companyNamePlaceholder')}
              helperText={t('companyResearch.companyNameHelper')}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label={t('companyResearch.additionalContext')}
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder={t('companyResearch.additionalContextPlaceholder')}
              helperText={t('companyResearch.additionalContextHelper')}
            />
          </Box>
        )}

        {researching && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              {t('companyResearch.researching', { company: companyName })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('companyResearch.researchingSubtext')}
            </Typography>
          </Box>
        )}

        {!researching && research && (
          <Box>
            {/* Overview */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'primary.lighter' }}>
              <Typography variant="body1">
                {research.overview}
              </Typography>
            </Paper>

            {/* Key Info */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Chip
                icon={<Category />}
                label={research.industry}
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<People />}
                label={research.size}
                color={getSizeColor(research.size) as any}
                variant="outlined"
              />
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Culture */}
            {research.culture.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiObjects color="warning" />
                  {t('companyResearch.companyCulture')}
                </Typography>
                <List dense>
                  {research.culture.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <EmojiObjects color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Key Facts */}
            {research.keyFacts.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Info color="info" />
                  {t('companyResearch.keyFacts')}
                </Typography>
                <List dense>
                  {research.keyFacts.map((fact, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Info color="info" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={fact} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Interview Tips */}
            {research.interviewTips.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TipsAndUpdates color="success" />
                  {t('companyResearch.interviewTips')}
                </Typography>
                <List dense>
                  {research.interviewTips.map((tip, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <TipsAndUpdates color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={tip}
                        sx={{ 
                          '& .MuiListItemText-primary': { 
                            fontWeight: 500 
                          } 
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 3 }}>
              {t('companyResearch.disclaimer')}
            </Alert>
          </Box>
        )}

      </DialogContent>

      <DialogActions>
        {research && (
          <>
            <Button 
              onClick={() => {
                setResearch(null);
                setCompanyName('');
                setAdditionalContext('');
                setSaved(false);
              }} 
              startIcon={<SearchIcon />}
            >
              {t('companyResearch.newCompanyResearch')}
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveToDocuments}
              startIcon={<DescriptionIcon />}
              disabled={!currentUser || saved}
            >
              {saved ? t('companyResearch.alreadySaved') : t('companyResearch.saveToDocuments')}
            </Button>
          </>
        )}
        {!research && !researching && (
          <Button
            variant="contained"
            onClick={handleResearch}
            disabled={!companyName}
            startIcon={<SearchIcon />}
          >
            {t('companyResearch.searchCompany')}
          </Button>
        )}
        <Button onClick={onClose}>{t('companyResearch.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompanyResearchDialog;

