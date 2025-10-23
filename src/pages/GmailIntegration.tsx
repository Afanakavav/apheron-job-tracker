import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Email as EmailIcon,
  Link as LinkIcon,
  LinkOff,
  Refresh,
  CheckCircle,
  Work,
  Close,
  Add,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import {
  requestAccessToken,
  isGmailConnected,
  disconnectGmail,
  fetchRecentEmails,
  getGmailUserEmail,
} from '../services/gmailServiceClient';
import {
  parseMultipleEmails,
} from '../services/emailParserService';
import type { JobOfferFromEmail } from '../services/gmailServiceClient';
import { createApplication } from '../services/applicationService';
import type { ApplicationFormData } from '../types';
import { GAEvents } from '../services/googleAnalytics';

const GmailIntegration: React.FC = () => {
  const { currentUser } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gmailEmail, setGmailEmail] = useState('');
  const [jobOffers, setJobOffers] = useState<JobOfferFromEmail[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobOfferFromEmail | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, [currentUser]);

  const checkConnection = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const isConnected = await isGmailConnected(currentUser.uid);
      setConnected(isConnected);

      if (isConnected) {
        const email = await getGmailUserEmail(currentUser.uid);
        setGmailEmail(email);
      }
    } catch (err: any) {
      console.error('Error checking connection:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!currentUser) return;

    try {
      setError(null);
      // Trigger OAuth flow (Google will handle the popup)
      await requestAccessToken(currentUser.uid);
      
      // Connection successful
      await checkConnection();
    } catch (err: any) {
      console.error('Error connecting Gmail:', err);
      setError('Errore durante la connessione a Gmail: ' + err.message);
    }
  };

  const handleDisconnect = async () => {
    if (!currentUser) return;
    
    if (!window.confirm('Sei sicuro di voler disconnettere Gmail?')) return;

    try {
      await disconnectGmail(currentUser.uid);
      setConnected(false);
      setGmailEmail('');
      setJobOffers([]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleScanEmails = async () => {
    if (!currentUser) return;

    try {
      setScanning(true);
      setError(null);
      setScanProgress({ current: 0, total: 0 });

      // Fetch recent emails
      const fetchedEmails = await fetchRecentEmails(currentUser.uid, 20);

      if (fetchedEmails.length === 0) {
        setError('Nessuna email trovata con parole chiave job-related negli ultimi 30 giorni.');
        return;
      }

      // Parse emails for job offers
      const offers = await parseMultipleEmails(fetchedEmails, (current, total) => {
        setScanProgress({ current, total });
      });

      setJobOffers(offers);

      if (offers.length === 0) {
        setError('Nessuna job offer trovata nelle email scansionate.');
      }
    } catch (err: any) {
      console.error('Error scanning emails:', err);
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleImportJob = (job: JobOfferFromEmail) => {
    setSelectedJob(job);
  };

  const handleConfirmImport = async () => {
    if (!currentUser || !selectedJob) return;

    try {
      setImporting(true);
      setError(null);

      const applicationData: ApplicationFormData = {
        company: selectedJob.company,
        jobTitle: selectedJob.jobTitle,
        location: selectedJob.location || '',
        isRemote: selectedJob.location?.toLowerCase().includes('remote') || false,
        jobUrl: selectedJob.jobUrl || '',
        jobDescription: selectedJob.jobDescription,
        salaryMin: undefined,
        salaryMax: undefined,
        salaryCurrency: 'EUR',
        source: 'email',
        status: 'saved',
        priority: 'medium',
        notes: `Imported from email: ${selectedJob.emailSubject}\nDate: ${selectedJob.emailDate.toLocaleDateString()}\nConfidence: ${selectedJob.confidence}%`,
        tags: ['email', 'imported'],
      };

      await createApplication(currentUser.uid, applicationData);

      // Track analytics
      GAEvents.createApplication('saved');

      // Remove from list
      setJobOffers(jobOffers.filter(j => j.emailId !== selectedJob.emailId));
      setSelectedJob(null);

      alert('Job offer importata con successo!');
    } catch (err: any) {
      console.error('Error importing job:', err);
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        📧 Gmail Integration
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Connetti il tuo account Gmail per scansionare automaticamente le email e trovare job offers.
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!connected ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <EmailIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Connetti Gmail
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Autorizza l'accesso al tuo Gmail per scansionare le email e trovare opportunità di lavoro.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<LinkIcon />}
                onClick={handleConnect}
                sx={{ mt: 2 }}
              >
                Connetti Gmail
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Connesso</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {gmailEmail}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={handleScanEmails}
                    disabled={scanning}
                  >
                    Scansiona Email
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<LinkOff />}
                    onClick={handleDisconnect}
                  >
                    Disconnetti
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {scanning && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="body2" gutterBottom>
                  Scansionamento in corso... {scanProgress.current}/{scanProgress.total} email analizzate
                </Typography>
                <LinearProgress variant="determinate" value={(scanProgress.current / scanProgress.total) * 100} />
              </CardContent>
            </Card>
          )}

          {jobOffers.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Job Offers Trovate ({jobOffers.length})
                </Typography>
                <List>
                  {jobOffers.map((job) => (
                    <ListItem
                      key={job.emailId}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                      }}
                      secondaryAction={
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Add />}
                          onClick={() => handleImportJob(job)}
                        >
                          Importa
                        </Button>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <Work />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">{job.jobTitle}</Typography>
                            <Chip label={`${job.confidence}%`} size="small" color="primary" />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {job.company} {job.location && `• ${job.location}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {job.emailDate.toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Import Dialog */}
      <Dialog open={Boolean(selectedJob)} onClose={() => setSelectedJob(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Importa Job Offer
          <IconButton
            onClick={() => setSelectedJob(null)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedJob.jobTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Azienda:</strong> {selectedJob.company}
              </Typography>
              {selectedJob.location && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Location:</strong> {selectedJob.location}
                </Typography>
              )}
              {selectedJob.salary && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Salary:</strong> {selectedJob.salary}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Descrizione:</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                {selectedJob.jobDescription}
              </Typography>
              <Chip label={`Confidence: ${selectedJob.confidence}%`} size="small" color="primary" />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedJob(null)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={handleConfirmImport}
            disabled={importing}
            startIcon={importing ? <CircularProgress size={20} /> : <Add />}
          >
            Importa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GmailIntegration;

