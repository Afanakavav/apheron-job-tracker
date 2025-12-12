import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';

interface TrendLineChartProps {
  data: { week: string; count: number }[];
}

const TrendLineChart: React.FC<TrendLineChartProps> = React.memo(({ data }) => {
  const { t } = useTranslation();
  
  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          {t('analytics.applicationsTrend')}
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
        {t('analytics.applicationsTrend')}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#2196f3" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
});

TrendLineChart.displayName = 'TrendLineChart';

export default TrendLineChart;

