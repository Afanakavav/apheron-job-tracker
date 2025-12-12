import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  OpenInNew as OpenInNewIcon,
  LocationOn as LocationOnIcon,
  AttachMoney as AttachMoneyIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import {
  searchJobs,
  saveJobPosting,
  getSavedJobPostings,
  deleteSavedJobPosting,
  calculateMatchScore,
  createJobAlert,
  getJobAlerts,
  updateJobAlert,
  deleteJobAlert,
} from '../services/jobSearchService';
import { scheduleJobAlertChecks } from '../services/jobAlertNotificationService';
import type { JobPosting, JobSearchPreferences, JobAlert } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const JobSearch: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [searchResults, setSearchResults] = useState<JobPosting[]>([]);
  const [savedJobs, setSavedJobs] = useState<JobPosting[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState<Partial<JobAlert>>({
    name: '',
    preferences: {
      keywords: [],
      alertEnabled: true,
      alertFrequency: 'daily',
    },
    enabled: true,
  });

  useEffect(() => {
    if (currentUser) {
      loadSavedJobs();
      loadAlerts();
      
      // Schedule automatic alert checks
      const cleanup = scheduleJobAlertChecks(currentUser.uid);
      return cleanup;
    }
  }, [currentUser]);

  const loadSavedJobs = async () => {
    if (!currentUser) return;
    try {
      const jobs = await getSavedJobPostings(currentUser.uid);
      setSavedJobs(jobs);
    } catch (error) {
      console.error('Error loading saved jobs:', error);
    }
  };

  const loadAlerts = async () => {
    if (!currentUser) return;
    try {
      const alertsList = await getJobAlerts(currentUser.uid);
      setAlerts(alertsList);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const handleSearch = async () => {
    if (!currentUser || !searchQuery.trim()) return;

    setLoading(true);
    try {
      const preferences: JobSearchPreferences = {
        keywords: searchQuery.split(',').map(k => k.trim()),
        location: location || undefined,
        isRemote: isRemote || undefined,
      };

      const results = await searchJobs(preferences, 50);
      
      // Calculate match scores
      const scoredResults = results.map(job => ({
        ...job,
        matchScore: calculateMatchScore(job, preferences),
      }));

      setSearchResults(scoredResults);
    } catch (error) {
      console.error('Error searching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async (job: JobPosting) => {
    if (!currentUser) return;

    try {
      await saveJobPosting(currentUser.uid, job);
      await loadSavedJobs();
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleDeleteSavedJob = async (jobId: string) => {
    if (!currentUser) return;

    try {
      await deleteSavedJobPosting(currentUser.uid, jobId);
      await loadSavedJobs();
    } catch (error) {
      console.error('Error deleting saved job:', error);
    }
  };

  const handleCreateAlert = async () => {
    if (!currentUser || !newAlert.name || !newAlert.preferences?.keywords?.length) return;

    try {
      const keywords = searchQuery.split(',').map(k => k.trim()).filter(k => k);
      const alertPreferences: JobSearchPreferences = {
        keywords: keywords.length > 0 ? keywords : (newAlert.preferences?.keywords || []),
        location: location || undefined,
        isRemote: isRemote || undefined,
        alertEnabled: newAlert.preferences?.alertEnabled ?? true,
        alertFrequency: newAlert.preferences?.alertFrequency || 'daily',
      };
      
      await createJobAlert(currentUser.uid, {
        name: newAlert.name || '',
        preferences: alertPreferences,
        enabled: newAlert.enabled ?? true,
      });

      setAlertDialogOpen(false);
      setNewAlert({
        name: '',
        preferences: {
          keywords: [],
          alertEnabled: true,
          alertFrequency: 'daily',
        },
        enabled: true,
      });
      await loadAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  const handleToggleAlert = async (alertId: string, enabled: boolean) => {
    if (!currentUser) return;

    try {
      await updateJobAlert(currentUser.uid, alertId, { enabled });
      await loadAlerts();
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!currentUser) return;

    try {
      await deleteJobAlert(currentUser.uid, alertId);
      await loadAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const isJobSaved = (jobId: string) => {
    return savedJobs.some(job => job.id === jobId || (job.title === searchResults.find(r => r.id === jobId)?.title && job.company === searchResults.find(r => r.id === jobId)?.company));
  };

  const renderJobCard = (job: JobPosting, isSaved: boolean) => (
    <Card key={job.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {job.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              {job.company}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {job.matchScore !== undefined && (
              <Chip
                label={`${job.matchScore}% match`}
                color={job.matchScore >= 70 ? 'success' : job.matchScore >= 50 ? 'warning' : 'default'}
                size="small"
              />
            )}
            <Chip
              label={job.source}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {job.location && (
            <Chip
              icon={<LocationOnIcon />}
              label={job.location}
              size="small"
              variant="outlined"
            />
          )}
          {job.isRemote && (
            <Chip
              label="Remote"
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
          {job.salary && (
            <Chip
              icon={<AttachMoneyIcon />}
              label={`${job.salary.min ? `${job.salary.min}-` : ''}${job.salary.max || ''} ${job.salary.currency || 'EUR'}/${job.salary.period || 'year'}`}
              size="small"
              variant="outlined"
            />
          )}
          {job.employmentType && (
            <Chip
              label={job.employmentType}
              size="small"
              variant="outlined"
            />
          )}
          {job.postedDate && (
            <Chip
              icon={<ScheduleIcon />}
              label={format(job.postedDate, 'dd MMM yyyy', { locale: it })}
              size="small"
              variant="outlined"
            />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {job.description.substring(0, 200)}...
        </Typography>

        {job.requirements && job.requirements.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" fontWeight="bold">Requisiti:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {job.requirements.slice(0, 5).map((req, idx) => (
                <Chip key={idx} label={req} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
      <CardActions>
        <Button
          size="small"
          startIcon={<OpenInNewIcon />}
          href={job.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('jobSearch.viewJob') || 'Vedi posizione'}
        </Button>
        {!isSaved ? (
          <Button
            size="small"
            startIcon={<BookmarkBorderIcon />}
            onClick={() => handleSaveJob(job)}
          >
            {t('jobSearch.save') || 'Salva'}
          </Button>
        ) : (
          <Button
            size="small"
            startIcon={<BookmarkIcon />}
            color="primary"
            disabled
          >
            {t('jobSearch.saved') || 'Salvato'}
          </Button>
        )}
      </CardActions>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('jobSearch.title') || 'Ricerca Lavoro'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('jobSearch.subtitle') || 'Cerca posizioni su LinkedIn, Indeed, Glassdoor e salva le migliori'}
      </Typography>

      {/* Search Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1.5fr 1fr 1.5fr' }, gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              label={t('jobSearch.keywords') || 'Parole chiave (separate da virgola)'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="es: React, TypeScript, Frontend"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <TextField
              fullWidth
              label={t('jobSearch.location') || 'Località'}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="es: Milano, Roma"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isRemote}
                  onChange={(e) => setIsRemote(e.target.checked)}
                />
              }
              label={t('jobSearch.remoteOnly') || 'Solo remote'}
            />
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              sx={{ height: '56px' }}
            >
              {loading ? <CircularProgress size={24} /> : (t('jobSearch.search') || 'Cerca')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={t('jobSearch.searchResults') || 'Risultati'} />
          <Tab label={`${t('jobSearch.savedJobs') || 'Posizioni salvate'} (${savedJobs.length})`} />
          <Tab label={`${t('jobSearch.alerts') || 'Alert'} (${alerts.length})`} />
        </Tabs>
      </Box>

      {/* Search Results Tab */}
      {tabValue === 0 && (
        <Box>
          {searchResults.length === 0 && !loading && (
            <Alert severity="info">
              {t('jobSearch.noResults') || 'Inserisci una ricerca per iniziare. I risultati verranno mostrati qui.'}
            </Alert>
          )}
          {searchResults.map(job => renderJobCard(job, isJobSaved(job.id)))}
        </Box>
      )}

      {/* Saved Jobs Tab */}
      {tabValue === 1 && (
        <Box>
          {savedJobs.length === 0 ? (
            <Alert severity="info">
              {t('jobSearch.noSavedJobs') || 'Nessuna posizione salvata. Salva le posizioni interessanti dalla ricerca.'}
            </Alert>
          ) : (
            savedJobs.map(job => (
              <Box key={job.id}>
                {renderJobCard(job, true)}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteSavedJob(job.id)}
                  >
                    {t('jobSearch.remove') || 'Rimuovi'}
                  </Button>
                </Box>
              </Box>
            ))
          )}
        </Box>
      )}

      {/* Alerts Tab */}
      {tabValue === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {t('jobSearch.jobAlerts') || 'Alert Lavoro'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={async () => {
                  if (currentUser) {
                    setLoading(true);
                    try {
                      const { checkAndNotifyJobAlerts } = await import('../services/jobAlertNotificationService');
                      await checkAndNotifyJobAlerts(currentUser.uid);
                      await loadAlerts();
                      alert(t('jobSearch.alertsChecked') || 'Alert verificati! Controlla le notifiche se ci sono nuove posizioni.');
                    } catch (error) {
                      console.error('Error checking alerts:', error);
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                disabled={loading}
              >
                {t('jobSearch.checkNow') || 'Verifica Ora'}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAlertDialogOpen(true)}
              >
                {t('jobSearch.createAlert') || 'Crea Alert'}
              </Button>
            </Box>
          </Box>

          {alerts.length === 0 ? (
            <Alert severity="info">
              {t('jobSearch.noAlerts') || 'Nessun alert configurato. Crea un alert per ricevere notifiche su nuove posizioni.'}
            </Alert>
          ) : (
            <List>
              {alerts.map((alert) => (
                <React.Fragment key={alert.id}>
                  <ListItem>
                    <ListItemText
                      primary={alert.name}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {t('jobSearch.keywords') || 'Parole chiave'}: {alert.preferences.keywords.join(', ')}
                          </Typography>
                          {alert.preferences.location && (
                            <Typography variant="body2">
                              {t('jobSearch.location') || 'Località'}: {alert.preferences.location}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary">
                            {t('jobSearch.frequency') || 'Frequenza'}: {alert.preferences.alertFrequency || 'daily'}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Switch
                          checked={alert.enabled}
                          onChange={(e) => handleToggleAlert(alert.id, e.target.checked)}
                        />
                        <IconButton
                          edge="end"
                          onClick={() => handleDeleteAlert(alert.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* Create Alert Dialog */}
      <Dialog open={alertDialogOpen} onClose={() => setAlertDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('jobSearch.createAlert') || 'Crea Alert'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('jobSearch.alertName') || 'Nome alert'}
            value={newAlert.name}
            onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label={t('jobSearch.keywords') || 'Parole chiave (separate da virgola)'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="es: React, TypeScript"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label={t('jobSearch.location') || 'Località'}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('jobSearch.frequency') || 'Frequenza'}</InputLabel>
            <Select
              value={newAlert.preferences?.alertFrequency || 'daily'}
              onChange={(e) =>
                setNewAlert({
                  ...newAlert,
                  preferences: {
                    keywords: newAlert.preferences?.keywords || [],
                    alertEnabled: newAlert.preferences?.alertEnabled ?? true,
                    alertFrequency: e.target.value as 'daily' | 'weekly' | 'realtime',
                  },
                })
              }
            >
              <MenuItem value="daily">{t('jobSearch.daily') || 'Giornaliero'}</MenuItem>
              <MenuItem value="weekly">{t('jobSearch.weekly') || 'Settimanale'}</MenuItem>
              <MenuItem value="realtime">{t('jobSearch.realtime') || 'In tempo reale'}</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={newAlert.enabled ?? true}
                onChange={(e) => setNewAlert({ ...newAlert, enabled: e.target.checked })}
              />
            }
            label={t('jobSearch.enabled') || 'Abilitato'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialogOpen(false)}>
            {t('common.cancel') || 'Annulla'}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAlert}
            disabled={!newAlert.name || !searchQuery.trim()}
          >
            {t('common.create') || 'Crea'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobSearch;

