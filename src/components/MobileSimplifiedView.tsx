import React from 'react';
import { Box, Typography, Card, CardContent, Chip, Stack } from '@mui/material';
import { useMobile } from '../hooks/useMobile';
import type { Application } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface MobileSimplifiedViewProps {
  application: Application;
  onClick: () => void;
}

/**
 * Simplified view for mobile - shows only essential information
 */
export const MobileSimplifiedView: React.FC<MobileSimplifiedViewProps> = ({ application, onClick }) => {
  const isMobile = useMobile();

  if (!isMobile) {
    return null; // Don't render on desktop
  }

  return (
    <Card
      sx={{
        mb: 1.5,
        cursor: 'pointer',
        '&:active': {
          transform: 'scale(0.98)',
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {application.jobTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {application.company}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={application.status}
              size="small"
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
            {application.priority === 'high' && (
              <Chip
                label="Alta"
                size="small"
                color="error"
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
            )}
            {application.appliedDate && (
              <Chip
                label={format(new Date(application.appliedDate), 'dd/MM', { locale: it })}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

