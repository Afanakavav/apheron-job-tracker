import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Description,
  Visibility,
  Delete,
  CloudDownload,
  Work,
  Info,
  ContentCopy,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTranslation } from '../hooks/useTranslation';
import { GAEvents } from '../services/googleAnalytics';
import { getDocumentIcon } from '../utils/documentIcons';
import { getAIDocumentColor } from '../utils/aiDocumentColors';
import { isApplicationFolder } from '../utils/documentFolders';
import type { CV } from '../types';

interface CVCardProps {
  cv: CV;
  onEdit: (cv: CV) => void;
  onDelete: (cv: CV) => void;
  onView: (cv: CV) => void;
  onDuplicate?: (cv: CV) => void;
  linkedApplicationsCount?: number;
}

const CVCard: React.FC<CVCardProps> = ({ cv, onEdit, onDelete, onView, onDuplicate, linkedApplicationsCount = 0 }) => {
  const { t } = useTranslation();
  const documentIcon = getDocumentIcon(cv.category);
  
  // Check if document is in an application folder
  const isInApplicationFolder = isApplicationFolder(cv.folder);
  
  // Determine if this is a CV or Cover Letter based on tags or name patterns
  // For documents in application folders, check tags first (more reliable), then name patterns
  const hasCoverLetterTag = cv.tags?.some(tag => 
    tag.toLowerCase().includes('cover letter') || 
    tag.toLowerCase() === 'cl'
  ) || false;
  const hasCVTag = cv.tags?.some(tag => tag.toLowerCase() === 'cv') || false;
  
  const isCoverLetter = isInApplicationFolder && (
    hasCoverLetterTag ||
    cv.name.toLowerCase().includes('cover letter') ||
    cv.name.toLowerCase().includes('cover_letter') ||
    cv.name.toLowerCase().includes('cl_')
  );
  const isCV = isInApplicationFolder && !isCoverLetter && (
    hasCVTag ||
    !hasCoverLetterTag // If no Cover Letter tag and in application folder, assume CV
  );
  
  // Check if this is an AI document and get its color
  const aiColor = getAIDocumentColor(cv.tags, cv.category);
  
  // Determine icon color (priority order):
  // 1. AI documents → AI color (from AI function logos) - HIGHEST PRIORITY
  // 2. CV in CV folder or application folder → #E0B341 (giallo senape)
  // 3. Cover Letter in Cover Letter folder or application folder → #7A7A7A (grigio caldo)
  // 4. Default → category color
  let iconColor: string;
  
  // Priority 1: AI documents have highest priority
  if (aiColor) {
    iconColor = aiColor; // AI color (from AI function logos)
  }
  // Priority 2: CV (in CV folder or has CV tag in application folder)
  else if (cv.folder === 'CV' || (isInApplicationFolder && isCV)) {
    iconColor = '#E0B341'; // Giallo senape per CV
  }
  // Priority 3: Cover Letter (in Cover Letter folder or has Cover Letter tag in application folder)
  else if (cv.folder === 'Cover Letter' || (isInApplicationFolder && isCoverLetter)) {
    iconColor = '#7A7A7A'; // Grigio caldo per Cover Letter
  }
  // Priority 4: Default category color
  else {
    iconColor = documentIcon.color; // Default category color
  }
  
  const handleDownload = async () => {
    const { getCleanFileName, downloadFileWithCleanName } = await import('../utils/fileNameUtils');
    const cleanFileName = getCleanFileName(cv);
    await downloadFileWithCleanName(cv.fileUrl, cleanFileName);
  };

  const handleView = () => {
    GAEvents.viewCV();
    onView(cv);
  };

  const handleEdit = () => {
    onEdit(cv);
  };

  const handleDelete = () => {
    if (window.confirm(`${t('cvManager.deleteConfirm')} "${cv.name}"?`)) {
      GAEvents.deleteCV();
      onDelete(cv);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toUpperCase() || 'FILE';
  };

  // Drag & Drop handlers for CV
  const handleDragStart = (e: React.DragEvent) => {
    // Only allow dragging CVs (not Cover Letters)
    const isCV = cv.folder === 'CV' || cv.tags?.some(tag => tag.toLowerCase() === 'cv');
    if (!isCV) {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.setData('application/cv-id', cv.id);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Add visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Restore visual feedback
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'relative',
        cursor: isCV ? 'grab' : 'default',
        '&:active': {
          cursor: isCV ? 'grabbing' : 'default',
        },
      }}
      draggable={isCV}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Document Type Icon Badge */}
      <Tooltip title={documentIcon.description} placement="top">
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            backgroundColor: `${iconColor}15`,
            border: `2px solid ${iconColor}`,
            fontSize: '20px',
            cursor: 'help',
            transition: 'all 0.3s',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: `0 0 8px ${iconColor}60`,
            }
          }}
        >
          {documentIcon.icon}
        </Box>
      </Tooltip>

      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2, pr: 5 }}>
          <Description sx={{ fontSize: 40, color: iconColor }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontSize: '1rem' }}>
              {cv.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              v{cv.version} • {getFileExtension(cv.fileName)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {cv.category && (
            <Chip
              label={cv.category}
              size="small"
              sx={{
                bgcolor: `${iconColor}15`,
                color: iconColor,
                borderColor: iconColor,
                fontWeight: 600,
              }}
              variant="outlined"
            />
          )}
          {linkedApplicationsCount > 0 && (
            <Chip
              icon={<Work sx={{ fontSize: 16 }} />}
              label={`${linkedApplicationsCount} ${linkedApplicationsCount === 1 ? t('applications.total').slice(0, -1) : t('analytics.applications')}`}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Box>

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
            {formatFileSize(cv.fileSize)} • {format(new Date(cv.createdAt), 'dd MMM yyyy', { locale: it })}
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button size="small" startIcon={<Info />} onClick={handleEdit}>
          {t('cvManager.info')}
        </Button>
        <Button size="small" startIcon={<Visibility />} onClick={handleView}>
          {t('cvManager.view')}
        </Button>
        <Button size="small" startIcon={<CloudDownload />} onClick={handleDownload}>
          {t('cvManager.download')}
        </Button>
        {onDuplicate && (
          <Button 
            size="small" 
            startIcon={<ContentCopy />} 
            onClick={() => onDuplicate(cv)}
            color="primary"
            variant="outlined"
          >
            {t('cvManager.duplicate') || 'Duplica'}
          </Button>
        )}
        <Button size="small" startIcon={<Delete />} onClick={handleDelete} color="error">
          {t('cvManager.delete')}
        </Button>
      </CardActions>
    </Card>
  );
};

export default React.memo(CVCard);

