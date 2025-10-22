import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Application } from '../types';

interface ApplicationCardProps {
  application: Application;
  onEdit: (application: Application) => void;
  onDelete: (applicationId: string) => void;
  onViewDetails: (application: Application) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit(application);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete(application.id);
    handleMenuClose();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 3,
        },
      }}
      onClick={() => onViewDetails(application)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
            {application.jobTitle}
          </Typography>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
          {application.company}
        </Typography>

        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          {application.location && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {application.location} {application.isRemote && '(Remote)'}
              </Typography>
            </Box>
          )}

          {(application.salaryMin || application.salaryMax) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MoneyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {application.salaryMin && `${application.salaryMin.toLocaleString()}`}
                {application.salaryMin && application.salaryMax && ' - '}
                {application.salaryMax && `${application.salaryMax.toLocaleString()}`}
                {' '}{application.salaryCurrency}
              </Typography>
            </Box>
          )}

          {application.appliedDate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {format(application.appliedDate, 'dd MMM yyyy', { locale: it })}
              </Typography>
            </Box>
          )}
        </Stack>

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            label={application.priority}
            size="small"
            color={getPriorityColor(application.priority)}
            sx={{ fontSize: '0.7rem' }}
          />
          <Chip
            label={application.source}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
          {application.tags.slice(0, 2).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          ))}
          {application.tags.length > 2 && (
            <Chip
              label={`+${application.tags.length - 2}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleEdit}>Modifica</MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            Elimina
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
};

export default ApplicationCard;

