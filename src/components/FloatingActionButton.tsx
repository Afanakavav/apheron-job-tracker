import React, { useState } from 'react';
import { Fab, Menu, MenuItem, Tooltip, Box } from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon,
  Description as DescriptionIcon,
  Work as WorkIcon,
  Psychology as PsychologyIcon,
  CalendarMonth as CalendarIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';

interface FloatingActionButtonProps {
  onNewApplication?: () => void;
  onQuickApplication?: () => void;
  onNewEmail?: () => void;
  onNewCV?: () => void;
  onAIAssistant?: () => void;
  onCalendar?: () => void;
  onArchived?: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onNewApplication,
  onQuickApplication,
  onNewEmail,
  onNewCV,
  onAIAssistant,
  onCalendar,
  onArchived,
}) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (action?: () => void) => {
    if (action) {
      action();
    }
    handleClose();
  };

  return (
    <>
      <Tooltip title={t('common.quickActions') || 'Azioni Rapide'}>
        <Fab
          color="primary"
          aria-label="quick actions"
          onClick={handleClick}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        {onQuickApplication && (
          <MenuItem onClick={() => handleMenuItemClick(onQuickApplication)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WorkIcon fontSize="small" />
              {t('dashboard.quickApplication') || 'Nuova Candidatura Rapida'}
            </Box>
          </MenuItem>
        )}
        {onNewApplication && (
          <MenuItem onClick={() => handleMenuItemClick(onNewApplication)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WorkIcon fontSize="small" />
              {t('applications.newApplication') || 'Nuova Candidatura'}
            </Box>
          </MenuItem>
        )}
        {onNewEmail && (
          <MenuItem onClick={() => handleMenuItemClick(onNewEmail)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon fontSize="small" />
              {t('common.newEmail') || 'Nuova Email'}
            </Box>
          </MenuItem>
        )}
        {onNewCV && (
          <MenuItem onClick={() => handleMenuItemClick(onNewCV)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DescriptionIcon fontSize="small" />
              {t('common.newCV') || 'Nuovo CV'}
            </Box>
          </MenuItem>
        )}
        {onAIAssistant && (
          <MenuItem onClick={() => handleMenuItemClick(onAIAssistant)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PsychologyIcon fontSize="small" />
              {t('nav.aiAssistant') || 'Assistente AI'}
            </Box>
          </MenuItem>
        )}
        {onCalendar && (
          <MenuItem onClick={() => handleMenuItemClick(onCalendar)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon fontSize="small" />
              {t('applications.calendar') || 'Calendario'}
            </Box>
          </MenuItem>
        )}
        {onArchived && (
          <MenuItem onClick={() => handleMenuItemClick(onArchived)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArchiveIcon fontSize="small" />
              {t('applications.archived') || 'Storico'}
            </Box>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default React.memo(FloatingActionButton);

