import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
  Button,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  LocationOn as LocationIcon,
  ArrowBack as BackIcon,
  CalendarMonth as ViewMonthIcon,
  ViewWeek as ViewWeekIcon,
  Today as TodayIcon,
  Add as AddIcon,
  Sync as SyncIcon,
  Notifications as NotificationsIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useApplications } from '../hooks/useApplications';
import ApplicationFormDialog from '../components/ApplicationFormDialog';
import type { Application, InterviewDate, ApplicationFormData } from '../types';

interface CalendarEvent {
  id: string;
  application: Application;
  interviewDate: InterviewDate;
}

type ViewMode = 'month' | 'week' | 'day' | 'list';

const Calendar: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Use the custom hook for applications data
  const { applications, loading } = useApplications(currentUser?.uid);
  
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  // Memoize calendar events calculation
  const events = useMemo(() => {
    console.log('📅 Calendar: Total applications loaded:', applications.length);
    
    // Extract all interview dates
    const calendarEvents: CalendarEvent[] = [];
    applications.forEach((app: Application) => {
      console.log('📅 Checking app:', app.jobTitle, 'interviewDates:', app.interviewDates);
      
      if (app.interviewDates && app.interviewDates.length > 0) {
        app.interviewDates.forEach((interviewDate: InterviewDate) => {
          console.log('📅 Processing interview date:', interviewDate);
          
          // Ensure date is valid
          if (interviewDate.date) {
            // Convert to Date if it's not already
            const dateObj = interviewDate.date instanceof Date 
              ? interviewDate.date 
              : new Date(interviewDate.date);
            
            console.log('📅 Converted date:', dateObj, 'isValid:', !isNaN(dateObj.getTime()));
            
            // Check if date is valid
            if (!isNaN(dateObj.getTime())) {
              const event = {
                id: `${app.id}-${dateObj.getTime()}`,
                application: app,
                interviewDate: {
                  ...interviewDate,
                  date: dateObj, // Ensure it's a proper Date object
                },
              };
              console.log('📅 Adding calendar event:', event);
              calendarEvents.push(event);
            }
          }
        });
      }
    });

    console.log('📅 Total calendar events:', calendarEvents.length);

    // Sort by date (most recent first)
    calendarEvents.sort((a, b) => {
      const dateA = a.interviewDate.date instanceof Date ? a.interviewDate.date : new Date(a.interviewDate.date);
      const dateB = b.interviewDate.date instanceof Date ? b.interviewDate.date : new Date(b.interviewDate.date);
      return dateB.getTime() - dateA.getTime();
    });

    return calendarEvents;
  }, [applications]);

  const getInterviewTypeLabel = (type: string): string => {
    switch (type) {
      case 'interview_1':
        return 'Colloquio Recruiter';
      case 'interview_2':
        return 'Colloquio Manager';
      case 'interview_3':
        return 'Colloquio Tecnico';
      case 'interview_4':
        return 'Colloquio Panel';
      default:
        return type;
    }
  };

  const getInterviewTypeColor = (type: string) => {
    switch (type) {
      case 'interview_1':
        return 'primary';
      case 'interview_2':
        return 'secondary';
      case 'interview_3':
        return 'warning';
      case 'interview_4':
        return 'success';
      default:
        return 'default';
    }
  };

  const isPastDate = (date: Date): boolean => {
    const now = new Date();
    return date < now;
  };

  // Count only future interviews
  const futureInterviewsCount = events.filter(event => {
    const eventDate = event.interviewDate.date instanceof Date 
      ? event.interviewDate.date 
      : new Date(event.interviewDate.date);
    return !isPastDate(eventDate);
  }).length;

  // Get events for current view
  const getEventsForView = (): CalendarEvent[] => {
    if (viewMode === 'list') {
      return events.filter(event => {
        const eventDate = event.interviewDate.date instanceof Date 
          ? event.interviewDate.date 
          : new Date(event.interviewDate.date);
        return !isPastDate(eventDate);
      });
    }
    
    const start = viewMode === 'month' 
      ? startOfMonth(currentDate)
      : viewMode === 'week'
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : startOfDay(currentDate);
    
    const end = viewMode === 'month'
      ? endOfMonth(currentDate)
      : viewMode === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : endOfDay(currentDate);
    
    return events.filter(event => {
      const eventDate = event.interviewDate.date instanceof Date 
        ? event.interviewDate.date 
        : new Date(event.interviewDate.date);
      return eventDate >= start && eventDate <= end;
    });
  };

  const viewEvents = getEventsForView();

  // Navigation handlers
  const handlePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Quick add interview handler
  const handleQuickAdd = (date: Date) => {
    setSelectedDate(date);
    setQuickAddDialogOpen(true);
  };

  // Sync with Google Calendar
  const handleSyncGoogleCalendar = async () => {
    if (!currentUser) return;
    
    try {
      setError(null);
      
      // Check if Calendar is connected
      const { isCalendarConnected, requestCalendarAccessToken } = await import('../services/googleCalendarService');
      const connected = await isCalendarConnected(currentUser.uid);
      
      if (!connected) {
        // Request access
        await requestCalendarAccessToken(currentUser.uid);
        setGoogleCalendarConnected(true);
        alert(t('calendar.connected') || 'Google Calendar connesso con successo!');
      }
      
      // Sync interviews to Google Calendar
      const { syncAllInterviewsToCalendar } = await import('../services/googleCalendarService');
      
      // Use applications from hook (already loaded)
      const result = await syncAllInterviewsToCalendar(currentUser.uid, applications);
      
      const syncMessage = result.errors > 0
        ? `${t('calendar.syncComplete', { synced: result.synced }) || `Sincronizzazione completata: ${result.synced} eventi sincronizzati`}, ${result.errors} errori`
        : t('calendar.syncComplete', { synced: result.synced }) || `Sincronizzazione completata: ${result.synced} eventi sincronizzati`;
      alert(syncMessage);
    } catch (err: any) {
      console.error('Error syncing with Google Calendar:', err);
      setError(t('calendar.syncError') || `Errore nella sincronizzazione: ${err.message}`);
    }
  };

  // Setup reminders for interviews using push notification service
  useEffect(() => {
    if (!remindersEnabled || !currentUser) return;

    const setupReminders = async () => {
      const { requestNotificationPermission, scheduleInterviewReminders } = await import('../services/pushNotificationService');
      
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        await scheduleInterviewReminders(currentUser.uid);
      }
    };

    setupReminders();
  }, [events, remindersEnabled, currentUser]);

  // Check Google Calendar connection
  useEffect(() => {
    const checkCalendarConnection = async () => {
      if (currentUser) {
        try {
          const { isCalendarConnected } = await import('../services/googleCalendarService');
          const connected = await isCalendarConnected(currentUser.uid);
          setGoogleCalendarConnected(connected);
        } catch (err) {
        // Silently fail - user might not have connected Google Calendar yet
        console.log('Google Calendar not connected yet');
        setGoogleCalendarConnected(false);
        }
      }
    };
    
    checkCalendarConnection();
  }, [currentUser]);

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    
    return (
      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {weekDays.map(day => (
            <Box key={day} sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">
                {day}
              </Typography>
            </Box>
          ))}
          {days.map(day => {
            const dayEvents = events.filter(event => {
              const eventDate = event.interviewDate.date instanceof Date 
                ? event.interviewDate.date 
                : new Date(event.interviewDate.date);
              return isSameDay(eventDate, day);
            });
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <Box key={day.toISOString()} sx={{ minHeight: 100 }}>
                <Paper
                  sx={{
                    p: 1,
                    height: '100%',
                    cursor: 'pointer',
                    bgcolor: isToday ? 'primary.light' : isCurrentMonth ? 'background.paper' : 'action.hover',
                    border: isToday ? '2px solid' : '1px solid',
                    borderColor: isToday ? 'primary.main' : 'divider',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                  onClick={() => handleQuickAdd(day)}
                >
                  <Typography
                    variant="caption"
                    color={isCurrentMonth ? 'text.primary' : 'text.secondary'}
                    fontWeight={isToday ? 'bold' : 'normal'}
                  >
                    {format(day, 'd')}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {dayEvents.slice(0, 3).map(event => (
                      <Chip
                        key={event.id}
                        label={format(
                          event.interviewDate.date instanceof Date 
                            ? event.interviewDate.date 
                            : new Date(event.interviewDate.date),
                          'HH:mm',
                          { locale: it }
                        )}
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          height: 18, 
                          mb: 0.5,
                          display: 'block',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApplication(event.application);
                          setInfoDialogOpen(true);
                        }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{dayEvents.length - 3}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ 
      start: weekStart, 
      end: endOfWeek(weekStart, { weekStartsOn: 1 }) 
    });
    
    return (
      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {weekDays.map(day => {
            const dayEvents = events.filter(event => {
              const eventDate = event.interviewDate.date instanceof Date 
                ? event.interviewDate.date 
                : new Date(event.interviewDate.date);
              return isSameDay(eventDate, day);
            });
            const isToday = isSameDay(day, new Date());
            
            return (
              <Box key={day.toISOString()}>
                <Paper
                  sx={{
                    p: 2,
                    minHeight: 400,
                    bgcolor: isToday ? 'primary.light' : 'background.paper',
                    border: isToday ? '2px solid' : '1px solid',
                    borderColor: isToday ? 'primary.main' : 'divider',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    {format(day, 'EEEE d MMMM', { locale: it })}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleQuickAdd(day)}
                    sx={{ mb: 2 }}
                  >
                    {t('calendar.addInterview') || 'Aggiungi'}
                  </Button>
                  <Stack spacing={1}>
                    {dayEvents.map(event => (
                      <Card
                        key={event.id}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedApplication(event.application);
                          setInfoDialogOpen(true);
                        }}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" fontWeight="bold">
                            {format(
                              event.interviewDate.date instanceof Date 
                                ? event.interviewDate.date 
                                : new Date(event.interviewDate.date),
                              'HH:mm',
                              { locale: it }
                            )}
                          </Typography>
                          <Typography variant="body2" noWrap>
                            {event.application.jobTitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.application.company}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Paper>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayEvents = events.filter(event => {
      const eventDate = event.interviewDate.date instanceof Date 
        ? event.interviewDate.date 
        : new Date(event.interviewDate.date);
      return isSameDay(eventDate, currentDate);
    });
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <Box>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {format(currentDate, 'EEEE d MMMM yyyy', { locale: it })}
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleQuickAdd(currentDate)}
            >
              {t('calendar.addInterview') || 'Aggiungi colloquio'}
            </Button>
          </Box>
          <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
            {hours.map(hour => {
              const hourEvents = dayEvents.filter(event => {
                const eventDate = event.interviewDate.date instanceof Date 
                  ? event.interviewDate.date 
                  : new Date(event.interviewDate.date);
                return eventDate.getHours() === hour;
              });
              
              return (
                <Box key={hour} sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="caption" sx={{ minWidth: 60, textAlign: 'right' }}>
                      {hour.toString().padStart(2, '0')}:00
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      {hourEvents.map(event => (
                        <Card
                          key={event.id}
                          sx={{ mb: 1, cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedApplication(event.application);
                            setInfoDialogOpen(true);
                          }}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="body2" fontWeight="bold">
                              {format(
                                event.interviewDate.date instanceof Date 
                                  ? event.interviewDate.date 
                                  : new Date(event.interviewDate.date),
                                'HH:mm',
                                { locale: it }
                              )} - {event.application.jobTitle}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {event.application.company}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Box>
    );
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
          <CalendarIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              {t('calendar.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {futureInterviewsCount} {t('calendar.subtitle')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleSyncGoogleCalendar}
          >
            {googleCalendarConnected 
              ? (t('calendar.syncGoogleCalendar') || 'Sincronizza Google Calendar')
              : (t('calendar.connectGoogleCalendar') || 'Connetti Google Calendar')
            }
          </Button>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/applications')}
          >
            {t('calendar.backToApplications')}
          </Button>
        </Box>
      </Box>

      {/* View Mode Toggle and Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="month">
            <ViewMonthIcon sx={{ mr: 1 }} />
            {t('calendar.viewMonth') || 'Mese'}
          </ToggleButton>
          <ToggleButton value="week">
            <ViewWeekIcon sx={{ mr: 1 }} />
            {t('calendar.viewWeek') || 'Settimana'}
          </ToggleButton>
          <ToggleButton value="day">
            <TodayIcon sx={{ mr: 1 }} />
            {t('calendar.viewDay') || 'Giorno'}
          </ToggleButton>
          <ToggleButton value="list">
            <CalendarIcon sx={{ mr: 1 }} />
            {t('calendar.viewList') || 'Lista'}
          </ToggleButton>
        </ToggleButtonGroup>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <ButtonGroup size="small">
            <Button onClick={handlePrevious}>
              <ChevronLeft />
            </Button>
            <Button onClick={handleToday}>
              {viewMode === 'month' 
                ? format(currentDate, 'MMMM yyyy', { locale: it })
                : viewMode === 'week'
                ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: it })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: it })}`
                : format(currentDate, 'd MMMM yyyy', { locale: it })
              }
            </Button>
            <Button onClick={handleNext}>
              <ChevronRight />
            </Button>
          </ButtonGroup>
        </Box>
      </Box>

      {/* Reminders Toggle */}
      <Box sx={{ mb: 2 }}>
        <Alert 
          severity="info" 
          icon={<NotificationsIcon />}
          action={
            <Button
              size="small"
              onClick={() => {
                if ('Notification' in window && Notification.permission !== 'granted') {
                  Notification.requestPermission();
                }
                setRemindersEnabled(!remindersEnabled);
              }}
            >
              {remindersEnabled ? t('calendar.disableReminders') || 'Disattiva' : t('calendar.enableReminders') || 'Attiva'}
            </Button>
          }
        >
          {t('calendar.remindersInfo') || 'Riceverai notifiche 1 giorno prima e 1 ora prima di ogni colloquio'}
        </Alert>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {viewMode === 'list' && (
        <>
          {viewEvents.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                backgroundColor: 'background.paper',
                borderRadius: 2,
              }}
            >
              <CalendarIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('calendar.noInterviews')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('calendar.interviewsWillAppear')}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {viewEvents.map((event) => {
                const eventDate = event.interviewDate.date instanceof Date 
                  ? event.interviewDate.date 
                  : new Date(event.interviewDate.date);
                const isPast = isPastDate(eventDate);
                
                return (
                  <Card 
                key={event.id} 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: isPast ? 0.6 : 1,
                  backgroundColor: isPast ? 'action.hover' : 'background.paper',
                  borderLeft: isPast ? '4px solid #bdbdbd' : '4px solid transparent',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                    opacity: isPast ? 0.7 : 1,
                  },
                }}
                onClick={() => {
                  setSelectedApplication(event.application);
                  setInfoDialogOpen(true);
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {event.application.jobTitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>{event.application.company}</strong>
                    </Typography>
                    {event.application.location && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {event.application.location}
                          {event.application.isRemote && ' (Remote)'}
                        </Typography>
                      </Box>
                    )}
                    </Box>
                    <Chip
                      label={getInterviewTypeLabel(event.interviewDate.type)}
                      color={getInterviewTypeColor(event.interviewDate.type) as any}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Chip
                      icon={<CalendarIcon sx={{ fontSize: 16 }} />}
                      label={format(
                        event.interviewDate.date instanceof Date 
                          ? event.interviewDate.date 
                          : new Date(event.interviewDate.date), 
                        'dd MMMM yyyy • HH:mm', 
                        { locale: it }
                      )}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  {event.interviewDate.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                      📝 {event.interviewDate.notes}
                    </Typography>
                  )}

                  {isPast && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #ccc' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        ⏱️ Colloquio passato
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
                );
              })}
            </Stack>
          )}
        </>
      )}

      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}

      {/* Quick Add Interview Dialog */}
      <Dialog open={quickAddDialogOpen} onClose={() => setQuickAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('calendar.addInterview') || 'Aggiungi Colloquio'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label={t('calendar.date') || 'Data'}
              type="date"
              value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label={t('calendar.time') || 'Ora'}
              type="time"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label={t('calendar.type') || 'Tipo Colloquio'}
              select
              SelectProps={{ native: true }}
            >
              <option value="interview_1">{t('calendar.interviewRecruiter') || 'Colloquio Recruiter'}</option>
              <option value="interview_2">{t('calendar.interviewManager') || 'Colloquio Manager'}</option>
              <option value="interview_3">{t('calendar.interviewTechnical') || 'Colloquio Tecnico'}</option>
              <option value="interview_4">{t('calendar.interviewPanel') || 'Colloquio Panel'}</option>
            </TextField>
            <TextField
              fullWidth
              label={t('calendar.notes') || 'Note (opzionale)'}
              multiline
              rows={3}
            />
            <Alert severity="info">
              {t('calendar.quickAddInfo') || 'Seleziona una candidatura esistente o creane una nuova dalla pagina Candidature'}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickAddDialogOpen(false)}>
            {t('common.cancel') || 'Annulla'}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              // TODO: Implement quick add interview
              setQuickAddDialogOpen(false);
              navigate('/applications');
            }}
          >
            {t('calendar.goToApplications') || 'Vai a Candidature'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Application Info Dialog */}
      <ApplicationFormDialog
        open={infoDialogOpen}
        onClose={() => {
          setInfoDialogOpen(false);
          setSelectedApplication(null);
        }}
        onSubmit={(_data: ApplicationFormData) => {
          // Close dialog without doing anything (view-only mode)
          setInfoDialogOpen(false);
          setSelectedApplication(null);
        }}
        application={selectedApplication}
        viewOnly={true}
        onOpenCompanyResearch={() => {}}
        onOpenJobAnalyzer={() => {}}
      />
    </Box>
  );
};

export default Calendar;

