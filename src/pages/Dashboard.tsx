import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Divider,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import { DashboardSkeleton } from '../components/skeletons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router-dom';
import { useApplications } from '../hooks/useApplications';
import { getApplicationFolderName } from '../utils/documentFolders';
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
  Done as DoneIcon,
  Update as UpdateIcon,
  Add as AddIcon,
  Archive as ArchiveIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { format, addDays, differenceInDays, startOfWeek, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Application, ApplicationFormData } from '../types';
import { initializeNotifications } from '../services/notificationService';
import { getSentEmails } from '../services/sentEmailService';
// Lazy load heavy dialog components
const ApplicationFormDialog = React.lazy(() => import('../components/ApplicationFormDialog'));
const QuickApplicationDialog = React.lazy(() => import('../components/QuickApplicationDialog'));
const CVTailoringDialog = React.lazy(() => import('../components/CVTailoringDialog'));
const CoverLetterGenerator = React.lazy(() => import('../components/CoverLetterGenerator'));
const CompanyResearchDialog = React.lazy(() => import('../components/CompanyResearchDialog'));
const JobAnalyzerDialog = React.lazy(() => import('../components/JobAnalyzerDialog'));
const CVMatcherDialog = React.lazy(() => import('../components/CVMatcherDialog'));
const CVUploadDialog = React.lazy(() => import('../components/CVUploadDialog'));
import { updateCV } from '../services/cvService';
import { DashboardSettings } from '../components/dashboard/DashboardSettings';
import { WidgetContainer } from '../components/dashboard/WidgetContainer';
import type { WidgetConfig } from '../components/dashboard/WidgetContainer';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { HelpTooltip } from '../components/HelpTooltip';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Use custom hook for applications management
  const { applications, loading: applicationsLoading, add: addApplication, update: updateApplication } = useApplications(currentUser?.uid);
  const [newApplicationDialogOpen, setNewApplicationDialogOpen] = useState(false);
  const [quickApplicationDialogOpen, setQuickApplicationDialogOpen] = useState(false);
  const [emailsToSend, setEmailsToSend] = useState(0);
  
  // Dialog states for AI features
  const [cvTailoringOpen, setCvTailoringOpen] = useState(false);
  const [applicationForTailoring, setApplicationForTailoring] = useState<Application | null>(null);
  const [coverLetterGeneratorOpen, setCoverLetterGeneratorOpen] = useState(false);
  const [applicationForCoverLetter, setApplicationForCoverLetter] = useState<Application | null>(null);
  const [companyResearchOpen, setCompanyResearchOpen] = useState(false);
  const [_companyToResearch, setCompanyToResearch] = useState('');
  const [applicationForCompanyResearch, setApplicationForCompanyResearch] = useState<Application | null>(null);
  const [jobAnalyzerOpen, setJobAnalyzerOpen] = useState(false);
  const [_jobDescToAnalyze, setJobDescToAnalyze] = useState('');
  const [applicationForJobAnalyzer, setApplicationForJobAnalyzer] = useState<Application | null>(null);
  const [cvMatcherOpen, setCvMatcherOpen] = useState(false);
  const [_applicationForCVMatcher, setApplicationForCVMatcher] = useState<Application | null>(null);
  const [cvUploadOpen, setCvUploadOpen] = useState(false);
  const [cvUploadType, setCvUploadType] = useState<'cv' | 'coverLetter'>('cv');
  const [applicationForUpload, setApplicationForUpload] = useState<Application | null>(null);
  const [uploadedCVId, setUploadedCVId] = useState<string | null>(null);
  const [uploadedCoverLetterId, setUploadedCoverLetterId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  
  // Dashboard customization
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    // Default widgets
    return [
      { id: 'stats', type: 'statistics', title: 'Statistiche', position: { x: 0, y: 0 }, size: { width: 12, height: 4 } },
      { id: 'chart', type: 'chart', title: 'Grafici', position: { x: 0, y: 4 }, size: { width: 12, height: 6 } },
    ];
  });
  const [dashboardSettingsOpen, setDashboardSettingsOpen] = useState(false);
  
  // Save widgets to localStorage when they change
  useEffect(() => {
    localStorage.setItem('dashboard_widgets', JSON.stringify(widgets));
  }, [widgets]);
  
  const handleAddWidget = (type: WidgetConfig['type']) => {
    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type,
      title: type === 'statistics' ? 'Statistiche' : type === 'chart' ? 'Grafici' : type === 'list' ? 'Lista' : 'Calendario',
      position: { x: 0, y: widgets.length * 4 },
      size: { width: 12, height: type === 'statistics' ? 4 : type === 'chart' ? 6 : 4 },
    };
    setWidgets([...widgets, newWidget]);
  };
  
  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };
  
  const handleToggleWidget = (id: string, enabled: boolean) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, enabled } : w));
  };

  const handleLayoutChange = (layout: any[]) => {
    const updatedWidgets = widgets.map(widget => {
      const layoutItem = layout.find((l: any) => l.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          position: { x: layoutItem.x, y: layoutItem.y },
          size: { width: layoutItem.w, height: layoutItem.h },
        };
      }
      return widget;
    });
    setWidgets(updatedWidgets);
  };

  const renderWidgetContent = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'statistics':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>{t('dashboard.totalApplications')}</Typography>
            <Typography variant="h4" color="primary.main" gutterBottom>
              {analytics.totalApplications}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.inProgress')}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {Object.values(analytics.applicationsByStatus).reduce((sum, count) => sum + (count || 0), 0) - analytics.applicationsByStatus.saved - analytics.applicationsByStatus.rejected}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.offers')}
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="success.main">
                  {analytics.applicationsByStatus.offer || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.responseRate')}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {analytics.conversionRate.appliedToInterview > 0 
                    ? `${analytics.conversionRate.appliedToInterview.toFixed(1)}%`
                    : '0%'}
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      case 'chart':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>{t('dashboard.charts') || 'Grafici'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {t('dashboard.chartsMovedToAnalytics') || 'I grafici sono disponibili nella pagina Analytics.'}
            </Typography>
          </Box>
        );
      case 'list':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>{t('dashboard.recentActivity')}</Typography>
            {recentActivity.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('dashboard.noRecentActivity')}
              </Typography>
            ) : (
              <List dense sx={{ mt: 1 }}>
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={activity.description}
                        secondary={format(activity.date, 'dd MMM yyyy HH:mm', { locale: it })}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        );
      case 'calendar':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>{t('dashboard.upcomingInterviewsTitle')}</Typography>
            {upcomingInterviews.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('dashboard.noUpcomingInterviews')}
              </Typography>
            ) : (
              <List dense sx={{ mt: 1 }}>
                {upcomingInterviews.slice(0, 5).map((interview) => (
                  <ListItem key={interview.id}>
                    <ListItemText
                      primary={`${interview.jobTitle} - ${interview.company}`}
                      secondary={format(interview.nextInterviewDate, 'dd MMM yyyy HH:mm', { locale: it })}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  // Calculate urgent actions with memoization
  const urgentActions = useMemo(() => {
    if (!applications.length) {
      return { noResponseCount: 0, interviewsThisWeek: 0, emailsToSend: 0 };
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 7);
    
    // Count applications without response for 7+ days
    const noResponseCount = applications.filter(app => {
      if (!app.appliedDate) return false;
      const appliedDate = new Date(app.appliedDate);
      const daysSinceApplied = differenceInDays(now, appliedDate);
      return daysSinceApplied >= 7 && 
             app.status === 'applied' && 
             !app.interviewDates?.length;
    }).length;
    
    // Count interviews this week
    const interviewsThisWeek = applications.filter(app => {
      if (!app.interviewDates || app.interviewDates.length === 0) return false;
      return app.interviewDates.some(interview => {
        const interviewDate = new Date(interview.date);
        return isWithinInterval(interviewDate, { start: weekStart, end: weekEnd });
      });
    }).length;
    
    // Emails to send will be calculated separately when sentEmails are loaded
    return {
      noResponseCount,
      interviewsThisWeek,
    };
  }, [applications]);

  // Fetch sent emails separately and update emailsToSend
  useEffect(() => {
    if (!currentUser || !applications.length) return;

    const calculateEmailsToSend = async () => {
      try {
        const sentEmails = await getSentEmails(currentUser.uid);
        const appsWithEmails = new Set(sentEmails.map(e => e.applicationId));
        const emailsToSend = applications.filter(app => 
          app.status === 'applied' && 
          app.appliedDate && 
          !appsWithEmails.has(app.id)
        ).length;
        
        setEmailsToSend(emailsToSend);
      } catch (error) {
        console.error('Error fetching sent emails:', error);
      }
    };

    calculateEmailsToSend();
  }, [currentUser, applications]);

  // Initialize notification system
  useEffect(() => {
    if (applications.length > 0) {
      initializeNotifications(applications);
    }
  }, [applications]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Check for modifier keys (Ctrl/Cmd)
      const isModifierPressed = e.ctrlKey || e.metaKey;

      // N = New application (quick)
      if (e.key === 'n' && !isModifierPressed) {
        e.preventDefault();
        setQuickApplicationDialogOpen(true);
      }

      // Ctrl+N or Cmd+N = Full new application
      if (e.key === 'n' && isModifierPressed) {
        e.preventDefault();
        setNewApplicationDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCompleteFollowUp = async (app: Application) => {
    try {
      await updateApplication(app.id, {
        ...app,
        lastFollowUpDate: new Date(),
        followUpEnabled: false, // Disable follow-up after completion
        nextFollowUpDate: undefined,
      } as ApplicationFormData);
    } catch (error) {
      console.error('Error completing follow-up:', error);
    }
  };

  const handlePostponeFollowUp = async (app: Application, days: number = 7) => {
    try {
      const currentFollowUpDate = app.nextFollowUpDate ? new Date(app.nextFollowUpDate) : new Date();
      const newFollowUpDate = addDays(currentFollowUpDate, days);
      
      await updateApplication(app.id, {
        ...app,
        nextFollowUpDate: newFollowUpDate,
      } as ApplicationFormData);
    } catch (error) {
      console.error('Error postponing follow-up:', error);
    }
  };

  const handleCreateApplication = async (formData: ApplicationFormData) => {
    try {
      await addApplication(formData);
      setNewApplicationDialogOpen(false);
    } catch (error) {
      console.error('Error creating application:', error);
    }
  };

  const handleQuickCreateApplication = async (data: { company: string; jobTitle: string }) => {
    try {
      const quickFormData: ApplicationFormData = {
        company: data.company,
        jobTitle: data.jobTitle,
        location: '',
        isRemote: false,
        jobUrl: '',
        jobDescription: '',
        companyEmail: '',
        salaryMin: undefined,
        salaryMax: undefined,
        salaryCurrency: 'EUR',
        source: 'other',
        status: 'saved', // Status "Da candidarsi" (saved)
        priority: 'medium',
        notes: '',
        tags: [],
        cvId: undefined,
        coverLetterId: undefined,
        recruiterName: '',
        recruiterEmail: '',
        recruiterLinkedin: '',
        followUpEnabled: false,
        nextFollowUpDate: undefined,
      };
      
      // Create application using hook (optimistic update)
      await addApplication(quickFormData);
      
      // Navigate to applications page to show the newly created application
      navigate('/applications');
    } catch (error) {
      console.error('Error creating quick application:', error);
    }
  };

  // Handler for Company Research
  const handleOpenCompanyResearch = (companyNameOrApplication: string | Application) => {
    if (typeof companyNameOrApplication === 'string') {
      setCompanyToResearch(companyNameOrApplication);
      setCompanyResearchOpen(true);
    } else {
      const app = companyNameOrApplication;
      setCompanyToResearch(app.company);
      setApplicationForCompanyResearch(app);
      setCompanyResearchOpen(true);
    }
  };

  // Handler for Job Analyzer
  const handleOpenJobAnalyzer = (jobDescTextOrApplication: string | Application) => {
    if (typeof jobDescTextOrApplication === 'string') {
      setJobDescToAnalyze(jobDescTextOrApplication);
      setJobAnalyzerOpen(true);
    } else {
      const app = jobDescTextOrApplication;
      setJobDescToAnalyze(app.jobDescription || app.jobUrl || '');
      setApplicationForJobAnalyzer(app);
      setJobAnalyzerOpen(true);
    }
  };

  // Handler for CV Upload
  const handleUploadCV = (application: Application) => {
    setApplicationForUpload(application);
    setCvUploadType('cv');
    setCvUploadOpen(true);
  };

  // Handler for Cover Letter Upload
  const handleUploadCoverLetter = (application: Application) => {
    setApplicationForUpload(application);
    setCvUploadType('coverLetter');
    setCvUploadOpen(true);
  };

  // Handler for CV Analysis (CV Matcher)
  const handleAnalyzeCV = (application: Application) => {
    setApplicationForCVMatcher(application);
    setCvMatcherOpen(true);
  };

  // Handler for CV Optimization (CV Tailoring)
  const handleOptimizeCV = (application: Application) => {
    setApplicationForTailoring(application);
    setCvTailoringOpen(true);
  };

  // Handler for Cover Letter Generation
  const handleGenerateCoverLetter = (application: Application) => {
    setApplicationForCoverLetter(application);
    setCoverLetterGeneratorOpen(true);
  };

  // Handler for CV Upload Success
  const handleCVUploadSuccess = async (uploadedCVId: string) => {
    if (!applicationForUpload || !currentUser) return;

    try {
      if (!applicationForUpload.id) {
        // New application - store uploaded ID for auto-selection
        if (cvUploadType === 'cv') {
          setUploadedCVId(uploadedCVId);
        } else {
          setUploadedCoverLetterId(uploadedCVId);
        }
        setCvUploadOpen(false);
        setApplicationForUpload(null);
        return;
      }
      
      // For existing applications, move document to application folder
      const applicationFolderName = getApplicationFolderName(applicationForUpload);
      await updateCV(uploadedCVId, { folder: applicationFolderName });
      
      // Hook will handle the refresh automatically
      setCvUploadOpen(false);
      setApplicationForUpload(null);
    } catch (err) {
      console.error('Error linking document to application:', err);
    }
  };

  // Handler for saving Cover Letter to application
  const handleSaveCoverLetterToApplication = async (coverLetterId: string) => {
    if (!applicationForCoverLetter || !currentUser) return;

    try {
      // If application doesn't have an ID yet (new application), don't try to update it
      // The Cover Letter will be linked when the application is created
      if (!applicationForCoverLetter.id) {
        console.log('💾 [Dashboard] Cover Letter saved, but application not yet created. Cover Letter will be linked when application is saved.');
        setCoverLetterGeneratorOpen(false);
        setApplicationForCoverLetter(null);
        return;
      }

      // Update application with coverLetterId using hook (optimistic update)
      await updateApplication(applicationForCoverLetter.id, {
        ...applicationForCoverLetter,
        coverLetterId,
      } as ApplicationFormData);
      
      console.log('✅ [Dashboard] Cover Letter saved to application:', applicationForCoverLetter.id);
      
      setCoverLetterGeneratorOpen(false);
      setApplicationForCoverLetter(null);
    } catch (err) {
      console.error('Error saving Cover Letter to application:', err);
      alert('Errore nel salvataggio della Cover Letter nella candidatura. La Cover Letter è stata salvata nei Documenti.');
    }
  };

  // Memoize expensive calculations
  const analytics = useMemo(
    () => calculateAnalytics(applications),
    [applications]
  );

  const upcomingInterviews = useMemo(
    () => getUpcomingInterviews(applications),
    [applications]
  );

  const needFollowUp = useMemo(
    () => getApplicationsNeedingFollowUp(applications),
    [applications]
  );

  // Generate recent activity timeline with memoization
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'created' | 'applied' | 'interview' | 'offer' | 'rejected';
      date: Date;
      application: Application;
      description: string;
    }> = [];

    applications.forEach((app) => {
      // Created
      if (app.createdAt) {
        activities.push({
          id: `${app.id}-created`,
          type: 'created',
          date: new Date(app.createdAt),
          application: app,
          description: `${t('dashboard.activityCreated') || 'Candidatura creata'}: ${app.jobTitle} - ${app.company}`,
        });
      }

      // Applied
      if (app.appliedDate) {
        activities.push({
          id: `${app.id}-applied`,
          type: 'applied',
          date: new Date(app.appliedDate),
          application: app,
          description: `${t('dashboard.activityApplied') || 'Candidatura inviata'}: ${app.jobTitle} - ${app.company}`,
        });
      }

      // Interviews
      if (app.interviewDates && app.interviewDates.length > 0) {
        app.interviewDates.forEach((interview, idx) => {
          activities.push({
            id: `${app.id}-interview-${idx}`,
            type: 'interview',
            date: new Date(interview.date),
            application: app,
            description: `${t('dashboard.activityInterview') || 'Colloquio'}: ${app.jobTitle} - ${app.company}`,
          });
        });
      }

      // Offer
      if (app.offerDate) {
        activities.push({
          id: `${app.id}-offer`,
          type: 'offer',
          date: new Date(app.offerDate),
          application: app,
          description: `${t('dashboard.activityOffer') || 'Offerta ricevuta'}: ${app.jobTitle} - ${app.company}`,
        });
      }

      // Rejected
      if (app.rejectedDate) {
        activities.push({
          id: `${app.id}-rejected`,
          type: 'rejected',
          date: new Date(app.rejectedDate),
          application: app,
          description: `${t('dashboard.activityRejected') || 'Candidatura rifiutata'}: ${app.jobTitle} - ${app.company}`,
        });
      }
    });

    // Sort by date (most recent first) and take last 10
    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [applications, t]);

  if (applicationsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('dashboard.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('dashboard.welcome')}, {currentUser?.displayName || currentUser?.email}!
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpTooltip
            title="Personalizza Dashboard"
            content="Clicca qui per aggiungere, rimuovere o riorganizzare i widget della dashboard. Puoi trascinare i widget per riposizionarli e ridimensionarli."
          />
          <IconButton
            onClick={() => setDashboardSettingsOpen(true)}
            color="primary"
            title="Personalizza Dashboard"
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Urgent Actions Widget */}
      {(urgentActions.noResponseCount > 0 || urgentActions.interviewsThisWeek > 0 || emailsToSend > 0) && (
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4, 
            bgcolor: 'warning.light',
            borderLeft: '4px solid',
            borderColor: 'warning.main',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UpdateIcon sx={{ color: 'warning.dark' }} />
            {t('dashboard.urgentActions') || 'Azioni Urgenti'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {urgentActions.noResponseCount > 0 && (
              <Alert 
                severity="warning" 
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate('/applications')}
              >
                <Typography variant="body2">
                  {t('dashboard.urgentNoResponse', { count: urgentActions.noResponseCount }) || 
                   `Hai ${urgentActions.noResponseCount} candidatura${urgentActions.noResponseCount > 1 ? 'e' : ''} senza risposta da 7+ giorni`}
                </Typography>
              </Alert>
            )}
            {urgentActions.interviewsThisWeek > 0 && (
              <Alert 
                severity="info" 
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate('/calendar')}
              >
                <Typography variant="body2">
                  {t('dashboard.urgentInterviews', { count: urgentActions.interviewsThisWeek }) || 
                   `${urgentActions.interviewsThisWeek} colloquio${urgentActions.interviewsThisWeek > 1 ? 'i' : ''} questa settimana`}
                </Typography>
              </Alert>
            )}
            {emailsToSend > 0 && (
              <Alert 
                severity="error" 
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate('/gmail')}
              >
                <Typography variant="body2">
                  {t('dashboard.urgentEmails', { count: emailsToSend }) || 
                   `${emailsToSend} email da inviare`}
                </Typography>
              </Alert>
            )}
          </Box>
        </Paper>
      )}

      {/* Quick Stats - Enhanced */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        {/* Total Applications */}
        <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => navigate('/applications')}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Work sx={{ mr: 1, color: 'primary.main' }} />
              <Typography color="text.secondary" gutterBottom variant="body2">
                {t('dashboard.totalApplications')}
              </Typography>
            </Box>
            <Typography variant="h4">{analytics.totalApplications}</Typography>
            <Chip
              label={`+${analytics.thisWeekApplications} ${t('dashboard.thisWeekApplications')}`}
              size="small"
              color="primary"
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>

        {/* Response Rate */}
        <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => navigate('/analytics')}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
              <Typography color="text.secondary" gutterBottom variant="body2">
                {t('dashboard.responseRate') || 'Tasso di Risposta'}
              </Typography>
            </Box>
            <Typography variant="h4">
              {analytics.conversionRate.appliedToInterview > 0 
                ? `${analytics.conversionRate.appliedToInterview.toFixed(1)}%`
                : '0%'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {t('dashboard.appliedToInterviews') || 'Candidature → Colloqui'}
            </Typography>
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => navigate('/calendar')}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Schedule sx={{ mr: 1, color: 'warning.main' }} />
              <Typography color="text.secondary" gutterBottom variant="body2">
                {t('dashboard.upcomingInterviewsTitle')}
              </Typography>
            </Box>
            <Typography variant="h4">
              {upcomingInterviews.length}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {t('dashboard.nextInterviews') || 'Prossimi colloqui'}
            </Typography>
          </CardContent>
        </Card>

        {/* Offers */}
        <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => navigate('/applications')}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
              <Typography color="text.secondary" gutterBottom variant="body2">
                {t('dashboard.offers')}
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ color: 'success.main' }}>
              {analytics.applicationsByStatus.offer}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {t('dashboard.offersReceived')}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Quick Actions - Centered vertically and prominently displayed */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
          {/* Quick Application Button - Most prominent */}
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setQuickApplicationDialogOpen(true)}
            sx={{
              minWidth: { xs: '200px', sm: '250px' },
              fontSize: { xs: '0.95rem', sm: '1rem' },
              py: 1.5,
              px: 3,
              boxShadow: 3,
              '&:hover': {
                boxShadow: 6,
              },
            }}
          >
            {t('dashboard.quickApplication') || 'Nuova Candidatura Rapida'}
          </Button>
          
          {/* Full Application Button */}
          <Button
            variant="outlined"
            size="medium"
            startIcon={<AddIcon />}
            onClick={() => setNewApplicationDialogOpen(true)}
            sx={{
              minWidth: { xs: '200px', sm: '250px' },
              fontSize: { xs: '0.9rem', sm: '0.95rem' },
              py: 1.25,
            }}
          >
            {t('applications.newApplication') || 'Nuova Candidatura Completa'}
          </Button>
          
          {/* Storico */}
          <Button
            variant="outlined"
            size="medium"
            startIcon={<ArchiveIcon />}
            onClick={() => navigate('/archived')}
            sx={{
              minWidth: { xs: '200px', sm: '250px' },
              fontSize: { xs: '0.9rem', sm: '0.95rem' },
              py: 1.25,
            }}
          >
            {t('applications.archived') || 'Storico'}
          </Button>
          
          {/* Calendario */}
          <Button
            variant="outlined"
            size="medium"
            startIcon={<CalendarIcon />}
            onClick={() => navigate('/calendar')}
            sx={{
              minWidth: { xs: '200px', sm: '250px' },
              fontSize: { xs: '0.9rem', sm: '0.95rem' },
              py: 1.25,
            }}
          >
            {t('applications.calendar') || 'Calendario'}
          </Button>
        </Box>
      </Paper>

      {/* Customizable Widgets with Drag & Drop */}
      {widgets.filter(w => w.enabled !== false).length > 0 && (
        <Box sx={{ mt: 4, mb: 4 }}>
          <GridLayout
            className="layout"
            layout={widgets
              .filter(w => w.enabled !== false)
              .map(w => ({
                i: w.id,
                x: w.position.x,
                y: w.position.y,
                w: w.size.width,
                h: w.size.height,
              }))}
            cols={12}
            rowHeight={60}
            width={typeof window !== 'undefined' ? window.innerWidth - 100 : 1200}
            onLayoutChange={handleLayoutChange}
            isDraggable={true}
            isResizable={true}
            draggableHandle=".drag-handle"
          >
            {widgets
              .filter(w => w.enabled !== false)
              .map((widget) => (
                <Box key={widget.id}>
                  <WidgetContainer
                    widget={widget}
                    onRemove={handleRemoveWidget}
                  >
                    {renderWidgetContent(widget)}
                  </WidgetContainer>
                </Box>
              ))}
          </GridLayout>
        </Box>
      )}

      {/* Recent Activity Timeline */}
      <Box sx={{ mt: 3, mb: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('dashboard.recentActivity') || 'Attività Recenti'}</Typography>
            <Button
              endIcon={<ArrowForward />}
              onClick={() => navigate('/applications')}
              size="small"
            >
              {t('dashboard.viewAll')}
            </Button>
          </Box>
          {recentActivity.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {t('dashboard.noRecentActivity') || 'Nessuna attività recente'}
            </Typography>
          ) : (
            <List dense>
              {recentActivity.map((activity, index) => {
                const getActivityIcon = () => {
                  switch (activity.type) {
                    case 'created':
                      return <AddIcon sx={{ fontSize: 18, color: 'primary.main' }} />;
                    case 'applied':
                      return <CheckCircle sx={{ fontSize: 18, color: 'info.main' }} />;
                    case 'interview':
                      return <Schedule sx={{ fontSize: 18, color: 'warning.main' }} />;
                    case 'offer':
                      return <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} />;
                    case 'rejected':
                      return <ArchiveIcon sx={{ fontSize: 18, color: 'error.main' }} />;
                    default:
                      return <Work sx={{ fontSize: 18 }} />;
                  }
                };

                return (
                  <React.Fragment key={activity.id}>
                    {index > 0 && <Divider />}
                    <ListItem
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => {
                        setSelectedApplication(activity.application);
                        setDialogOpen(true);
                      }}
                    >
                      <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                        {getActivityIcon()}
                      </Box>
                      <ListItemText
                        primary={activity.description}
                        secondary={format(activity.date, 'dd MMM yyyy HH:mm', { locale: it })}
                      />
                    </ListItem>
                  </React.Fragment>
                );
              })}
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
              <Typography variant="h6">{t('dashboard.upcomingInterviewsTitle')}</Typography>
            </Box>
            {upcomingInterviews.length === 0 ? (
              <Typography color="text.secondary">
                {t('dashboard.noUpcomingInterviews')}
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
                          (app as any).nextInterviewDate
                            ? format(new Date((app as any).nextInterviewDate), 'dd MMM yyyy HH:mm', { locale: it })
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
              <Typography variant="h6">{t('dashboard.followUpNeeded')}</Typography>
            </Box>
            {needFollowUp.length === 0 ? (
              <Typography color="text.secondary">
                {t('dashboard.noFollowUpNeeded')}
              </Typography>
            ) : (
              <List dense>
                {needFollowUp.slice(0, 3).map((app, index) => (
                  <React.Fragment key={app.id}>
                    {index > 0 && <Divider />}
                    <ListItem
                      sx={{ 
                        flexDirection: 'column', 
                        alignItems: 'stretch',
                        gap: 1,
                        py: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <ListItemText
                          primary={`${app.jobTitle} - ${app.company}`}
                          secondary={
                            app.followUpEnabled && app.nextFollowUpDate
                              ? `📅 Follow-up: ${format(new Date(app.nextFollowUpDate), 'dd MMM yyyy', { locale: it })}`
                              : app.appliedDate
                              ? `Candidata il ${format(new Date(app.appliedDate), 'dd MMM yyyy', { locale: it })}`
                              : 'Data non disponibile'
                          }
                        />
                        <Chip 
                          label={app.followUpEnabled ? 'Promemoria attivo' : 'Urgente'} 
                          size="small" 
                          color={app.followUpEnabled ? 'info' : 'warning'} 
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="Segna come completato">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleCompleteFollowUp(app)}
                          >
                            <DoneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Posticipa di 7 giorni">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handlePostponeFollowUp(app, 7)}
                          >
                            <UpdateIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>


      {/* Quick Application Dialog */}
      <QuickApplicationDialog
        open={quickApplicationDialogOpen}
        onClose={() => setQuickApplicationDialogOpen(false)}
        onSubmit={handleQuickCreateApplication}
      />

      {/* Application Dialog for Timeline */}
      <Suspense fallback={<div>Loading...</div>}>
        <ApplicationFormDialog
          open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedApplication(null);
        }}
        onSubmit={async (formData: ApplicationFormData) => {
          if (!selectedApplication) return;
          try {
            // Use hook's update method (optimistic update)
            await updateApplication(selectedApplication.id, formData);
            setDialogOpen(false);
            setSelectedApplication(null);
          } catch (error: any) {
            console.error('Error updating application:', error);
            // Don't close dialog on error so user can retry
          }
        }}
        application={selectedApplication}
        viewOnly={false}
        onOpenCompanyResearch={handleOpenCompanyResearch}
        onOpenJobAnalyzer={handleOpenJobAnalyzer}
        onUploadCV={handleUploadCV}
        onUploadCoverLetter={handleUploadCoverLetter}
        onAnalyzeCV={handleAnalyzeCV}
        onOptimizeCV={handleOptimizeCV}
        onGenerateCoverLetter={handleGenerateCoverLetter}
        />
      </Suspense>

      {/* New Application Dialog */}
      <Suspense fallback={<div>Loading...</div>}>
        <ApplicationFormDialog
        open={newApplicationDialogOpen}
        onClose={() => {
          setNewApplicationDialogOpen(false);
          // Reset uploaded document IDs when closing dialog
          setUploadedCVId(null);
          setUploadedCoverLetterId(null);
        }}
        onSubmit={handleCreateApplication}
        application={null}
        onOpenCompanyResearch={handleOpenCompanyResearch}
        onOpenJobAnalyzer={handleOpenJobAnalyzer}
        onUploadCV={handleUploadCV}
        onUploadCoverLetter={handleUploadCoverLetter}
        onAnalyzeCV={handleAnalyzeCV}
        onOptimizeCV={handleOptimizeCV}
        onGenerateCoverLetter={handleGenerateCoverLetter}
        autoSelectCVId={uploadedCVId}
        autoSelectCoverLetterId={uploadedCoverLetterId}
        />
      </Suspense>

      {/* CV Tailoring Dialog */}
      {currentUser && applicationForTailoring && (
        <Suspense fallback={<div>Loading...</div>}>
          <CVTailoringDialog
          open={cvTailoringOpen}
          onClose={() => {
            setCvTailoringOpen(false);
            setApplicationForTailoring(null);
          }}
          userId={currentUser.uid}
          prefilledJobDescription={applicationForTailoring.jobDescription}
          prefilledJobUrl={applicationForTailoring.jobUrl}
          prefilledCompany={applicationForTailoring.company}
          prefilledJobTitle={applicationForTailoring.jobTitle}
          prefilledCVId={applicationForTailoring.cvId}
          lockCVSelection={!!applicationForTailoring.cvId}
          />
        </Suspense>
      )}

      {/* Cover Letter Generator */}
      {applicationForCoverLetter && (
        <Suspense fallback={<div>Loading...</div>}>
          <CoverLetterGenerator
          open={coverLetterGeneratorOpen}
          onClose={() => {
            setCoverLetterGeneratorOpen(false);
            setApplicationForCoverLetter(null);
          }}
          onSaveToApplication={handleSaveCoverLetterToApplication}
          prefilledCompany={applicationForCoverLetter.company}
          prefilledJobTitle={applicationForCoverLetter.jobTitle}
          prefilledJobDescription={applicationForCoverLetter.jobDescription}
          prefilledJobUrl={applicationForCoverLetter.jobUrl}
          prefilledCVId={applicationForCoverLetter.cvId}
          lockCVSelection={!!applicationForCoverLetter.cvId}
          />
        </Suspense>
      )}

      {/* Company Research Dialog */}
      <Suspense fallback={<div>Loading...</div>}>
        <CompanyResearchDialog
          open={companyResearchOpen}
        onClose={() => {
          setCompanyResearchOpen(false);
          setCompanyToResearch('');
          setApplicationForCompanyResearch(null);
        }}
        prefilledCompany={_companyToResearch}
        applicationCompany={applicationForCompanyResearch?.company}
        applicationJobTitle={applicationForCompanyResearch?.jobTitle}
        />
      </Suspense>

      {/* Job Analyzer Dialog */}
      <Suspense fallback={<div>Loading...</div>}>
        <JobAnalyzerDialog
        open={jobAnalyzerOpen}
        onClose={() => {
          setJobAnalyzerOpen(false);
          setJobDescToAnalyze('');
          setApplicationForJobAnalyzer(null);
        }}
        prefilledJobDescription={_jobDescToAnalyze}
        applicationCompany={applicationForJobAnalyzer?.company}
        applicationJobTitle={applicationForJobAnalyzer?.jobTitle}
        />
      </Suspense>

      {/* CV Matcher Dialog */}
      <Suspense fallback={<div>Loading...</div>}>
        <CVMatcherDialog
        open={cvMatcherOpen}
        onClose={() => {
          setCvMatcherOpen(false);
          setApplicationForCVMatcher(null);
        }}
        prefilledCVId={_applicationForCVMatcher?.cvId}
        prefilledJobDescription={_applicationForCVMatcher?.jobDescription}
        prefilledJobUrl={_applicationForCVMatcher?.jobUrl}
        prefilledJobTitle={_applicationForCVMatcher?.jobTitle}
        applicationCompany={_applicationForCVMatcher?.company}
        lockCVSelection={!!_applicationForCVMatcher?.cvId}
        />
      </Suspense>

      {/* CV Upload Dialog */}
      {currentUser && applicationForUpload && (
        <Suspense fallback={<div>Loading...</div>}>
          <CVUploadDialog
          open={cvUploadOpen}
          onClose={() => {
            setCvUploadOpen(false);
            setApplicationForUpload(null);
          }}
          userId={currentUser.uid}
          onSuccess={handleCVUploadSuccess}
          suggestedCategory={cvUploadType === 'cv' ? 'CV' : 'Cover Letter'}
          autoAssignFolder={cvUploadType === 'cv' ? 'CV' : 'Cover Letter'}
          lockFolder={!!applicationForUpload?.id}
          hideFolderField={!applicationForUpload?.id}
          />
        </Suspense>
      )}

      {/* Dashboard Settings */}
      <DashboardSettings
        open={dashboardSettingsOpen}
        onClose={() => setDashboardSettingsOpen(false)}
        widgets={widgets}
        onAddWidget={handleAddWidget}
        onRemoveWidget={handleRemoveWidget}
        onToggleWidget={handleToggleWidget}
      />
    </Box>
  );
};

export default Dashboard;

