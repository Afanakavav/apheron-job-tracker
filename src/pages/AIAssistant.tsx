import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
} from '@mui/material';
import {
  Psychology,
  Description,
  Analytics,
  Business,
  Transform,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import CVMatcherDialog from '../components/CVMatcherDialog';
import CoverLetterGenerator from '../components/CoverLetterGenerator';
import JobAnalyzerDialog from '../components/JobAnalyzerDialog';
import CompanyResearchDialog from '../components/CompanyResearchDialog';
import CVTailoringDialog from '../components/CVTailoringDialog';
import EmailAIDialog from '../components/EmailAIDialog';

const AIAssistant: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  // Dialog states
  const [companyResearchOpen, setCompanyResearchOpen] = useState(false);
  const [jobAnalyzerOpen, setJobAnalyzerOpen] = useState(false);
  const [cvMatcherOpen, setCvMatcherOpen] = useState(false);
  const [cvTailoringOpen, setCvTailoringOpen] = useState(false);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [emailAIOpen, setEmailAIOpen] = useState(false);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('aiAssistant.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('aiAssistant.subtitle')}
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        💡 <strong>{t('aiAssistant.tip')}</strong>
      </Alert>

      {/* AI Features Grid */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        {t('aiAssistant.aiFeaturesAvailable')}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        
        {/* 1. Company Research */}
        <Paper elevation={1} sx={{ p: 3, '&:hover': { boxShadow: 4 }, transition: 'all 0.3s', bgcolor: '#f1f8f4' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Business sx={{ fontSize: 40, color: '#2e7d32' }} />
            <Typography variant="h6">{t('aiAssistant.companyResearch')}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('aiAssistant.companyResearchDesc')}
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Business />}
            onClick={() => setCompanyResearchOpen(true)}
            sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
          >
            {t('aiAssistant.buttonCompanyResearch')}
          </Button>
        </Paper>

        {/* 2. Job Analyzer */}
        <Paper elevation={1} sx={{ p: 3, '&:hover': { boxShadow: 4 }, transition: 'all 0.3s', bgcolor: '#e3f2fd' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Analytics sx={{ fontSize: 40, color: '#1976d2' }} />
            <Typography variant="h6">{t('aiAssistant.jobAnalyzer')}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('aiAssistant.jobAnalyzerDesc')}
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Analytics />}
            onClick={() => setJobAnalyzerOpen(true)}
            sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
          >
            {t('aiAssistant.buttonJobAnalyzer')}
          </Button>
        </Paper>

        {/* 3. CV Matcher */}
        <Paper elevation={1} sx={{ p: 3, '&:hover': { boxShadow: 4 }, transition: 'all 0.3s', bgcolor: '#f3e5f5' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Psychology sx={{ fontSize: 40, color: '#7b1fa2' }} />
            <Typography variant="h6">{t('aiAssistant.cvMatcher')}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('aiAssistant.cvMatcherDesc')}
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Psychology />}
            onClick={() => setCvMatcherOpen(true)}
            sx={{ bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' } }}
          >
            {t('aiAssistant.buttonCVMatcher')}
          </Button>
        </Paper>

        {/* 4. CV Tailoring */}
        <Paper elevation={1} sx={{ p: 3, '&:hover': { boxShadow: 4 }, transition: 'all 0.3s', bgcolor: '#fff3e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Transform sx={{ fontSize: 40, color: '#f57c00' }} />
            <Typography variant="h6">{t('aiAssistant.cvTailoring')}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('aiAssistant.cvTailoringDesc')}
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Transform />}
            onClick={() => setCvTailoringOpen(true)}
            disabled={!currentUser}
            sx={{ bgcolor: '#f57c00', '&:hover': { bgcolor: '#ef6c00' } }}
          >
            {t('aiAssistant.buttonCVTailoring')}
          </Button>
          {!currentUser && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('aiAssistant.requiresAuth')}
            </Typography>
          )}
        </Paper>

        {/* 5. Cover Letter Generator */}
        <Paper elevation={1} sx={{ p: 3, '&:hover': { boxShadow: 4 }, transition: 'all 0.3s', bgcolor: '#fce4ec' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Description sx={{ fontSize: 40, color: '#c2185b' }} />
            <Typography variant="h6">{t('aiAssistant.coverLetter')}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('aiAssistant.coverLetterGeneratorDesc')}
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Description />}
            onClick={() => setCoverLetterOpen(true)}
            sx={{ bgcolor: '#c2185b', '&:hover': { bgcolor: '#ad1457' } }}
          >
            {t('aiAssistant.buttonCoverLetterGenerator')}
          </Button>
        </Paper>

        {/* 6. Email AI */}
        <Paper elevation={1} sx={{ p: 3, '&:hover': { boxShadow: 4 }, transition: 'all 0.3s', bgcolor: '#e0f2f1' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EmailIcon sx={{ fontSize: 40, color: '#00897b' }} />
            <Typography variant="h6">{t('emailDialog.title')}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('aiAssistant.emailGeneratorDesc')}
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<EmailIcon />}
            onClick={() => setEmailAIOpen(true)}
            disabled={!currentUser}
            sx={{ bgcolor: '#00897b', '&:hover': { bgcolor: '#00796b' } }}
          >
            {t('aiAssistant.buttonEmailGenerator')}
          </Button>
          {!currentUser && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('aiAssistant.requiresAuth')}
            </Typography>
          )}
        </Paper>
      </Box>

      {/* AI Dialogs - No more data passing, each dialog has its own form */}
      <CompanyResearchDialog
        open={companyResearchOpen}
        onClose={() => setCompanyResearchOpen(false)}
      />

      <JobAnalyzerDialog
        open={jobAnalyzerOpen}
        onClose={() => setJobAnalyzerOpen(false)}
      />

      <CVMatcherDialog
        open={cvMatcherOpen}
        onClose={() => setCvMatcherOpen(false)}
      />

      {currentUser && (
        <CVTailoringDialog
          open={cvTailoringOpen}
          onClose={() => setCvTailoringOpen(false)}
          userId={currentUser.uid}
        />
      )}

      <CoverLetterGenerator
        open={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
      />

      {currentUser && (
        <EmailAIDialog
          open={emailAIOpen}
          onClose={() => setEmailAIOpen(false)}
          userId={currentUser.uid}
        />
      )}
    </Box>
  );
};

export default AIAssistant;
