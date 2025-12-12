import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';
import type { ApplicationStatus } from '../types';

interface StatusPieChartProps {
  data: Record<ApplicationStatus, number>;
  onStatusClick?: (status: ApplicationStatus) => void;
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  saved: '#9e9e9e',
  applied: '#2196f3',
  interview_1: '#ff9800',
  interview_2: '#9c27b0',
  interview_3: '#673ab7',
  interview_4: '#00bcd4',
  offer: '#4caf50',
  rejected: '#f44336',
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Da candidarsi',
  applied: 'Candidatura Inviata',
  interview_1: 'Colloquio Recruiter',
  interview_2: 'Colloquio Manager',
  interview_3: 'Colloquio Tecnico',
  interview_4: 'Colloquio Panel',
  offer: 'Offerta Ricevuta',
  rejected: 'Eliminata',
};

const StatusPieChart: React.FC<StatusPieChartProps> = React.memo(({ data, onStatusClick }) => {
  const { t } = useTranslation();
  
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key as ApplicationStatus],
      value,
      color: STATUS_COLORS[key as ApplicationStatus],
      status: key as ApplicationStatus,
    }));

  if (chartData.length === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          {t('analytics.applicationsByStatus')}
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
        {t('analytics.applicationsByStatus')}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            onClick={(data: any) => {
              if (onStatusClick && data?.status) {
                onStatusClick(data.status);
              }
            }}
            style={{ cursor: onStatusClick ? 'pointer' : 'default' }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend 
            onClick={(data: any) => {
              if (onStatusClick && data?.payload?.status) {
                onStatusClick(data.payload.status);
              }
            }}
            style={{ cursor: onStatusClick ? 'pointer' : 'default' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
});

StatusPieChart.displayName = 'StatusPieChart';

export default StatusPieChart;

