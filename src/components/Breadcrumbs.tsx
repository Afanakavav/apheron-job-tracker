import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box } from '@mui/material';
import { Home, NavigateNext } from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const routeLabels: Record<string, string> = {
  dashboard: 'nav.dashboard',
  applications: 'nav.applications',
  networking: 'nav.networking',
  'cv-manager': 'nav.cvManager',
  analytics: 'nav.analytics',
  calendar: 'applications.calendar',
  'ai-assistant': 'nav.aiAssistant',
  gmail: 'nav.gmailIntegration',
  'job-search': 'nav.jobSearch',
  settings: 'nav.settings',
  archived: 'applications.archived',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Don't show breadcrumbs on login page
  if (location.pathname === '/login' || location.pathname === '/') {
    return null;
  }

  const pathnames = location.pathname.split('/').filter((x) => x);
  
  const breadcrumbs: BreadcrumbItem[] = [
    { label: t('nav.dashboard'), path: '/dashboard' },
  ];

  // Build breadcrumbs from path
  let currentPath = '';
  pathnames.forEach((pathname) => {
    currentPath += `/${pathname}`;
    const label = routeLabels[pathname] || pathname;
    breadcrumbs.push({
      label: t(label) || pathname,
      path: currentPath,
    });
  });

  return (
    <Box sx={{ mb: 2, mt: 1 }}>
      <MuiBreadcrumbs
        separator={<NavigateNext fontSize="small" />}
        aria-label="breadcrumb"
      >
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/dashboard')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
            cursor: 'pointer',
          }}
        >
          <Home fontSize="small" />
          {t('nav.dashboard')}
        </Link>
        {breadcrumbs.slice(1).map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 2;
          return isLast ? (
            <Typography key={breadcrumb.path} variant="body2" color="text.primary">
              {breadcrumb.label}
            </Typography>
          ) : (
            <Link
              key={breadcrumb.path}
              component="button"
              variant="body2"
              onClick={() => navigate(breadcrumb.path)}
              sx={{
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
                cursor: 'pointer',
              }}
            >
              {breadcrumb.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

