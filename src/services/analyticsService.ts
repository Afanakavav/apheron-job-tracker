import type { Application, ApplicationStatus, JobSource, Analytics } from '../types';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, differenceInDays } from 'date-fns';

export const calculateAnalytics = (applications: Application[]): Analytics => {
  const totalApplications = applications.length;

  // Count by status
  const applicationsByStatus: Record<ApplicationStatus, number> = {
    saved: 0,
    applied: 0,
    phone_screen: 0,
    interview: 0,
    technical: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0,
    archived: 0,
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
      const days = differenceInDays(app.responseDate, app.appliedDate);
      responseTimes.push(days);
    }
  });
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;

  // Calculate conversion rates
  const appliedCount = applicationsByStatus.applied + 
                       applicationsByStatus.phone_screen +
                       applicationsByStatus.interview +
                       applicationsByStatus.technical +
                       applicationsByStatus.offer;
  
  const interviewCount = applicationsByStatus.interview +
                         applicationsByStatus.technical +
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
    const createdDate = new Date(app.createdAt);
    return createdDate >= weekStart && createdDate <= weekEnd;
  }).length;

  // Count this month's applications
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisMonthApplications = applications.filter((app) => {
    if (!app.createdAt) return false;
    const createdDate = new Date(app.createdAt);
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
      const createdDate = new Date(app.createdAt);
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

// Get upcoming interviews
export const getUpcomingInterviews = (applications: Application[]) => {
  const now = new Date();
  
  return applications
    .filter((app) => {
      if (!app.interviewDate) return false;
      const interviewDate = new Date(app.interviewDate);
      return interviewDate >= now;
    })
    .sort((a, b) => {
      const dateA = a.interviewDate ? new Date(a.interviewDate).getTime() : 0;
      const dateB = b.interviewDate ? new Date(b.interviewDate).getTime() : 0;
      return dateA - dateB;
    })
    .slice(0, 5);
};

// Get applications needing follow-up
export const getApplicationsNeedingFollowUp = (applications: Application[], daysThreshold: number = 7) => {
  const now = new Date();
  
  return applications
    .filter((app) => {
      // Only consider applied applications without response
      if (app.status === 'saved' || app.status === 'rejected' || app.status === 'withdrawn') {
        return false;
      }

      if (!app.appliedDate) return false;

      const daysSinceApplied = differenceInDays(now, app.appliedDate);
      const daysSinceLastFollowUp = app.lastFollowUpDate 
        ? differenceInDays(now, app.lastFollowUpDate)
        : daysSinceApplied;

      return daysSinceLastFollowUp >= daysThreshold;
    })
    .sort((a, b) => {
      const dateA = a.lastFollowUpDate || a.appliedDate || new Date();
      const dateB = b.lastFollowUpDate || b.appliedDate || new Date();
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    })
    .slice(0, 10);
};

