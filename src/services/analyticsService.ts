import type { Application, ApplicationStatus, JobSource, Analytics } from '../types';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, differenceInDays } from 'date-fns';

/**
 * Helper function to safely convert various date formats to Date object
 * Handles Firestore Timestamps, Date objects, strings, and numbers
 */
const toDate = (value: any): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  // Handle Firestore Timestamp
  if (value.toDate && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch (e) {
      console.warn('Error converting Firestore Timestamp to date:', e);
      return undefined;
    }
  }
  // Handle string or number
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
};

export const calculateAnalytics = (applications: Application[]): Analytics => {
  const totalApplications = applications.length;

  // Count by status
  const applicationsByStatus: Record<ApplicationStatus, number> = {
    saved: 0,
    applied: 0,
    interview_1: 0,
    interview_2: 0,
    interview_3: 0,
    interview_4: 0,
    offer: 0,
    rejected: 0,
  };

  applications.forEach((app) => {
    if (applicationsByStatus[app.status] !== undefined) {
      applicationsByStatus[app.status]++;
    }
  });

  // Count by source
  const applicationsBySource: Record<JobSource, number> = {
    linkedin: 0,
    indeed: 0,
    glassdoor: 0,
    company_website: 0,
    referral: 0,
    recruiter: 0,
    email: 0,
    other: 0,
  };

  applications.forEach((app) => {
    if (applicationsBySource[app.source] !== undefined) {
      applicationsBySource[app.source]++;
    }
  });

  // Calculate average response time (from applied to first response)
  const responseTimes: number[] = [];
  applications.forEach((app) => {
    if (app.appliedDate && app.responseDate) {
      const appliedDate = toDate(app.appliedDate);
      const responseDate = toDate(app.responseDate);
      if (appliedDate && responseDate) {
        const days = differenceInDays(responseDate, appliedDate);
        responseTimes.push(days);
      }
    }
  });
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;

  // Calculate conversion rates
  const appliedCount = applicationsByStatus.applied + 
                       applicationsByStatus.interview_1 +
                       applicationsByStatus.interview_2 +
                       applicationsByStatus.interview_3 +
                       applicationsByStatus.interview_4 +
                       applicationsByStatus.offer;
  
  const interviewCount = applicationsByStatus.interview_1 +
                         applicationsByStatus.interview_2 +
                         applicationsByStatus.interview_3 +
                         applicationsByStatus.interview_4 +
                         applicationsByStatus.offer;
  
  const offerCount = applicationsByStatus.offer;

  const appliedToInterview = appliedCount > 0 ? (interviewCount / appliedCount) * 100 : 0;
  const interviewToOffer = interviewCount > 0 ? (offerCount / interviewCount) * 100 : 0;

  // Count this week's applications
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekApplications = applications.filter((app) => {
    if (!app.createdAt) return false;
    const createdDate = toDate(app.createdAt);
    if (!createdDate) return false;
    return createdDate >= weekStart && createdDate <= weekEnd;
  }).length;

  // Count this month's applications
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisMonthApplications = applications.filter((app) => {
    if (!app.createdAt) return false;
    const createdDate = toDate(app.createdAt);
    if (!createdDate) return false;
    return createdDate >= monthStart && createdDate <= monthEnd;
  }).length;

  return {
    totalApplications,
    applicationsByStatus,
    applicationsBySource,
    averageResponseTime,
    conversionRate: {
      appliedToInterview,
      interviewToOffer,
    },
    thisWeekApplications,
    thisMonthApplications,
  };
};

// Get applications grouped by week for trend chart
export const getApplicationsByWeek = (applications: Application[], weeksBack: number = 8) => {
  const now = new Date();
  const weeks: { week: string; count: number }[] = [];

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = startOfWeek(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const count = applications.filter((app) => {
      if (!app.createdAt) return false;
      const createdDate = toDate(app.createdAt);
      if (!createdDate) return false;
      return createdDate >= weekStart && createdDate <= weekEnd;
    }).length;

    weeks.push({
      week: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
      count,
    });
  }

  return weeks;
};

// Get top companies by application count
export const getTopCompaniesByApplications = (applications: Application[], limit: number = 5) => {
  const companyCounts: Record<string, number> = {};

  applications.forEach((app) => {
    if (app.company) {
      companyCounts[app.company] = (companyCounts[app.company] || 0) + 1;
    }
  });

  const sorted = Object.entries(companyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([company, count]) => ({ company, count }));

  return sorted;
};

// Get applications by priority
export const getApplicationsByPriority = (applications: Application[]) => {
  const priorities = {
    high: 0,
    medium: 0,
    low: 0,
  };

  applications.forEach((app) => {
    priorities[app.priority]++;
  });

  return [
    { name: 'Alta', value: priorities.high, color: '#f44336' },
    { name: 'Media', value: priorities.medium, color: '#ff9800' },
    { name: 'Bassa', value: priorities.low, color: '#2196f3' },
  ];
};

// Get upcoming interviews (only future dates)
export const getUpcomingInterviews = (applications: Application[]) => {
  const now = new Date();
  
  // Filtra applicazioni con colloqui programmati in FUTURO
  const appsWithUpcomingInterviews = applications
    .filter((app) => {
      // Controlla se ci sono date di colloqui
      if (!app.interviewDates || app.interviewDates.length === 0) return false;
      
      // Controlla se almeno una data è FUTURA (non passata)
      return app.interviewDates.some(interview => {
        const interviewDate = toDate(interview.date);
        if (!interviewDate) return false;
        return interviewDate > now; // Changed from >= to > to exclude current time
      });
    })
    .map((app) => {
      // Trova la prima data di colloquio FUTURA
      const nextInterview = app.interviewDates!
        .map(interview => {
          const date = toDate(interview.date);
          if (!date) return null;
          return {
            ...interview,
            date
          };
        })
        .filter((interview): interview is NonNullable<typeof interview> => 
          interview !== null && interview.date > now
        ) // Only future dates
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
      
      if (!nextInterview) return null;
      
      return {
        ...app,
        nextInterviewDate: nextInterview.date,
        nextInterviewType: nextInterview.type,
        nextInterviewNotes: nextInterview.notes,
      };
    })
    .filter((app): app is NonNullable<typeof app> => app !== null)
    .sort((a, b) => a.nextInterviewDate.getTime() - b.nextInterviewDate.getTime())
    .slice(0, 5); // Show only next 5 upcoming interviews
  
  return appsWithUpcomingInterviews;
};

// Calculate automatic insights based on data
export interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
}

export const calculateInsights = (applications: Application[], analytics: Analytics): Insight[] => {
  const insights: Insight[] = [];
  
  // Calculate response rate
  const appliedCount = analytics.applicationsByStatus.applied + 
                       analytics.applicationsByStatus.interview_1 +
                       analytics.applicationsByStatus.interview_2 +
                       analytics.applicationsByStatus.interview_3 +
                       analytics.applicationsByStatus.interview_4 +
                       analytics.applicationsByStatus.offer;
  
  const respondedCount = applications.filter(app => 
    app.status !== 'saved' && app.status !== 'applied' && app.appliedDate
  ).length;
  
  const responseRate = appliedCount > 0 ? (respondedCount / appliedCount) * 100 : 0;
  
  // Insight: Response rate
  if (responseRate < 20 && appliedCount >= 5) {
    insights.push({
      type: 'warning',
      title: `Il tuo tasso di risposta è ${responseRate.toFixed(0)}%`,
      message: 'Prova a personalizzare di più le cover letter per aumentare le risposte',
      action: 'Migliora le cover letter',
    });
  } else if (responseRate >= 30 && appliedCount >= 5) {
    insights.push({
      type: 'success',
      title: `Ottimo tasso di risposta: ${responseRate.toFixed(0)}%`,
      message: 'Continua così! Le tue candidature stanno funzionando bene',
    });
  }
  
  // Calculate best day of week for applications
  const dayStats: Record<number, { count: number; responses: number }> = {};
  applications.forEach(app => {
    if (app.appliedDate) {
      const date = toDate(app.appliedDate);
      if (!date) return;
      const dayOfWeek = date.getDay();
      if (!dayStats[dayOfWeek]) {
        dayStats[dayOfWeek] = { count: 0, responses: 0 };
      }
      dayStats[dayOfWeek].count++;
      if (app.status !== 'saved' && app.status !== 'applied') {
        dayStats[dayOfWeek].responses++;
      }
    }
  });
  
  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  let bestDay: { day: number; rate: number } | null = null;
  
  Object.entries(dayStats).forEach(([day, stats]) => {
    const rate = stats.count > 0 ? (stats.responses / stats.count) * 100 : 0;
    if (!bestDay || rate > bestDay.rate) {
      bestDay = { day: parseInt(day), rate };
    }
  });
  
  // Insight: Best day
  if (bestDay !== null) {
    const currentBestDay: { day: number; rate: number } = bestDay;
    if (currentBestDay.rate > 0) {
      const dayStat = dayStats[currentBestDay.day];
      if (dayStat && dayStat.count >= 3) {
        const avgRate = Object.values(dayStats).reduce((sum, s) => {
          const rate = s.count > 0 ? (s.responses / s.count) * 100 : 0;
          return sum + rate;
        }, 0) / Object.keys(dayStats).length;
        
        if (currentBestDay.rate > avgRate * 1.2) {
          const improvement = ((currentBestDay.rate - avgRate) / avgRate * 100).toFixed(0);
          insights.push({
            type: 'info',
            title: `Le candidature inviate il ${dayNames[currentBestDay.day]} hanno ${improvement}% più risposta`,
            message: `Considera di inviare più candidature di ${dayNames[currentBestDay.day]}`,
          });
        }
      }
    }
  }
  
  // Insight: Cover letter usage
  const appsWithCoverLetter = applications.filter(app => app.coverLetterId).length;
  const coverLetterRate = applications.length > 0 ? (appsWithCoverLetter / applications.length) * 100 : 0;
  
  if (coverLetterRate < 50 && appliedCount >= 5) {
    insights.push({
      type: 'warning',
      title: `Solo ${coverLetterRate.toFixed(0)}% delle candidature ha una cover letter`,
      message: 'Le cover letter personalizzate aumentano significativamente il tasso di risposta',
      action: 'Aggiungi cover letter',
    });
  }
  
  // Insight: Follow-up rate
  const appsNeedingFollowUp = getApplicationsNeedingFollowUp(applications).length;
  if (appsNeedingFollowUp > 0 && appliedCount >= 5) {
    insights.push({
      type: 'info',
      title: `${appsNeedingFollowUp} candidature necessitano di follow-up`,
      message: 'I follow-up tempestivi aumentano le possibilità di ottenere una risposta',
      action: 'Vai ai follow-up',
    });
  }
  
  return insights;
};

// Compare current month vs previous month
export interface MonthComparison {
  currentMonth: {
    applications: number;
    interviews: number;
    offers: number;
    responseRate: number;
  };
  previousMonth: {
    applications: number;
    interviews: number;
    offers: number;
    responseRate: number;
  };
  changes: {
    applications: number; // percentage change
    interviews: number;
    offers: number;
    responseRate: number;
  };
}

export const compareMonths = (applications: Application[]): MonthComparison => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  
  const currentMonthApps = applications.filter(app => {
    if (!app.createdAt) return false;
    const date = toDate(app.createdAt);
    if (!date) return false;
    return date >= currentMonthStart && date <= currentMonthEnd;
  });
  
  const previousMonthApps = applications.filter(app => {
    if (!app.createdAt) return false;
    const date = toDate(app.createdAt);
    if (!date) return false;
    return date >= previousMonthStart && date <= previousMonthEnd;
  });
  
  const getMonthStats = (apps: Application[]) => {
    const applied = apps.filter(app => 
      app.status === 'applied' || 
      app.status === 'interview_1' ||
      app.status === 'interview_2' ||
      app.status === 'interview_3' ||
      app.status === 'interview_4' ||
      app.status === 'offer'
    ).length;
    
    const interviews = apps.filter(app => 
      app.status === 'interview_1' ||
      app.status === 'interview_2' ||
      app.status === 'interview_3' ||
      app.status === 'interview_4' ||
      app.status === 'offer'
    ).length;
    
    const offers = apps.filter(app => app.status === 'offer').length;
    
    const responded = apps.filter(app => 
      app.status !== 'saved' && app.status !== 'applied' && app.appliedDate
    ).length;
    
    const responseRate = applied > 0 ? (responded / applied) * 100 : 0;
    
    return { applications: apps.length, interviews, offers, responseRate };
  };
  
  const current = getMonthStats(currentMonthApps);
  const previous = getMonthStats(previousMonthApps);
  
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  return {
    currentMonth: current,
    previousMonth: previous,
    changes: {
      applications: calculateChange(current.applications, previous.applications),
      interviews: calculateChange(current.interviews, previous.interviews),
      offers: calculateChange(current.offers, previous.offers),
      responseRate: calculateChange(current.responseRate, previous.responseRate),
    },
  };
};

// Get applications needing follow-up
export const getApplicationsNeedingFollowUp = (applications: Application[], daysThreshold: number = 7) => {
  const now = new Date();
  
  return applications
    .filter((app) => {
      // Skip saved and rejected applications
      if (app.status === 'saved' || app.status === 'rejected') {
        return false;
      }

      // NEW: Check if user has enabled manual follow-up
      if (app.followUpEnabled && app.nextFollowUpDate) {
        const followUpDate = toDate(app.nextFollowUpDate);
        if (!followUpDate) return false;
        // Show if follow-up date is today or in the past
        return followUpDate <= now;
      }

      // LEGACY: Automatic follow-up based on appliedDate
      if (!app.appliedDate) return false;

      const appliedDate = toDate(app.appliedDate);
      if (!appliedDate) return false;

      const daysSinceApplied = differenceInDays(now, appliedDate);
      const lastFollowUpDate = app.lastFollowUpDate ? toDate(app.lastFollowUpDate) : null;
      const daysSinceLastFollowUp = lastFollowUpDate 
        ? differenceInDays(now, lastFollowUpDate)
        : daysSinceApplied;

      return daysSinceLastFollowUp >= daysThreshold;
    })
    .sort((a, b) => {
      // Sort by follow-up date if enabled, otherwise by last follow-up or applied date
      const dateA = a.followUpEnabled && a.nextFollowUpDate 
        ? toDate(a.nextFollowUpDate)
        : toDate(a.lastFollowUpDate) || toDate(a.appliedDate) || new Date();
      const dateB = b.followUpEnabled && b.nextFollowUpDate
        ? toDate(b.nextFollowUpDate)
        : toDate(b.lastFollowUpDate) || toDate(b.appliedDate) || new Date();
      
      // Ensure both are Date objects
      const dateAValue = dateA instanceof Date ? dateA : new Date();
      const dateBValue = dateB instanceof Date ? dateB : new Date();
      
      return dateAValue.getTime() - dateBValue.getTime();
    })
    .slice(0, 10);
};

