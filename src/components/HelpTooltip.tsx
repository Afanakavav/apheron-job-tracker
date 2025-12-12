import React from 'react';
import { Tooltip, IconButton, Box } from '@mui/material';
import { HelpOutline } from '@mui/icons-material';

interface HelpTooltipProps {
  title: string;
  content?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'small' | 'medium';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  content,
  placement = 'top',
  size = 'small',
}) => {
  const tooltipContent = content ? `${title}\n\n${content}` : title;

  return (
    <Tooltip
      title={
        <Box sx={{ whiteSpace: 'pre-line', fontSize: '0.875rem' }}>
          {tooltipContent}
        </Box>
      }
      placement={placement}
      arrow
    >
      <IconButton size={size} sx={{ p: 0.5 }}>
        <HelpOutline fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

