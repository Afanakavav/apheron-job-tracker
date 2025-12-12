import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Chip,
  Alert,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useTranslation } from '../hooks/useTranslation';
import { updateCV } from '../services/cvService';
import { GAEvents } from '../services/googleAnalytics';
import { getApplicationsByCV } from '../services/cvUsageService';
import { useAuth } from '../contexts/AuthContext';
import { translateStatus } from '../utils/statusTranslation';
import type { CV, Application } from '../types';

interface CVEditDialogProps {
  open: boolean;
  onClose: () => void;
  cv: CV | null;
  onSuccess: () => void;
}

const CVEditDialog: React.FC<CVEditDialogProps> = ({
  open,
  onClose,
  cv,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedApplications, setLinkedApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  useEffect(() => {
    if (cv && currentUser) {
      setName(cv.name);
      setCategory(cv.category || '');
      setDescription(cv.description || '');
      setTags(cv.tags || []);
      
      // Fetch linked applications
      setLoadingApplications(true);
      getApplicationsByCV(cv.id, currentUser.uid)
        .then(apps => {
          setLinkedApplications(apps);
        })
        .catch(err => {
          console.error('Error fetching linked applications:', err);
        })
        .finally(() => {
          setLoadingApplications(false);
        });
    }
  }, [cv, currentUser]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter((tag) => tag !== tagToDelete));
  };

  const handleSave = async () => {
    if (!cv || !name) {
      setError(t('cvEdit.nameRequired'));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await updateCV(cv.id, {
        name,
        category: category || undefined,
        description: description || undefined,
        tags,
      });
      
      // Track analytics event
      GAEvents.updateCV();

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating CV:', err);
      setError(t('cvEdit.errorUpdating'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('cvEdit.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            required
            label={t('cvEdit.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />

          <TextField
            fullWidth
            select
            label={t('cvEdit.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={saving}
          >
            <MenuItem value="">{t('cvEdit.noneCategory')}</MenuItem>
            <MenuItem value="Tech">Tech</MenuItem>
            <MenuItem value="Marketing">Marketing</MenuItem>
            <MenuItem value="Sales">Sales</MenuItem>
            <MenuItem value="Design">Design</MenuItem>
            <MenuItem value="Management">Management</MenuItem>
            <MenuItem value="General">{t('cvEdit.general')}</MenuItem>
          </TextField>

          <Box>
            <TextField
              fullWidth
              label={t('cvEdit.tags')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              disabled={saving}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  disabled={saving}
                />
              ))}
            </Box>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={2}
            label={t('cvEdit.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />

          <Divider sx={{ my: 2 }} />

          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('cvEdit.linkedApplications')} 
              <Chip 
                label={linkedApplications.length} 
                size="small" 
                color={linkedApplications.length > 0 ? 'success' : 'default'}
              />
            </Typography>
            {loadingApplications ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : linkedApplications.length === 0 ? (
              <Alert severity="info" sx={{ mt: 1 }}>
                {t('cvEdit.noLinkedApplications')}
                <br />
                <Typography variant="caption">
                  {t('cvEdit.linkedApplicationsHelp')}
                </Typography>
              </Alert>
            ) : (
              <Box sx={{ mt: 1 }}>
                <List dense sx={{ 
                  maxHeight: 200, 
                  overflow: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}>
                  {linkedApplications.map((app, index) => (
                    <ListItem 
                      key={app.id} 
                      divider={index < linkedApplications.length - 1}
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="medium">
                            {app.jobTitle}
                          </Typography>
                        }
                        secondary={
                          <Box component="span">
                            <Typography variant="caption" component="span" display="block">
                              🏢 {app.company} {app.location && `• 📍 ${app.location}`}
                            </Typography>
                            <Chip 
                              label={translateStatus(app.status)} 
                              size="small" 
                              sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                              color={
                                app.status === 'offer' ? 'success' :
                                app.status === 'rejected' ? 'error' :
                                app.status.includes('interview') ? 'warning' :
                                'default'
                              }
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                  💡 {t('cvEdit.linkedApplicationsTip')}
                </Typography>
              </Box>
            )}
          </Box>

          {cv?.versions && cv.versions.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  📋 {t('cvEdit.versionHistory')}
                  <Chip 
                    label={cv.versions.length} 
                    size="small" 
                    color="info"
                  />
                </Typography>
                <List dense sx={{ 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  maxHeight: 150,
                  overflow: 'auto',
                }}>
                  {cv.versions.map((version, index) => (
                    <ListItem 
                      key={version.version}
                      divider={index < cv.versions!.length - 1}
                      secondaryAction={
                        <Button
                          size="small"
                          onClick={() => window.open(version.fileUrl, '_blank')}
                          variant="outlined"
                        >
                          {t('cvEdit.download')}
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={`${t('cvEdit.version')} ${version.version}`}
                        secondary={
                          <Box component="span">
                            <Typography variant="caption" display="block">
                              📅 {new Date(version.savedAt).toLocaleString('it-IT')}
                            </Typography>
                            <Typography variant="caption" display="block">
                              📦 {(version.fileSize / 1024).toFixed(1)} KB
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                  💾 {t('cvEdit.versionHistoryHelp')}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          {t('cvEdit.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name || saving}
        >
          {saving ? t('cvEdit.saving') : t('cvEdit.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVEditDialog;

