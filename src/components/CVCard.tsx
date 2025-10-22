import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Button,
} from '@mui/material';
import {
  Description,
  MoreVert,
  Download,
  Visibility,
  Edit,
  Delete,
  CloudDownload,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { CV } from '../types';

interface CVCardProps {
  cv: CV;
  onEdit: (cv: CV) => void;
  onDelete: (cv: CV) => void;
  onView: (cv: CV) => void;
}

const CVCard: React.FC<CVCardProps> = ({ cv, onEdit, onDelete, onView }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDownload = () => {
    window.open(cv.fileUrl, '_blank');
    handleMenuClose();
  };

  const handleView = () => {
    onView(cv);
    handleMenuClose();
  };

  const handleEdit = () => {
    onEdit(cv);
    handleMenuClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Sei sicuro di voler eliminare "${cv.name}"?`)) {
      onDelete(cv);
    }
    handleMenuClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toUpperCase() || 'FILE';
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6" component="div" sx={{ fontSize: '1rem' }}>
                {cv.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                v{cv.version} • {getFileExtension(cv.fileName)}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Box>

        {cv.category && (
          <Chip
            label={cv.category}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mb: 1 }}
          />
        )}

        {cv.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {cv.description}
          </Typography>
        )}

        {cv.tags && cv.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {cv.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
            {cv.tags.length > 3 && (
              <Chip label={`+${cv.tags.length - 3}`} size="small" variant="outlined" />
            )}
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(cv.fileSize)} • Caricato il{' '}
            {format(new Date(cv.createdAt), 'dd MMM yyyy', { locale: it })}
          </Typography>
        </Box>
      </CardContent>

      <CardActions>
        <Button size="small" startIcon={<Visibility />} onClick={handleView}>
          Visualizza
        </Button>
        <Button size="small" startIcon={<CloudDownload />} onClick={handleDownload}>
          Scarica
        </Button>
      </CardActions>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleView}>
          <Visibility sx={{ mr: 1, fontSize: 20 }} />
          Visualizza
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <Download sx={{ mr: 1, fontSize: 20 }} />
          Scarica
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <Edit sx={{ mr: 1, fontSize: 20 }} />
          Modifica
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1, fontSize: 20 }} />
          Elimina
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default CVCard;

