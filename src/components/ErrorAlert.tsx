import React from 'react';
import { Alert, AlertTitle, Box, Button, Typography } from '@mui/material';
import { ErrorOutline, Refresh, Home } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

interface ErrorAlertProps {
  error: Error | string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  severity?: 'error' | 'warning' | 'info';
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onRetry,
  showHomeButton = false,
  severity = 'error',
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorName = typeof error === 'string' ? 'Error' : error.name;

  // Map common errors to user-friendly messages
  const getErrorMessage = (message: string): { title: string; description: string; suggestion?: string } => {
    const lowerMessage = message.toLowerCase();

    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return {
        title: t('errors.network.title') || 'Errore di connessione',
        description: t('errors.network.description') || 'Impossibile connettersi al server. Verifica la tua connessione internet.',
        suggestion: t('errors.network.suggestion') || 'Controlla la connessione e riprova.',
      };
    }

    // Permission errors
    if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
      return {
        title: t('errors.permission.title') || 'Permessi insufficienti',
        description: t('errors.permission.description') || 'Non hai i permessi per eseguire questa azione.',
        suggestion: t('errors.permission.suggestion') || 'Assicurati di essere autenticato correttamente.',
      };
    }

    // Not found errors
    if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
      return {
        title: t('errors.notFound.title') || 'Risorsa non trovata',
        description: t('errors.notFound.description') || 'La risorsa richiesta non è stata trovata.',
        suggestion: t('errors.notFound.suggestion') || 'La risorsa potrebbe essere stata eliminata o spostata.',
      };
    }

    // Firestore errors
    if (lowerMessage.includes('firestore') || lowerMessage.includes('index')) {
      return {
        title: t('errors.index.title') || 'Indice mancante',
        description: t('errors.index.description') || 'L\'indice del database non è ancora pronto.',
        suggestion: t('errors.index.suggestion') || 'Attendi qualche istante e riprova. Se il problema persiste, contatta il supporto.',
      };
    }

    // Default
    return {
      title: errorName,
      description: errorMessage,
      suggestion: t('errors.default.suggestion') || 'Riprova tra qualche istante. Se il problema persiste, contatta il supporto.',
    };
  };

  const { title, description, suggestion } = getErrorMessage(errorMessage);

  return (
    <Alert
      severity={severity}
      icon={<ErrorOutline />}
      action={
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {onRetry && (
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              startIcon={<Refresh />}
            >
              {t('common.retry') || 'Riprova'}
            </Button>
          )}
          {showHomeButton && (
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/dashboard')}
              startIcon={<Home />}
            >
              {t('common.home') || 'Home'}
            </Button>
          )}
        </Box>
      }
      sx={{ mb: 2 }}
    >
      <AlertTitle>{title}</AlertTitle>
      <Typography variant="body2" sx={{ mb: suggestion ? 1 : 0 }}>
        {description}
      </Typography>
      {suggestion && (
        <Typography variant="caption" color="text.secondary">
          💡 {suggestion}
        </Typography>
      )}
    </Alert>
  );
};

