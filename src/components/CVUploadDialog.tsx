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
  Typography,
  LinearProgress,
  Chip,
  Alert,
} from '@mui/material';
import { CloudUpload, Description } from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { uploadCVFile, createCV, validateCVFile } from '../services/cvService';
import { GAEvents } from '../services/googleAnalytics';
import { getAvailableFolders, getDefaultFolderForCategory, STANDARD_FOLDERS } from '../utils/documentFolders';
import type { DocumentFolder } from '../types';

interface CVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: (uploadedCVId: string) => void;
  suggestedCategory?: string; // Auto-fill category (e.g., 'CV' or 'Cover Letter')
  autoAssignFolder?: DocumentFolder; // Auto-assign folder (e.g., from application context)
  lockFolder?: boolean; // If true, folder field is disabled and cannot be changed
  hideFolderField?: boolean; // If true, folder field is completely hidden (for new applications)
}

const CVUploadDialog: React.FC<CVUploadDialogProps> = ({
  open,
  onClose,
  userId,
  onSuccess,
  suggestedCategory,
  autoAssignFolder,
  lockFolder = false,
  hideFolderField = false,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(suggestedCategory || '');
  const [folder, setFolder] = useState<DocumentFolder>('');
  const [availableFolders, setAvailableFolders] = useState<DocumentFolder[]>(STANDARD_FOLDERS);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load available folders when dialog opens
  useEffect(() => {
    if (open && userId) {
      setLoadingFolders(true);
      getAvailableFolders(userId)
        .then((folders) => {
          setAvailableFolders(folders);
          setLoadingFolders(false);
        })
        .catch((err) => {
          console.error('Error loading folders:', err);
          setAvailableFolders(STANDARD_FOLDERS);
          setLoadingFolders(false);
        });
    }
  }, [open, userId]);

  // Update category and folder when suggestedCategory or autoAssignFolder changes
  useEffect(() => {
    if (suggestedCategory) {
      setCategory(suggestedCategory);
      // Auto-assign folder based on category if no autoAssignFolder is provided
      if (!autoAssignFolder) {
        const defaultFolder = getDefaultFolderForCategory(suggestedCategory);
        setFolder(defaultFolder);
      }
    }
    if (autoAssignFolder) {
      setFolder(autoAssignFolder);
    }
  }, [suggestedCategory, autoAssignFolder]);

  // When hideFolderField is true, ensure folder is set to autoAssignFolder
  useEffect(() => {
    if (hideFolderField && autoAssignFolder) {
      setFolder(autoAssignFolder);
    }
  }, [hideFolderField, autoAssignFolder]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validation = validateCVFile(selectedFile);
      if (!validation.valid) {
        setError(validation.error || 'File non valido');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);

      // Auto-fill name from filename if empty
      if (!name) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setName(fileName);
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter((tag) => tag !== tagToDelete));
  };

  const handleUpload = async () => {
    if (!file || !name) {
      setError('Nome e file sono obbligatori');
      return;
    }
    
    // If hideFolderField is true, use autoAssignFolder if folder is not set
    const finalFolder = folder || (hideFolderField && autoAssignFolder ? autoAssignFolder : '');
    
    if (!hideFolderField && !finalFolder) {
      setError('Cartella è obbligatoria');
      return;
    }
    
    if (!finalFolder) {
      setError('Cartella non specificata');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      console.log('Starting CV upload...', { userId, fileName: file.name, fileSize: file.size });

      // Upload file to Storage
      const { url, fileName } = await uploadCVFile(userId, file, (progress) => {
        console.log('Upload progress:', progress);
        setUploadProgress(progress);
      });

      console.log('File uploaded successfully:', { url, fileName });

      // Create CV record in Firestore
      const cvId = await createCV(userId, {
        name,
        fileName,
        fileUrl: url,
        fileSize: file.size,
        tags,
        category: category || undefined,
        description: description || undefined,
        folder: finalFolder, // Required folder
      });

      console.log('CV record created in Firestore with ID:', cvId);
      
      // Track analytics event
      GAEvents.uploadCV(file.type);

      // Reset form
      setFile(null);
      setName('');
      setCategory('');
      setFolder('');
      setDescription('');
      setTags([]);
      setUploadProgress(0);

      onSuccess(cvId);
      onClose();
    } catch (err: any) {
      console.error('Error uploading CV:', err);
      console.error('Error code:', err?.code);
      console.error('Error message:', err?.message);
      setError(`Errore durante il caricamento del CV: ${err?.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setName('');
      setCategory('');
      setFolder('');
      setDescription('');
      setTags([]);
      setError(null);
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('cvUpload.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* File Upload */}
          <Box
            sx={{
              border: '2px dashed',
              borderColor: file ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => document.getElementById('cv-file-input')?.click()}
          >
            <input
              id="cv-file-input"
              type="file"
              accept=".pdf,.doc,.docx"
              hidden
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {file ? (
              <Box>
                <Description sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="body1" fontWeight="bold">
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
            ) : (
              <Box>
                <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                <Typography variant="body1">
                  {t('cvUpload.dropzone')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('cvUpload.supportedFormats')}
                </Typography>
              </Box>
            )}
          </Box>

          {uploading && (
            <Box>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" sx={{ mt: 0.5 }}>
                {t('cvUpload.uploading')}: {uploadProgress.toFixed(0)}%
              </Typography>
            </Box>
          )}

          {/* Name */}
          <TextField
            fullWidth
            required
            label={t('cvUpload.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={uploading}
            placeholder={t('cvUpload.namePlaceholder')}
          />

          {/* Category */}
          <TextField
            fullWidth
            select
            label={t('cvUpload.category')}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={uploading}
          >
            <MenuItem value="">Nessuna</MenuItem>
            <MenuItem value="AI Generated">AI Generated</MenuItem>
            <MenuItem value="AI Analyzed">AI Analyzed</MenuItem>
            <MenuItem value="Tech">Tech</MenuItem>
            <MenuItem value="Marketing">Marketing</MenuItem>
            <MenuItem value="Sales">Sales</MenuItem>
            <MenuItem value="Design">Design</MenuItem>
            <MenuItem value="Management">Management</MenuItem>
            <MenuItem value="General">General</MenuItem>
          </TextField>

          {/* Folder - Required (hidden if hideFolderField is true) */}
          {!hideFolderField && (
            <TextField
              fullWidth
              required
              select
              label="Cartella"
              value={folder}
              onChange={(e) => setFolder(e.target.value as DocumentFolder)}
              disabled={uploading || loadingFolders || lockFolder}
              helperText={lockFolder ? "Cartella predefinita per questo tipo di documento" : "Seleziona la cartella in cui salvare il documento"}
            >
              {availableFolders.map((folderName) => (
                <MenuItem key={folderName} value={folderName}>
                  {folderName}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* Tags */}
          <Box>
            <TextField
              fullWidth
              label={t('cvUpload.tags')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddTag();
                }
              }}
              disabled={uploading}
              placeholder={t('cvUpload.tagsPlaceholder')}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  disabled={uploading}
                />
              ))}
            </Box>
          </Box>

          {/* Description */}
          <TextField
            fullWidth
            multiline
            rows={2}
            label={t('cvUpload.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
            placeholder={t('cvUpload.descriptionPlaceholder')}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {t('cvUpload.cancel')}
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || !name || (!hideFolderField && !folder) || uploading}
          startIcon={<CloudUpload />}
        >
          {uploading ? t('cvUpload.uploading') + '...' : t('cvUpload.upload')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVUploadDialog;

