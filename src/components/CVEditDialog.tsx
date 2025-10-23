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
} from '@mui/material';
import { updateCV } from '../services/cvService';
import { GAEvents } from '../services/googleAnalytics';
import type { CV } from '../types';

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
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cv) {
      setName(cv.name);
      setCategory(cv.category || '');
      setDescription(cv.description || '');
      setTags(cv.tags || []);
    }
  }, [cv]);

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
      setError('Nome è obbligatorio');
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
      setError('Errore durante l\'aggiornamento del CV');
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
      <DialogTitle>Modifica CV</DialogTitle>
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
            label="Nome CV"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />

          <TextField
            fullWidth
            select
            label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={saving}
          >
            <MenuItem value="">Nessuna</MenuItem>
            <MenuItem value="Tech">Tech</MenuItem>
            <MenuItem value="Marketing">Marketing</MenuItem>
            <MenuItem value="Sales">Sales</MenuItem>
            <MenuItem value="Design">Design</MenuItem>
            <MenuItem value="Management">Management</MenuItem>
            <MenuItem value="General">Generale</MenuItem>
          </TextField>

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
            label="Descrizione (opzionale)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Annulla
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name || saving}
        >
          {saving ? 'Salvataggio...' : 'Salva'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVEditDialog;

