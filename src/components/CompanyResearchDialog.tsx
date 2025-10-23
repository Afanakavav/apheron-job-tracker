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
} from '@mui/material';
import {
  Business,
  Info,
  People,
  EmojiObjects,
  TipsAndUpdates,
  Category,
} from '@mui/icons-material';
import { researchCompany } from '../services/aiService';
import { GAEvents } from '../services/googleAnalytics';

interface CompanyResearchDialogProps {
  open: boolean;
  onClose: () => void;
  companyName: string;
  additionalContext?: string;
}

const CompanyResearchDialog: React.FC<CompanyResearchDialogProps> = ({
  open,
  onClose,
  companyName,
  additionalContext,
}) => {
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

  const handleResearch = async () => {
    if (!companyName) {
      setError('Nome azienda è obbligatorio');
      return;
    }

    try {
      setResearching(true);
      setError(null);
      console.log('Starting company research...');
      
      const result = await researchCompany(companyName, additionalContext);
      console.log('Research complete:', result);
      
      // Track analytics event
      GAEvents.researchCompany();
      
      setResearch(result);
    } catch (err: any) {
      console.error('Error researching company:', err);
      setError(err.message || 'Errore durante la ricerca AI');
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
            AI Company Research
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

        {researching && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Ricerca informazioni su {companyName}...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Analisi industry, cultura aziendale, e tips per interview
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
                  Cultura Aziendale
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
                  Fatti Chiave
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
                  Tips per il Colloquio
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
              💡 Queste informazioni sono generate da AI e potrebbero non essere completamente accurate. 
              Verifica sempre con fonti ufficiali.
            </Alert>
          </Box>
        )}

        {!researching && !research && !error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Business sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Ricerca informazioni su {companyName} per prepararti al meglio
            </Typography>
            <Button
              variant="contained"
              onClick={handleResearch}
              sx={{ mt: 2 }}
              startIcon={<Business />}
            >
              Avvia Ricerca AI
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {research && (
          <Button onClick={() => setResearch(null)} startIcon={<Business />}>
            Ricerca Nuova Azienda
          </Button>
        )}
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompanyResearchDialog;

