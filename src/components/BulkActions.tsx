import React from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import {
  MoreVert,
  Delete,
  Archive,
  FileDownload,
  ChangeCircle,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import type { Application } from '../types';

interface BulkActionsProps {
  selectedIds: string[];
  applications: Application[];
  onDelete: (ids: string[]) => void;
  onArchive: (ids: string[]) => void;
  onStatusChange: (ids: string[], status: Application['status']) => void;
  onExport: (ids: string[]) => void;
  onClearSelection: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedIds,
  // applications,
  onDelete,
  onArchive,
  onStatusChange,
  onExport,
  onClearSelection,
}) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  if (selectedIds.length === 0) {
    return null;
  }

  // const selectedApplications = applications.filter(app => selectedIds.includes(app.id));

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = () => {
    onDelete(selectedIds);
    handleClose();
    onClearSelection();
  };

  const handleArchive = () => {
    onArchive(selectedIds);
    handleClose();
    onClearSelection();
  };

  const handleStatusChange = (status: Application['status']) => {
    onStatusChange(selectedIds, status);
    handleClose();
    onClearSelection();
  };

  const handleExport = () => {
    onExport(selectedIds);
    handleClose();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        bgcolor: 'background.paper',
        boxShadow: 3,
        borderRadius: 2,
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Chip
        label={`${selectedIds.length} selezionate`}
        color="primary"
        size="small"
      />
      
      <Divider orientation="vertical" flexItem />

      <Button
        size="small"
        variant="outlined"
        onClick={onClearSelection}
      >
        {t('common.deselectAll') || 'Deseleziona'}
      </Button>

      <Button
        size="small"
        variant="contained"
        startIcon={<MoreVert />}
        onClick={handleClick}
      >
        {t('common.actions') || 'Azioni'}
      </Button>

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
        <MenuItem onClick={handleExport}>
          <ListItemIcon>
            <FileDownload fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('common.export') || 'Esporta'}</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={() => handleStatusChange('applied')}>
          <ListItemIcon>
            <ChangeCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('applications.status.applied') || 'Imposta come: Candidato'}</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleStatusChange('interview_1')}>
          <ListItemIcon>
            <ChangeCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('applications.status.interview') || 'Imposta come: Colloquio'}</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleStatusChange('offer')}>
          <ListItemIcon>
            <ChangeCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('applications.status.offer') || 'Imposta come: Offerta'}</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleArchive}>
          <ListItemIcon>
            <Archive fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('common.archive') || 'Archivia'}</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>{t('common.delete') || 'Elimina'}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

