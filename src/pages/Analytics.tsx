import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  LinearProgress,
  Button,
  ButtonGroup,
} from '@mui/material';
import { AnalyticsSkeleton } from '../components/skeletons';
import {
  TrendingUp,
  Schedule,
  CheckCircle,
  Lightbulb,
  Download,
  CompareArrows,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { useApplications } from '../hooks/useApplications';
import {
  calculateAnalytics,
  getApplicationsByWeek,
  getUpcomingInterviews,
  getApplicationsNeedingFollowUp,
  calculateInsights,
  compareMonths,
} from '../services/analyticsService';
// Lazy load chart components for better initial load performance
const StatusPieChart = React.lazy(() => import('../components/StatusPieChart'));
const TrendLineChart = React.lazy(() => import('../components/TrendLineChart'));
const SourceBarChart = React.lazy(() => import('../components/SourceBarChart'));
import { useProgressiveLoad } from '../hooks/useProgressiveLoad';
import type { ApplicationStatus } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Use the custom hook for applications data
  const { applications, loading } = useApplications(currentUser?.uid);
  
  const [monthlyGoal, setMonthlyGoal] = useState(20);
  
  // Progressive loading for charts (load when they enter viewport)
  const chartsRef = useProgressiveLoad<HTMLDivElement>({ 
    threshold: 0.1,
    rootMargin: '100px' // Start loading 100px before charts enter viewport
  });

  // Load monthly goal from localStorage
  useEffect(() => {
    if (currentUser) {
      const savedGoal = localStorage.getItem(`monthly_goal_${currentUser.uid}`);
      if (savedGoal) {
        setMonthlyGoal(parseInt(savedGoal, 10));
      }
    }
  }, [currentUser]);

  // Memoize expensive calculations
  const analytics = useMemo(() => calculateAnalytics(applications), [applications]);
  const trendData = useMemo(() => getApplicationsByWeek(applications), [applications]);
  const upcomingInterviews = useMemo(() => getUpcomingInterviews(applications), [applications]);
  const needFollowUp = useMemo(() => getApplicationsNeedingFollowUp(applications), [applications]);
  const insights = useMemo(() => calculateInsights(applications, analytics), [applications, analytics]);
  const monthComparison = useMemo(() => compareMonths(applications), [applications]);

  if (loading) {
    return <AnalyticsSkeleton />;
  }
  
  // Save monthly goal to localStorage
  const handleGoalChange = (newGoal: number) => {
    setMonthlyGoal(newGoal);
    if (currentUser) {
      localStorage.setItem(`monthly_goal_${currentUser.uid}`, newGoal.toString());
    }
  };
  
  const goalProgress = (analytics.thisMonthApplications / monthlyGoal) * 100;
  
  // Export report to PDF
  const handleExportReport = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Report Candidature', 20, 20);
    
    doc.setFontSize(12);
    let y = 40;
    doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, 20, y);
    y += 10;
    doc.text(`Totale Candidature: ${analytics.totalApplications}`, 20, y);
    y += 10;
    doc.text(`Candidature questo mese: ${analytics.thisMonthApplications}`, 20, y);
    y += 10;
    doc.text(`Tasso di conversione: ${analytics.conversionRate.appliedToInterview.toFixed(1)}%`, 20, y);
    y += 10;
    doc.text(`Tempo medio di risposta: ${analytics.averageResponseTime.toFixed(0)} giorni`, 20, y);
    
    y += 20;
    doc.setFontSize(16);
    doc.text('Insights', 20, y);
    y += 10;
    doc.setFontSize(12);
    insights.forEach((insight, index) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${index + 1}. ${insight.title}`, 20, y);
      y += 7;
      doc.text(insight.message, 25, y);
      y += 10;
    });
    
    doc.save(`report-candidature-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('analytics.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('analytics.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleExportReport}
        >
          {t('analytics.exportReport') || 'Esporta Report PDF'}
        </Button>
      </Box>

      {/* Automatic Insights */}
      {insights.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Lightbulb color="primary" />
            <Typography variant="h6">
              {t('analytics.insights') || 'Insights Automatici'}
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {insights.map((insight, index) => (
              <Box key={index}>
                <Alert 
                  severity={insight.type === 'success' ? 'success' : insight.type === 'warning' ? 'warning' : 'info'}
                  action={insight.action && (
                    <Button size="small" color="inherit">
                      {insight.action}
                    </Button>
                  )}
                >
                  <AlertTitle>{insight.title}</AlertTitle>
                  {insight.message}
                </Alert>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Goal Tracking */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="primary" />
              <Typography variant="h6">
                {t('analytics.monthlyGoal') || 'Obiettivo Mensile'}
              </Typography>
            </Box>
            <ButtonGroup size="small" variant="outlined">
              <Button onClick={() => handleGoalChange(10)}>10</Button>
              <Button onClick={() => handleGoalChange(20)}>20</Button>
              <Button onClick={() => handleGoalChange(30)}>30</Button>
              <Button onClick={() => handleGoalChange(50)}>50</Button>
            </ButtonGroup>
          </Box>
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {analytics.thisMonthApplications} / {monthlyGoal} {t('analytics.applications') || 'candidature'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {goalProgress.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(goalProgress, 100)} 
              sx={{ height: 10, borderRadius: 5 }}
              color={goalProgress >= 100 ? 'success' : goalProgress >= 75 ? 'warning' : 'primary'}
            />
          </Box>
          {goalProgress >= 100 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              🎉 {t('analytics.goalAchieved') || 'Obiettivo raggiunto! Ottimo lavoro!'}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Month Comparison */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <CompareArrows color="primary" />
            <Typography variant="h6">
              {t('analytics.monthComparison') || 'Confronto Mensile'}
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
            <Box>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('analytics.applications') || 'Candidature'}
                </Typography>
                <Typography variant="h5" sx={{ my: 1 }}>
                  {monthComparison.currentMonth.applications}
                </Typography>
                <Chip
                  label={`${monthComparison.changes.applications >= 0 ? '+' : ''}${monthComparison.changes.applications.toFixed(0)}%`}
                  size="small"
                  color={monthComparison.changes.applications >= 0 ? 'success' : 'error'}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  vs {monthComparison.previousMonth.applications} mese scorso
                </Typography>
              </Paper>
            </Box>
            <Box>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('analytics.interviews') || 'Colloqui'}
                </Typography>
                <Typography variant="h5" sx={{ my: 1 }}>
                  {monthComparison.currentMonth.interviews}
                </Typography>
                <Chip
                  label={`${monthComparison.changes.interviews >= 0 ? '+' : ''}${monthComparison.changes.interviews.toFixed(0)}%`}
                  size="small"
                  color={monthComparison.changes.interviews >= 0 ? 'success' : 'error'}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  vs {monthComparison.previousMonth.interviews} mese scorso
                </Typography>
              </Paper>
            </Box>
            <Box>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('analytics.offers') || 'Offerte'}
                </Typography>
                <Typography variant="h5" sx={{ my: 1, color: 'success.main' }}>
                  {monthComparison.currentMonth.offers}
                </Typography>
                <Chip
                  label={`${monthComparison.changes.offers >= 0 ? '+' : ''}${monthComparison.changes.offers.toFixed(0)}%`}
                  size="small"
                  color={monthComparison.changes.offers >= 0 ? 'success' : 'error'}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  vs {monthComparison.previousMonth.offers} mese scorso
                </Typography>
              </Paper>
            </Box>
            <Box>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('analytics.responseRate') || 'Tasso Risposta'}
                </Typography>
                <Typography variant="h5" sx={{ my: 1 }}>
                  {monthComparison.currentMonth.responseRate.toFixed(0)}%
                </Typography>
                <Chip
                  label={`${monthComparison.changes.responseRate >= 0 ? '+' : ''}${monthComparison.changes.responseRate.toFixed(0)}%`}
                  size="small"
                  color={monthComparison.changes.responseRate >= 0 ? 'success' : 'error'}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  vs {monthComparison.previousMonth.responseRate.toFixed(0)}% mese scorso
                </Typography>
              </Paper>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {t('analytics.totalApplications')}
            </Typography>
            <Typography variant="h4">{analytics.totalApplications}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Chip
                label={`${analytics.thisWeekApplications} ${t('analytics.thisWeek')}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {t('analytics.conversionRate')}
            </Typography>
            <Typography variant="h4">
              {analytics.conversionRate.appliedToInterview.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('analytics.appliedTo')} {t('dashboard.interviews')}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {t('analytics.offersReceived')}
            </Typography>
            <Typography variant="h4" sx={{ color: 'success.main' }}>
              {analytics.applicationsByStatus.offer}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {analytics.conversionRate.interviewToOffer.toFixed(1)}% {t('analytics.fromInterviews')}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {t('analytics.avgResponseTime')}
            </Typography>
            <Typography variant="h4">
              {analytics.averageResponseTime.toFixed(0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('analytics.days')}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Charts - Progressive loading: only render when visible */}
      <Box 
        ref={chartsRef.ref}
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}
      >
        {chartsRef.isVisible ? (
          <>
            <Suspense fallback={<Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LinearProgress sx={{ width: '100%' }} /></Box>}>
              <TrendLineChart data={trendData} />
            </Suspense>
            <Suspense fallback={<Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LinearProgress sx={{ width: '100%' }} /></Box>}>
              <StatusPieChart 
                data={analytics.applicationsByStatus}
                onStatusClick={(_status: ApplicationStatus) => {
                  navigate('/applications');
                }}
              />
            </Suspense>
            <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
              <Suspense fallback={<Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LinearProgress sx={{ width: '100%' }} /></Box>}>
                <SourceBarChart data={analytics.applicationsBySource} />
              </Suspense>
            </Box>
          </>
        ) : (
          // Placeholder while charts are loading
          <Box sx={{ gridColumn: { xs: '1', md: 'span 2' }, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LinearProgress sx={{ width: '100%' }} />
          </Box>
        )}
      </Box>

      {/* Action Items */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Schedule sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">{t('analytics.upcomingInterviews')}</Typography>
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
                        (app as any).nextInterviewDate
                          ? format(new Date((app as any).nextInterviewDate), 'dd MMM yyyy HH:mm', { locale: it })
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

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
            <Typography variant="h6">{t('analytics.followUpNeeded')}</Typography>
          </Box>
          {needFollowUp.length === 0 ? (
            <Typography color="text.secondary">
              {t('analytics.noFollowUpNeeded')}
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
      </Box>

      {/* Success Rate by Status */}
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('analytics.statusSummary')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {analytics.applicationsByStatus.applied}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Candidate
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {analytics.applicationsByStatus.interview_1 + 
                  analytics.applicationsByStatus.interview_2 + 
                  analytics.applicationsByStatus.interview_3 + 
                  analytics.applicationsByStatus.interview_4}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                In Colloquio
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ color: 'success.main' }}>
                {analytics.applicationsByStatus.offer}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Offerte
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ color: 'error.main' }}>
                {analytics.applicationsByStatus.rejected}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Rifiutate
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="text.secondary">
                {analytics.applicationsByStatus.saved}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Salvate
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Analytics;


