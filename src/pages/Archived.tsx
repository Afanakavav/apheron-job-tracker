import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Restore as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  Archive as ArchiveIcon,
  ArrowBack as BackIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import {
  getArchivedApplications,
  restoreApplication,
  deleteArchivedApplication,
} from '../services/applicationService';
import { getApplicationFolderName } from '../utils/documentFolders';
import { deleteSentEmailsByApplication } from '../services/sentEmailService';
import { getUserCVs, deleteCV } from '../services/cvService';
import ApplicationFormDialog from '../components/ApplicationFormDialog';
import type { Application } from '../types';

const Archived: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const fetchArchivedApplications = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const apps = await getArchivedApplications(currentUser.uid);
      setApplications(apps);
      setError(null);
    } catch (err) {
      console.error('Error fetching archived applications:', err);
      setError(t('archived.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedApplications();
  }, [currentUser]);

  const handleRestore = async (archivedId: string) => {
    if (!currentUser) return;
    if (!window.confirm('Ripristinare questa candidatura?')) return;

    try {
      await restoreApplication(archivedId, currentUser.uid);
      await fetchArchivedApplications();
    } catch (err) {
      console.error('Error restoring application:', err);
      setError('Errore nel ripristino della candidatura');
    }
  };

  const handleDeletePermanently = async (archivedId: string) => {
    if (!currentUser) return;
    
    // Get the archived application to find details
    const archivedApp = applications.find(app => app.id === archivedId);
    const applicationFolderName = archivedApp ? getApplicationFolderName(archivedApp) : '';
    
    // Show warning with details about what will be deleted
    const confirmMessage = `⚠️ ATTENZIONE: Questa azione eliminerà definitivamente la candidatura e tutti i dati correlati.\n\n` +
      `Verranno eliminati:\n` +
      `• La candidatura\n` +
      `• Tutte le email inviate per questa candidatura\n` +
      `• Tutti i documenti nella cartella "${applicationFolderName}" (se presente)\n\n` +
      `Questa azione è IRREVERSIBILE.\n\nContinuare?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const originalApplicationId = (archivedApp as any)?.originalApplicationId || archivedId;
      
      // Delete all sent emails related to this application
      let deletedEmailsCount = 0;
      try {
        console.log('🗑️ [Archived] Deleting emails for original application ID:', originalApplicationId);
        deletedEmailsCount = await deleteSentEmailsByApplication(originalApplicationId, currentUser.uid);
      } catch (emailErr) {
        console.error('Error deleting sent emails:', emailErr);
        // Continue even if email deletion fails
      }

      // Delete all documents in the application folder
      let deletedDocumentsCount = 0;
      if (applicationFolderName) {
        try {
          console.log('🗑️ [Archived] Deleting documents from folder:', applicationFolderName);
          const userCVs = await getUserCVs(currentUser.uid);
          const documentsInFolder = userCVs.filter(cv => cv.folder === applicationFolderName);
          
          for (const doc of documentsInFolder) {
            try {
              await deleteCV(doc);
              deletedDocumentsCount++;
              console.log('✅ [Archived] Deleted document:', doc.id);
            } catch (docErr) {
              console.error('Error deleting document:', docErr);
              // Continue even if one document fails
            }
          }
        } catch (docErr) {
          console.error('Error deleting documents from folder:', docErr);
          // Continue even if document deletion fails
        }
      }

      // Delete the archived application
      await deleteArchivedApplication(archivedId, currentUser.uid);
      await fetchArchivedApplications();

      // Show notification about deleted items
      let message = 'Candidatura eliminata definitivamente.';
      const deletedItems: string[] = [];
      if (deletedEmailsCount > 0) {
        deletedItems.push(`${deletedEmailsCount} email${deletedEmailsCount > 1 ? '' : ''}`);
      }
      if (deletedDocumentsCount > 0) {
        deletedItems.push(`${deletedDocumentsCount} documento${deletedDocumentsCount > 1 ? 'i' : ''}`);
      }
      if (deletedItems.length > 0) {
        message += `\nSono stati eliminati anche: ${deletedItems.join(', ')}.`;
      }
      alert(message);
    } catch (err) {
      console.error('Error deleting archived application:', err);
      setError('Errore nell\'eliminazione della candidatura');
    }
  };

  const handleViewInfo = (application: Application) => {
    setSelectedApplication(application);
    setInfoDialogOpen(true);
  };

  const handleCloseInfoDialog = () => {
    setInfoDialogOpen(false);
    setSelectedApplication(null);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ArchiveIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              {t('archived.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {applications.length} {t('archived.subtitle')}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate('/applications')}
        >
          {t('calendar.backToApplications')}
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
          <ArchiveIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {t('archived.noArchived')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('archived.archivedWillAppear')}
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>{t('archived.position')}</strong></TableCell>
                <TableCell><strong>{t('archived.company')}</strong></TableCell>
                <TableCell><strong>{t('archived.location')}</strong></TableCell>
                <TableCell><strong>{t('archived.archivedDate')}</strong></TableCell>
                <TableCell align="right"><strong>{t('archived.actions')}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id} hover>
                  <TableCell>{app.jobTitle}</TableCell>
                  <TableCell>{app.company}</TableCell>
                  <TableCell>
                    {app.location || '-'}
                    {app.isRemote && ' (Remote)'}
                  </TableCell>
                  <TableCell>
                    {(app as any).archivedAt 
                      ? format(new Date((app as any).archivedAt), 'dd/MM/yyyy HH:mm', { locale: it })
                      : format(new Date(app.updatedAt), 'dd/MM/yyyy', { locale: it })
                    }
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Info">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleViewInfo(app)}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('archived.restore')}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleRestore(app.id)}
                      >
                        <RestoreIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('archived.deletePermanently')}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeletePermanently(app.id)}
                      >
                        <DeleteForeverIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Info Dialog (Read-only) */}
      <ApplicationFormDialog
        open={infoDialogOpen}
        onClose={handleCloseInfoDialog}
        onSubmit={() => {}} // Not used in view-only mode
        application={selectedApplication}
        viewOnly={true}
      />
    </Box>
  );
};

export default Archived;

