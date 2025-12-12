import React from 'react';
import { Box, Paper, IconButton, Typography } from '@mui/material';
import { DragIndicator, Close } from '@mui/icons-material';

export interface WidgetConfig {
  id: string;
  type: 'statistics' | 'chart' | 'list' | 'calendar';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  enabled?: boolean;
  config?: Record<string, any>;
}

interface WidgetContainerProps {
  widget: WidgetConfig;
  onRemove?: (id: string) => void;
  children: React.ReactNode;
  isDragging?: boolean;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  onRemove,
  children,
  isDragging = false,
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.7 : 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} className="drag-handle">
          <DragIndicator sx={{ color: 'text.secondary', cursor: 'grab' }} />
          <Typography variant="subtitle2" fontWeight="bold">
            {widget.title}
          </Typography>
        </Box>
        {onRemove && (
          <IconButton
            size="small"
            onClick={() => onRemove(widget.id)}
            sx={{ ml: 'auto' }}
          >
            <Close fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {children}
      </Box>
    </Paper>
  );
};

