import React, { useState, useEffect } from 'react';
import { Box, Dialog, DialogContent, DialogActions, Button, Typography, Stepper, Step, StepLabel, Paper } from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate, useLocation } from 'react-router-dom';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector
  action?: () => void;
}

interface OnboardingTourProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ open, onComplete, onSkip }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const steps: TourStep[] = [
    {
      id: 'welcome',
      title: t('onboarding.welcome.title') || 'Benvenuto in Apheron Job Tracker!',
      description: t('onboarding.welcome.description') || 'Ti guideremo attraverso le funzionalità principali dell\'app per aiutarti a gestire al meglio la tua ricerca di lavoro.',
    },
    {
      id: 'dashboard',
      title: t('onboarding.dashboard.title') || 'Dashboard',
      description: t('onboarding.dashboard.description') || 'La dashboard ti mostra una panoramica completa: statistiche, prossimi colloqui e candidature che richiedono attenzione.',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'applications',
      title: t('onboarding.applications.title') || 'Gestione Candidature',
      description: t('onboarding.applications.description') || 'Usa la Kanban board per organizzare le tue candidature. Trascina le card tra le colonne per aggiornare lo stato.',
      action: () => navigate('/applications'),
    },
    {
      id: 'job-search',
      title: t('onboarding.jobSearch.title') || 'Ricerca Lavoro',
      description: t('onboarding.jobSearch.description') || 'Cerca posizioni lavorative, salva annunci interessanti e crea alert per ricevere notifiche su nuove opportunità.',
      action: () => navigate('/job-search'),
    },
    {
      id: 'networking',
      title: t('onboarding.networking.title') || 'Networking',
      description: t('onboarding.networking.description') || 'Mantieni traccia dei tuoi contatti professionali. Aggiungi note, imposta follow-up automatici e importa contatti da LinkedIn.',
      action: () => navigate('/networking'),
    },
    {
      id: 'documents',
      title: t('onboarding.documents.title') || 'Documenti',
      description: t('onboarding.documents.description') || 'Carica e gestisci più versioni del tuo CV e Cover Letter. Usa il tailoring per adattare i documenti a posizioni specifiche.',
      action: () => navigate('/cv-manager'),
    },
    {
      id: 'analytics',
      title: t('onboarding.analytics.title') || 'Analytics',
      description: t('onboarding.analytics.description') || 'Visualizza statistiche dettagliate sulla tua ricerca di lavoro: tasso di risposta, conversioni, trend e molto altro.',
      action: () => navigate('/analytics'),
    },
    {
      id: 'ai-assistant',
      title: t('onboarding.aiAssistant.title') || 'Assistente AI',
      description: t('onboarding.aiAssistant.description') || 'Usa l\'AI per ottimizzare il tuo CV, generare cover letter personalizzate e ottenere consigli sulla tua ricerca di lavoro.',
      action: () => navigate('/ai-assistant'),
    },
    {
      id: 'gmail',
      title: t('onboarding.gmail.title') || 'Integrazione Gmail',
      description: t('onboarding.gmail.description') || 'Collega il tuo account Gmail per tracciare automaticamente le email inviate e ricevute relative alle tue candidature.',
      action: () => navigate('/gmail'),
    },
    {
      id: 'chrome-extension',
      title: t('onboarding.chromeExtension.title') || 'Chrome Extension',
      description: t('onboarding.chromeExtension.description') || 'Installa l\'estensione Chrome per salvare posizioni lavorative direttamente da LinkedIn, Indeed e Glassdoor con un click.',
    },
    {
      id: 'complete',
      title: t('onboarding.complete.title') || 'Pronto!',
      description: t('onboarding.complete.description') || 'Hai completato il tour! Inizia aggiungendo la tua prima candidatura. Ricorda: puoi sempre vedere questo tour dalle impostazioni.',
    },
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      const nextStep = steps[activeStep + 1];
      if (nextStep.action) {
        setTimeout(() => {
          nextStep.action?.();
        }, 300);
      }
      setActiveStep(activeStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
    // Navigate to dashboard after completing tutorial
    navigate('/dashboard');
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_skipped', 'true');
    onSkip();
  };

  const currentStep = steps[activeStep];

  return (
    <Dialog
      open={open}
      onClose={handleSkip}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 2 }}>
          {steps.map((step) => (
            <Step key={step.id}>
              <StepLabel />
            </Step>
          ))}
        </Stepper>

        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            {currentStep.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
            {currentStep.description}
          </Typography>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleSkip} color="inherit">
          {t('common.skip') || 'Salta'}
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} sx={{ mr: 1 }}>
            {t('common.back') || 'Indietro'}
          </Button>
        )}
        <Button onClick={handleNext} variant="contained">
          {activeStep === steps.length - 1
            ? (t('common.complete') || 'Completa')
            : (t('common.next') || 'Avanti')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Hook to check if onboarding should be shown
 */
export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    const skipped = localStorage.getItem('onboarding_skipped');
    
    // Show onboarding only on dashboard for new users
    if (!completed && !skipped && location.pathname === '/dashboard') {
      // Show after a short delay to ensure page is loaded
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return {
    showOnboarding,
    setShowOnboarding,
  };
};

