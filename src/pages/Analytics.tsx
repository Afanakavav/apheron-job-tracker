import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Schedule,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getUserApplications } from '../services/applicationService';
import {
  calculateAnalytics,
  getApplicationsByWeek,
  getApplicationsByPriority,
  getUpcomingInterviews,
  getApplicationsNeedingFollowUp,
} from '../services/analyticsService';
import StatusPieChart from '../components/StatusPieChart';
import TrendLineChart from '../components/TrendLineChart';
import SourceBarChart from '../components/SourceBarChart';
import type { Application } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const Analytics: React.FC = () => {
  const { currentUser } = useAuth();
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
  const trendData = getApplicationsByWeek(applications);
  const upcomingInterviews = getUpcomingInterviews(applications);
  const needFollowUp = getApplicationsNeedingFollowUp(applications);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Statistiche e insights sulle tue candidature
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Candidature Totali
              </Typography>
              <Typography variant="h4">{analytics.totalApplications}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Chip
                  label={`${analytics.thisWeekApplications} questa settimana`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Tasso Conversione
              </Typography>
              <Typography variant="h4">
                {analytics.conversionRate.appliedToInterview.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Candidature → Colloqui
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Offerte Ricevute
              </Typography>
              <Typography variant="h4" sx={{ color: 'success.main' }}>
                {analytics.applicationsByStatus.offer}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {analytics.conversionRate.interviewToOffer.toFixed(1)}% da colloqui
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Tempo Risposta Medio
              </Typography>
              <Typography variant="h4">
                {analytics.averageResponseTime.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                giorni
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <TrendLineChart data={trendData} />
        </Grid>
        <Grid item xs={12} md={6}>
          <StatusPieChart data={analytics.applicationsByStatus} />
        </Grid>
        <Grid item xs={12}>
          <SourceBarChart data={analytics.applicationsBySource} />
        </Grid>
      </Grid>

      {/* Action Items */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
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
                {upcomingInterviews.map((app, index) => (
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
                      <CheckCircle sx={{ color: 'success.main' }} />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">Follow-up Necessari</Typography>
            </Box>
            {needFollowUp.length === 0 ? (
              <Typography color="text.secondary">
                Nessun follow-up necessario
              </Typography>
            ) : (
              <List dense>
                {needFollowUp.slice(0, 5).map((app, index) => (
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
                      <Chip
                        label="Follow-up"
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Success Rate by Status */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Riepilogo Stati
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {analytics.applicationsByStatus.applied}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Candidate
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {analytics.applicationsByStatus.interview + analytics.applicationsByStatus.technical}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    In Colloquio
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ color: 'success.main' }}>
                    {analytics.applicationsByStatus.offer}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Offerte
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ color: 'error.main' }}>
                    {analytics.applicationsByStatus.rejected}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rifiutate
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="text.secondary">
                    {analytics.applicationsByStatus.saved}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Salvate
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;


