import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';
import type { JobSource } from '../types';

interface SourceBarChartProps {
  data: Record<JobSource, number>;
}

const SOURCE_LABELS: Record<JobSource, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  glassdoor: 'Glassdoor',
  company_website: 'Sito Aziendale',
  referral: 'Referral',
  recruiter: 'Recruiter',
  email: 'Email',
  other: 'Altro',
};

const SourceBarChart: React.FC<SourceBarChartProps> = React.memo(({ data }) => {
  const { t } = useTranslation();
  
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: SOURCE_LABELS[key as JobSource],
      count: value,
    }))
    .sort((a, b) => b.count - a.count);

  if (chartData.length === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          {t('analytics.applicationsBySource')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <Typography color="text.secondary">Nessun dato disponibile</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {t('analytics.applicationsBySource')}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#1976d2" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
});

SourceBarChart.displayName = 'SourceBarChart';

export default SourceBarChart;

