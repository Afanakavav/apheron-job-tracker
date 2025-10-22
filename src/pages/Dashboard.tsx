import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserApplications } from '../services/applicationService';
import {
  calculateAnalytics,
  getUpcomingInterviews,
  getApplicationsNeedingFollowUp,
} from '../services/analyticsService';
import {
  TrendingUp,
  CheckCircle,
  Schedule,
  Work,
  ArrowForward,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Application } from '../types';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const apps = await getUserApplications(currentUser.uid);
        setApplications(apps);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [currentUser]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const analytics = calculateAnalytics(applications);
  const upcomingInterviews = getUpcomingInterviews(applications);
  const needFollowUp = getApplicationsNeedingFollowUp(applications);
  const recentApplications = applications.slice(0, 5);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Benvenuto, {currentUser?.displayName || currentUser?.email}!
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
        {/* Statistics Cards */}
        <Box>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Work sx={{ mr: 1, color: 'primary.main' }} />
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Candidature Totali
                </Typography>
              </Box>
              <Typography variant="h4">{analytics.totalApplications}</Typography>
              <Chip
                label={`+${analytics.thisWeekApplications} questa settimana`}
                size="small"
                color="primary"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1, color: 'info.main' }} />
                <Typography color="text.secondary" gutterBottom variant="body2">
                  In Processo
                </Typography>
              </Box>
              <Typography variant="h4">
                {analytics.applicationsByStatus.applied +
                  analytics.applicationsByStatus.phone_screen +
                  analytics.applicationsByStatus.interview +
                  analytics.applicationsByStatus.technical}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Candidature attive
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Schedule sx={{ mr: 1, color: 'warning.main' }} />
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Colloqui
                </Typography>
              </Box>
              <Typography variant="h4">
                {analytics.applicationsByStatus.interview + analytics.applicationsByStatus.technical}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {upcomingInterviews.length} prossimi
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Offerte
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: 'success.main' }}>
                {analytics.applicationsByStatus.offer}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {analytics.conversionRate.interviewToOffer.toFixed(0)}% tasso conversione
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Recent Applications */}
      <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Candidature Recenti</Typography>
              <Button
                endIcon={<ArrowForward />}
                onClick={() => navigate('/applications')}
              >
                Vedi tutte
              </Button>
            </Box>
            {recentApplications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary" gutterBottom>
                  Nessuna candidatura ancora
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/applications')}
                  sx={{ mt: 2 }}
                >
                  Aggiungi Prima Candidatura
                </Button>
              </Box>
            ) : (
              <List dense>
                {recentApplications.map((app, index) => (
                  <React.Fragment key={app.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={`${app.jobTitle} - ${app.company}`}
                        secondary={
                          <>
                            {app.location && `${app.location} • `}
                            {app.createdAt &&
                              format(new Date(app.createdAt), 'dd MMM yyyy', { locale: it })}
                          </>
                        }
                      />
                      <Chip label={app.status} size="small" />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Box>

      {/* Upcoming Interviews & Follow-ups */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 3 }}>
        <Box>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Prossimi Colloqui</Typography>
            </Box>
            {upcomingInterviews.length === 0 ? (
              <Typography color="text.secondary">
                Nessun colloquio programmato
              </Typography>
            ) : (
              <List dense>
                {upcomingInterviews.slice(0, 3).map((app, index) => (
                  <React.Fragment key={app.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={`${app.jobTitle} - ${app.company}`}
                        secondary={
                          app.interviewDate
                            ? format(new Date(app.interviewDate), 'dd MMM yyyy HH:mm', { locale: it })
                            : 'Data da definire'
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Box>

        <Box>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">Follow-up Necessari</Typography>
            </Box>
            {needFollowUp.length === 0 ? (
              <Typography color="text.secondary">
                Nessun follow-up necessario al momento
              </Typography>
            ) : (
              <List dense>
                {needFollowUp.slice(0, 3).map((app, index) => (
                  <React.Fragment key={app.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={`${app.jobTitle} - ${app.company}`}
                        secondary={
                          app.appliedDate
                            ? `Candidata il ${format(new Date(app.appliedDate), 'dd MMM yyyy', { locale: it })}`
                            : 'Data non disponibile'
                        }
                      />
                      <Chip label="Urgente" size="small" color="warning" />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;

