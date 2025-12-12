import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { ErrorAlert } from './ErrorAlert';
import {
  createTemplate,
  updateTemplate,
  getDefaultTemplates,
} from '../services/templateService';
import type { Template } from '../types';

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  template?: Template;
  type?: Template['type'];
  onSave: () => void;
}

export const TemplateDialog: React.FC<TemplateDialogProps> = ({
  open,
  onClose,
  template,
  type = 'email',
  onSave,
}) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [templateType, setTemplateType] = useState<Template['type']>(type);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
      setTags(template.tags);
      setIsDefault(template.isDefault);
      setTemplateType(template.type);
    } else {
      // Load default template for type
      const defaults = getDefaultTemplates();
      const defaultTemplate = defaults.find(t => t.type === type);
      if (defaultTemplate) {
        setName(defaultTemplate.name);
        setContent(defaultTemplate.content);
        setTags(defaultTemplate.tags);
        setIsDefault(defaultTemplate.isDefault);
      } else {
        setName('');
        setContent('');
        setTags([]);
        setIsDefault(false);
      }
    }
  }, [template, type, open]);

  const handleSave = async () => {
    if (!currentUser || !name.trim() || !content.trim()) {
      setError('Nome e contenuto sono obbligatori');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (template?.id) {
        await updateTemplate(template.id, {
          name,
          content,
          tags,
          isDefault,
          type: templateType,
        });
      } else {
        await createTemplate({
          userId: currentUser.uid,
          name,
          type: templateType,
          content,
          tags,
          isDefault,
        } as any);
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Errore nel salvataggio del template');
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const variables = extractVariables(content);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {template ? 'Modifica Template' : 'Nuovo Template'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <ErrorAlert error={error} />
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />

          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as Template['type'])}
              label="Tipo"
            >
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="cover_letter">Cover Letter</MenuItem>
              <MenuItem value="thank_you">Thank You</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Contenuto"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            fullWidth
            multiline
            rows={10}
            required
            placeholder="Usa {{variabile}} per inserire variabili dinamiche"
            helperText={`Variabili disponibili: ${variables.join(', ') || 'nessuna'}`}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Tag
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Aggiungi tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                sx={{ flex: 1 }}
              />
              <Button onClick={handleAddTag} size="small">
                Aggiungi
              </Button>
            </Box>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
            }
            label="Template predefinito"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? 'Salvataggio...' : 'Salva'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

