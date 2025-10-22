import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  Alert,
} from '@mui/material';
import {
  Psychology,
  AutoAwesome,
  Analytics,
  Business,
} from '@mui/icons-material';
import CVMatcherDialog from '../components/CVMatcherDialog';
import CoverLetterGenerator from '../components/CoverLetterGenerator';
import JobAnalyzerDialog from '../components/JobAnalyzerDialog';
import CompanyResearchDialog from '../components/CompanyResearchDialog';

const AIAssistant: React.FC = () => {
  // Sample data for testing
  const [cvText, setCvText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Dialog states
  const [cvMatcherOpen, setCvMatcherOpen] = useState(false);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [jobAnalyzerOpen, setJobAnalyzerOpen] = useState(false);
  const [companyResearchOpen, setCompanyResearchOpen] = useState(false);

  const hasRequiredDataForMatcher = cvText && jobDescription;
  const hasRequiredDataForCoverLetter = cvText && jobDescription && companyName && jobTitle;
  const hasRequiredDataForJobAnalyzer = jobDescription;
  const hasRequiredDataForCompanyResearch = companyName;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          AI Assistant 🤖
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Testa le funzionalità AI per ottimizzare la tua ricerca di lavoro
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        💡 <strong>Tip:</strong> Puoi testare le AI features qui, oppure usarle direttamente dalle candidature nel Kanban board!
      </Alert>

      {/* Input Fields */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Dati di Test
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Testo del tuo CV"
            multiline
            rows={4}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Incolla qui il contenuto del tuo CV..."
            helperText="Usato per CV Matcher e Cover Letter Generator"
          />

          <TextField
            fullWidth
            label="Job Description"
            multiline
            rows={4}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Incolla qui la job description..."
            helperText="Usato per tutte le AI features"
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
              fullWidth
              label="Nome Azienda"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="es: Google"
            />

            <TextField
              fullWidth
              label="Job Title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="es: Senior Software Engineer"
            />
          </Box>
        </Box>
      </Paper>

      {/* AI Features Grid */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Funzionalità AI Disponibili
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* CV Matcher */}
        <Paper elevation={1} sx={{ p: 3, '&:hover': { boxShadow: 4 }, transition: 'all 0.3s' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Psychology color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h6">CV Matcher</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Analizza quanto il tuo CV matcha con la job description. Ricevi un punteggio, punti di forza, gap e raccomandazioni.
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Psychology />}
            onClick={() => setCvMatcherOpen(true)}
            disabled={!hasRequiredDataForMatcher}
          >
            Analizza Match
          </Button>
          {!hasRequiredDataForMatcher && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              Richiede: CV + Job Description
            </Typography>
          )}
        </Paper>

        {/* Cover Letter Generator */}
        <Paper elevation={1} sx={{ p: 3, '&:hover': { boxShadow: 4 }, transition: 'all 0.3s' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AutoAwesome color="secondary" sx={{ fontSize: 40 }} />
            <Typography variant="h6">Cover Letter</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Genera automaticamente una cover letter personalizzata e professionale basata sul tuo CV e sulla posizione.
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<AutoAwesome />}
            onClick={() => setCoverLetterOpen(true)}
            disabled={!hasRequiredDataForCoverLetter}
          >
            Genera Cover Letter
          </Button>
          {!hasRequiredDataForCoverLetter && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              Richiede: CV + Job Description + Azienda + Job Title
            </Typography>
          )}
        </Paper>

        {/* Job Analyzer */}
        <Paper elevation={1} sx={{ p: 3, '&:hover': { boxShadow: 4 }, transition: 'all 0.3s' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Analytics color="info" sx={{ fontSize: 40 }} />
            <Typography variant="h6">Job Analyzer</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Estrae automaticamente skills richieste, preferite, responsabilità, qualifiche e altre info chiave dalla job description.
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Analytics />}
            onClick={() => setJobAnalyzerOpen(true)}
            disabled={!hasRequiredDataForJobAnalyzer}
          >
            Analizza Job
          </Button>
          {!hasRequiredDataForJobAnalyzer && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              Richiede: Job Description
            </Typography>
          )}
        </Paper>

        {/* Company Research */}
        <Paper elevation={1} sx={{ p: 3, '&:hover': { boxShadow: 4 }, transition: 'all 0.3s' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Business color="success" sx={{ fontSize: 40 }} />
            <Typography variant="h6">Company Research</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Ricerca automatica informazioni sull'azienda: cultura, dimensioni, industry, key facts e tips per il colloquio.
          </Typography>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Business />}
            onClick={() => setCompanyResearchOpen(true)}
            disabled={!hasRequiredDataForCompanyResearch}
          >
            Ricerca Azienda
          </Button>
          {!hasRequiredDataForCompanyResearch && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              Richiede: Nome Azienda
            </Typography>
          )}
        </Paper>
      </Box>

      {/* AI Dialogs */}
      <CVMatcherDialog
        open={cvMatcherOpen}
        onClose={() => setCvMatcherOpen(false)}
        cvText={cvText}
        jobDescription={jobDescription}
        jobTitle={jobTitle}
      />

      <CoverLetterGenerator
        open={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
        cvText={cvText}
        jobDescription={jobDescription}
        companyName={companyName}
        jobTitle={jobTitle}
      />

      <JobAnalyzerDialog
        open={jobAnalyzerOpen}
        onClose={() => setJobAnalyzerOpen(false)}
        jobDescription={jobDescription}
      />

      <CompanyResearchDialog
        open={companyResearchOpen}
        onClose={() => setCompanyResearchOpen(false)}
        companyName={companyName}
      />
    </Box>
  );
};

export default AIAssistant;

