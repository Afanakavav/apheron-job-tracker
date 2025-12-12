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
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  LocationOn as LocationIcon,
  Transform as TransformIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
  Analytics as AnalyticsIcon,
  InfoOutlined as InfoIcon,
  Email as EmailIcon,
  Search as SearchIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
  DeleteForever as DeleteForeverIcon,
  CheckBox,
  CheckBoxOutlineBlank,
} from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { differenceInDays, format } from 'date-fns';
import type { Application } from '../types';
import { useSwipe } from '../hooks/useSwipe';
import { useMobile } from '../hooks/useMobile';

interface ApplicationCardProps {
  application: Application;
  onEdit: (application: Application) => void;
  onDelete: (applicationId: string) => void;
  onViewDetails: (application: Application) => void;
  onOptimizeCV?: (application: Application) => void;
  onGenerateCoverLetter?: (application: Application) => void;
  onUploadCV?: (application: Application) => void;
  onUploadCoverLetter?: (application: Application) => void;
  onAnalyzeCV?: (application: Application) => void;
  onSendEmail?: (application: Application) => void;
  onOpenCompanyResearch?: (companyName: string) => void;
  onOpenJobAnalyzer?: (jobDescription: string) => void;
  onDropCV?: (application: Application, cvId: string) => void;
  // Bulk selection
  selected?: boolean;
  onSelect?: (applicationId: string, selected: boolean) => void;
  selectionMode?: boolean;
}

const ApplicationCard: React.FC<ApplicationCardProps> = React.memo(({
  application,
  onEdit,
  onDelete,
  onViewDetails,
  onOptimizeCV,
  onGenerateCoverLetter,
  onUploadCV,
  onUploadCoverLetter,
  onAnalyzeCV,
  onSendEmail,
  onOpenCompanyResearch,
  onOpenJobAnalyzer,
  onDropCV,
  selected = false,
  onSelect,
  selectionMode = false,
}) => {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const mouseDownPos = React.useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = React.useRef(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  
  // Swipe handlers for mobile
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      // Swipe left: show quick actions (edit, delete)
      if (isMobile) {
        setSwipeOffset(-80);
      }
    },
    onSwipeRight: () => {
      // Swipe right: reset position
      if (isMobile) {
        setSwipeOffset(0);
      }
    },
    threshold: 50,
  });

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

  const handleOptimizeCV = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onOptimizeCV) {
      onOptimizeCV(application);
    }
    handleMenuClose();
  };

  const handleGenerateCoverLetter = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onGenerateCoverLetter) {
      onGenerateCoverLetter(application);
    }
    handleMenuClose();
  };

  const handleUploadCV = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onUploadCV) {
      onUploadCV(application);
    }
    handleMenuClose();
  };

  const handleUploadCoverLetter = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onUploadCoverLetter) {
      onUploadCoverLetter(application);
    }
    handleMenuClose();
  };

  const handleAnalyzeCV = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onAnalyzeCV) {
      onAnalyzeCV(application);
    }
    handleMenuClose();
  };

  const handleSendEmail = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onSendEmail) {
      onSendEmail(application);
    }
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

  // Calculate days without response
  const getDaysWithoutResponse = (): number | null => {
    if (!application.appliedDate) return null;
    const appliedDate = new Date(application.appliedDate);
    const now = new Date();
    const days = differenceInDays(now, appliedDate);
    return days >= 0 ? days : null;
  };

  // Get border color based on urgency
  const getUrgencyBorderColor = (): string => {
    const daysWithoutResponse = getDaysWithoutResponse();
    
    // Red: urgent (7+ days without response, or high priority)
    if (daysWithoutResponse !== null && daysWithoutResponse >= 7) {
      return '#f44336'; // Red
    }
    if (application.priority === 'high') {
      return '#f44336'; // Red
    }
    
    // Yellow: attention (3-6 days without response, or medium priority)
    if (daysWithoutResponse !== null && daysWithoutResponse >= 3) {
      return '#ff9800'; // Orange
    }
    if (application.priority === 'medium') {
      return '#ff9800'; // Orange
    }
    
    // Green: ok
    return '#4caf50'; // Green
  };

  // Get match score color
  const getMatchScoreColor = (score: number): string => {
    if (score >= 80) return '#4caf50'; // Green
    if (score >= 60) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  // Get hover preview content
  const getHoverPreview = (): string => {
    const parts: string[] = [];
    
    if (application.notes) {
      parts.push(`Note: ${application.notes.substring(0, 100)}${application.notes.length > 100 ? '...' : ''}`);
    }
    
    if (application.appliedDate) {
      const days = getDaysWithoutResponse();
      if (days !== null) {
        parts.push(`Ultimo contatto: ${days} giorni fa`);
      }
    }
    
    if (application.interviewDates && application.interviewDates.length > 0) {
      const nextInterview = application.interviewDates
        .map(i => new Date(i.date))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      parts.push(`Prossimo colloquio: ${format(nextInterview, 'dd/MM/yyyy HH:mm')}`);
    }
    
    if (application.nextFollowUpDate) {
      parts.push(`Prossimo follow-up: ${format(new Date(application.nextFollowUpDate), 'dd/MM/yyyy')}`);
    }
    
    return parts.join('\n') || t('applications.noAdditionalInfo') || 'Nessuna informazione aggiuntiva';
  };

  const daysWithoutResponse = getDaysWithoutResponse();
  const urgencyBorderColor = getUrgencyBorderColor();

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(application.id, !selected);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Store initial mouse position
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    hasMovedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Check if mouse has moved significantly (more than 5px)
    if (mouseDownPos.current) {
      const deltaX = Math.abs(e.clientX - mouseDownPos.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownPos.current.y);
      if (deltaX > 5 || deltaY > 5) {
        hasMovedRef.current = true;
      }
    }
  };

  const handleClick = () => {
    // Don't open Info if menu is open
    if (anchorEl) {
      return;
    }
    
    // Prevent click if it was a drag (mouse moved significantly)
    if (hasMovedRef.current) {
      return;
    }
    
    // It's a click, not a drag - open Info screen
    onViewDetails(application);
    
    // Reset for next interaction
    mouseDownPos.current = null;
    hasMovedRef.current = false;
  };

  const handleMouseUp = () => {
    // Reset position tracking
    mouseDownPos.current = null;
    hasMovedRef.current = false;
  };

  // Drag & Drop handlers for CV
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if dragging a CV
    if (e.dataTransfer.types.includes('application/cv-id')) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Get CV ID from dataTransfer
    const cvId = e.dataTransfer.getData('application/cv-id');
    if (cvId && onDropCV) {
      onDropCV(application, cvId);
    }
  };

  return (
    <Box sx={{ position: 'relative', mb: 2 }}>
      {/* Quick actions overlay (mobile swipe) */}
      {isMobile && (
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            pr: 2,
            zIndex: 1,
            opacity: swipeOffset < 0 ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
        >
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
              setSwipeOffset(0);
            }}
            sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <InfoIcon />
          </IconButton>
          {application.status === 'rejected' && (
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
                setSwipeOffset(0);
              }}
              sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
            >
              <DeleteForeverIcon />
            </IconButton>
          )}
        </Box>
      )}
      
      <Tooltip title={getHoverPreview()} arrow placement="top" disableHoverListener={isMobile}>
        <Card
          sx={{
            cursor: 'pointer',
            border: isDragOver ? '2px dashed' : `2px solid ${urgencyBorderColor}`,
            borderColor: isDragOver ? 'primary.main' : urgencyBorderColor,
            bgcolor: isDragOver ? 'action.hover' : 'background.paper',
            transition: 'all 0.2s',
            transform: isMobile ? `translateX(${swipeOffset}px)` : 'none',
            touchAction: isMobile ? 'pan-y' : 'auto',
            '&:hover': {
              boxShadow: isMobile ? 1 : 3,
              transform: isMobile ? `translateX(${swipeOffset}px)` : 'translateY(-2px)',
            },
            '&:active': isMobile ? {
              transform: `translateX(${swipeOffset}px) scale(0.98)`,
            } : {},
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          {...(isMobile ? {
            onTouchStart: swipeHandlers.onTouchStart,
            onTouchMove: swipeHandlers.onTouchMove,
            onTouchEnd: () => {
              swipeHandlers.onTouchEnd();
            },
          } : {})}
        >
      <CardContent sx={{ position: 'relative' }}>
        {selectionMode && (
          <IconButton
            size="small"
            onClick={handleSelect}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10,
            }}
          >
            {selected ? <CheckBox color="primary" /> : <CheckBoxOutlineBlank />}
          </IconButton>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
            {application.jobTitle}
          </Typography>
          {!selectionMode && (
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
          {application.company}
        </Typography>

        {application.location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
            <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {application.location} {application.isRemote && '(Remote)'}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Priority Badge */}
            <Chip
              label={t(`applications.priority.${application.priority}`) || application.priority}
              size="small"
              color={getPriorityColor(application.priority)}
              sx={{ fontSize: '0.7rem' }}
            />
            
            {/* Days without response badge */}
            {daysWithoutResponse !== null && daysWithoutResponse >= 3 && (
              <Chip
                icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                label={`${daysWithoutResponse}d fa`}
                size="small"
                color={daysWithoutResponse >= 7 ? 'error' : 'warning'}
                sx={{ fontSize: '0.7rem' }}
              />
            )}
            
            {/* Match Score badge */}
            {application.matchScore !== undefined && (
              <Chip
                icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                label={`${application.matchScore}%`}
                size="small"
                sx={{ 
                  fontSize: '0.7rem',
                  bgcolor: getMatchScoreColor(application.matchScore),
                  color: 'white',
                  '& .MuiChip-icon': {
                    color: 'white',
                  },
                }}
              />
            )}
          </Box>
        </Box>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          {/* Info - sempre disponibile */}
          <MenuItem onClick={handleEdit}>
            <InfoIcon sx={{ mr: 1, fontSize: 18, color: 'info.main' }} />
            {t('applications.info')}
          </MenuItem>
          
          {/* Opzioni disponibili solo per status 'saved' (Da candidarsi) */}
          {application.status === 'saved' && (
            <>
              {onUploadCV && (
                <MenuItem onClick={handleUploadCV}>
                  <CloudUploadIcon sx={{ mr: 1, fontSize: 18, color: 'info.main' }} />
                  {t('applications.uploadCV')}
                </MenuItem>
              )}
              {onUploadCoverLetter && (
                <MenuItem onClick={handleUploadCoverLetter}>
                  <CloudUploadIcon sx={{ mr: 1, fontSize: 18, color: 'info.main' }} />
                  {t('applications.uploadCoverLetter')}
                </MenuItem>
              )}
              {onOpenCompanyResearch && (
                <MenuItem onClick={(e) => {
                  e.stopPropagation();
                  onOpenCompanyResearch(application.company);
                  handleMenuClose();
                }}>
                  <SearchIcon sx={{ mr: 1, fontSize: 18, color: '#2e7d32' }} />
                  {t('applications.analyzeCompanyWithAI')}
                </MenuItem>
              )}
              {onOpenJobAnalyzer && (
                <MenuItem onClick={(e) => {
                  e.stopPropagation();
                  onOpenJobAnalyzer(application.jobUrl || application.jobDescription || '');
                  handleMenuClose();
                }}>
                  <SearchIcon sx={{ mr: 1, fontSize: 18, color: '#1976d2' }} />
                  {t('applications.analyzePositionWithAI')}
                </MenuItem>
              )}
              {onAnalyzeCV && (
                <MenuItem onClick={handleAnalyzeCV}>
                  <AnalyticsIcon sx={{ mr: 1, fontSize: 18, color: '#7b1fa2' }} />
                  {t('applications.analyzeCVWithAI')}
                </MenuItem>
              )}
              {onOptimizeCV && (
                <MenuItem onClick={handleOptimizeCV}>
                  <TransformIcon sx={{ mr: 1, fontSize: 18, color: '#f57c00' }} />
                  {t('applications.adaptCVWithAI')}
                </MenuItem>
              )}
              {onGenerateCoverLetter && (
                <MenuItem onClick={handleGenerateCoverLetter}>
                  <DescriptionIcon sx={{ mr: 1, fontSize: 18, color: '#c2185b' }} />
                  {t('applications.generateCoverLetterWithAI')}
                </MenuItem>
              )}
            </>
          )}
          
          {/* Opzioni disponibili per stati di colloquio (interview_1, interview_2, interview_3, interview_4) */}
          {(application.status === 'interview_1' || 
            application.status === 'interview_2' || 
            application.status === 'interview_3' || 
            application.status === 'interview_4') && (
            <>
              {onSendEmail && (
                <MenuItem onClick={handleSendEmail}>
                  <EmailIcon sx={{ mr: 1, fontSize: 18, color: '#00897b' }} />
                  {t('applications.sendEmailWithAI')}
                </MenuItem>
              )}
            </>
          )}
          
          {/* Opzioni disponibili per stato 'rejected' (quando proviene da un colloquio) */}
          {application.status === 'rejected' && (
            <>
              {onSendEmail && (
                <MenuItem onClick={handleSendEmail}>
                  <EmailIcon sx={{ mr: 1, fontSize: 18, color: '#00897b' }} />
                  {t('applications.sendEmailWithAI')}
                </MenuItem>
              )}
            </>
          )}

          {/* Opzioni disponibili per stato 'offer' */}
          {application.status === 'offer' && (
            <>
              {onSendEmail && (
                <MenuItem onClick={handleSendEmail}>
                  <EmailIcon sx={{ mr: 1, fontSize: 18, color: '#00897b' }} />
                  {t('applications.sendEmailWithAI')}
                </MenuItem>
              )}
            </>
          )}
          
          {/* Elimina - solo per rejected */}
          <MenuItem 
            onClick={handleDelete} 
            disabled={application.status !== 'rejected'}
            sx={{ 
              color: application.status === 'rejected' ? 'error.main' : 'text.disabled',
            }}
          >
            {application.status === 'rejected' ? t('applications.delete') : t('applications.deleteOnlyRejected')}
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
    </Tooltip>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.application.id === nextProps.application.id &&
    prevProps.application.updatedAt === nextProps.application.updatedAt &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode
  );
});

ApplicationCard.displayName = 'ApplicationCard';

export default ApplicationCard;

