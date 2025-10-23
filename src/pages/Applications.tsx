import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Fab,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import KanbanBoard from '../components/KanbanBoard';
import ApplicationFormDialog from '../components/ApplicationFormDialog';
import {
  getUserApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../services/applicationService';
import { GAEvents } from '../services/googleAnalytics';
import type { Application, ApplicationFormData } from '../types';

const Applications: React.FC = () => {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const fetchApplications = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const apps = await getUserApplications(currentUser.uid);
      setApplications(apps);
      setError(null);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Errore nel caricamento delle candidature');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [currentUser]);

  const handleCreateApplication = async (formData: ApplicationFormData) => {
    if (!currentUser) return;

    try {
      await createApplication(currentUser.uid, formData);
      await fetchApplications();
      setDialogOpen(false);
    } catch (err) {
      console.error('Error creating application:', err);
      setError('Errore nella creazione della candidatura');
    }
  };

  const handleUpdateApplication = async (formData: ApplicationFormData) => {
    if (!selectedApplication) return;

    try {
      await updateApplication(selectedApplication.id, formData);
      await fetchApplications();
      setDialogOpen(false);
      setSelectedApplication(null);
    } catch (err) {
      console.error('Error updating application:', err);
      setError('Errore nell\'aggiornamento della candidatura');
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa candidatura?')) return;

    try {
      await deleteApplication(applicationId);
      
      // Track analytics event
      GAEvents.deleteApplication();
      
      await fetchApplications();
    } catch (err) {
      console.error('Error deleting application:', err);
      setError('Errore nell\'eliminazione della candidatura');
    }
  };

  const handleEdit = (application: Application) => {
    setSelectedApplication(application);
    setDialogOpen(true);
  };

  const handleViewDetails = (application: Application) => {
    // TODO: Implementare modal dettagli
    console.log('View details:', application);
  };

  const handleOpenDialog = () => {
    setSelectedApplication(null);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Candidature
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {applications.length} candidature totali
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          Nuova Candidatura
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {applications.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: 'background.paper',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Nessuna candidatura ancora
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Inizia ad aggiungere le tue candidature per tracciare il progresso
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
            Aggiungi Prima Candidatura
          </Button>
        </Box>
      ) : (
        <KanbanBoard
          applications={applications}
          onEdit={handleEdit}
          onDelete={handleDeleteApplication}
          onViewDetails={handleViewDetails}
          onRefresh={fetchApplications}
        />
      )}

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleOpenDialog}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
        }}
      >
        <AddIcon />
      </Fab>

      <ApplicationFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedApplication(null);
        }}
        onSubmit={selectedApplication ? handleUpdateApplication : handleCreateApplication}
        application={selectedApplication}
      />
    </Box>
  );
};

export default Applications;


