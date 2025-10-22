import React, { useState } from 'react';
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
import { uploadCVFile, createCV, validateCVFile } from '../services/cvService';

interface CVUploadDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

const CVUploadDialog: React.FC<CVUploadDialogProps> = ({
  open,
  onClose,
  userId,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
      await createCV(userId, {
        name,
        fileName,
        fileUrl: url,
        fileSize: file.size,
        tags,
        category: category || undefined,
        description: description || undefined,
      });

      console.log('CV record created in Firestore');

      // Reset form
      setFile(null);
      setName('');
      setCategory('');
      setDescription('');
      setTags([]);
      setUploadProgress(0);

      onSuccess();
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
      setDescription('');
      setTags([]);
      setError(null);
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Carica Nuovo CV</DialogTitle>
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
                  Clicca per selezionare un file
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PDF, DOC, DOCX (max 10MB)
                </Typography>
              </Box>
            )}
          </Box>

          {uploading && (
            <Box>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" sx={{ mt: 0.5 }}>
                Caricamento: {uploadProgress.toFixed(0)}%
              </Typography>
            </Box>
          )}

          {/* Name */}
          <TextField
            fullWidth
            required
            label="Nome CV"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={uploading}
            placeholder="es: CV Software Engineer 2025"
          />

          {/* Category */}
          <TextField
            fullWidth
            select
            label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={uploading}
          >
            <MenuItem value="">Nessuna</MenuItem>
            <MenuItem value="Tech">Tech</MenuItem>
            <MenuItem value="Marketing">Marketing</MenuItem>
            <MenuItem value="Sales">Sales</MenuItem>
            <MenuItem value="Design">Design</MenuItem>
            <MenuItem value="Management">Management</MenuItem>
            <MenuItem value="General">Generale</MenuItem>
          </TextField>

          {/* Tags */}
          <Box>
            <TextField
              fullWidth
              label="Tags (premi Invio per aggiungere)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              disabled={uploading}
              placeholder="es: React, Senior, English"
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
            label="Descrizione (opzionale)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
            placeholder="es: CV aggiornato con esperienza React e TypeScript"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Annulla
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || !name || uploading}
          startIcon={<CloudUpload />}
        >
          {uploading ? 'Caricamento...' : 'Carica CV'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVUploadDialog;

