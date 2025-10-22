import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Paper, Typography, Box } from '@mui/material';
import type { ApplicationStatus } from '../types';

interface StatusPieChartProps {
  data: Record<ApplicationStatus, number>;
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  saved: '#9e9e9e',
  applied: '#2196f3',
  phone_screen: '#ff9800',
  interview: '#9c27b0',
  technical: '#673ab7',
  offer: '#4caf50',
  rejected: '#f44336',
  withdrawn: '#757575',
  archived: '#bdbdbd',
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Salvate',
  applied: 'Candidate',
  phone_screen: 'Tel. Screen',
  interview: 'Colloquio',
  technical: 'Tecnico',
  offer: 'Offerta',
  rejected: 'Rifiutato',
  withdrawn: 'Ritirate',
  archived: 'Archiviate',
};

const StatusPieChart: React.FC<StatusPieChartProps> = ({ data }) => {
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key as ApplicationStatus],
      value,
      color: STATUS_COLORS[key as ApplicationStatus],
    }));

  if (chartData.length === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          Candidature per Stato
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
        Candidature per Stato
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default StatusPieChart;

