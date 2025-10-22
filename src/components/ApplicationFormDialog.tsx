import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Box,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { getUserCVs } from '../services/cvService';
import type { Application, ApplicationFormData, ApplicationStatus, JobSource, CV } from '../types';

interface ApplicationFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ApplicationFormData) => void;
  application?: Application | null;
}

const STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'saved', label: 'Salvata' },
  { value: 'applied', label: 'Candidata' },
  { value: 'phone_screen', label: 'Tel. Screen' },
  { value: 'interview', label: 'Colloquio' },
  { value: 'technical', label: 'Tecnico' },
  { value: 'offer', label: 'Offerta' },
  { value: 'rejected', label: 'Rifiutato' },
];

const SOURCES: { value: JobSource; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'glassdoor', label: 'Glassdoor' },
  { value: 'company_website', label: 'Sito Aziendale' },
  { value: 'referral', label: 'Referral' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'other', label: 'Altro' },
];

const ApplicationFormDialog: React.FC<ApplicationFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  application,
}) => {
  const { currentUser } = useAuth();
  const [cvs, setCVs] = useState<CV[]>([]);
  const [formData, setFormData] = useState<ApplicationFormData>({
    jobTitle: '',
    company: '',
    location: '',
    isRemote: false,
    jobUrl: '',
    jobDescription: '',
    salaryMin: undefined,
    salaryMax: undefined,
    salaryCurrency: 'EUR',
    source: 'linkedin',
    status: 'saved',
    priority: 'medium',
    notes: '',
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');

  // Fetch user's CVs
  useEffect(() => {
    const fetchCVs = async () => {
      if (currentUser) {
        try {
          const userCVs = await getUserCVs(currentUser.uid);
          setCVs(userCVs);
        } catch (error) {
          console.error('Error fetching CVs:', error);
        }
      }
    };
    fetchCVs();
  }, [currentUser]);

  useEffect(() => {
    if (application) {
      setFormData({
        jobTitle: application.jobTitle,
        company: application.company,
        location: application.location,
        isRemote: application.isRemote,
        jobUrl: application.jobUrl,
        jobDescription: application.jobDescription,
        salaryMin: application.salaryMin,
        salaryMax: application.salaryMax,
        salaryCurrency: application.salaryCurrency,
        source: application.source,
        status: application.status,
        priority: application.priority,
        notes: application.notes,
        tags: application.tags,
      });
    }
  }, [application]);

  const handleChange = (field: keyof ApplicationFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToDelete),
    });
  };

  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{application ? 'Modifica Candidatura' : 'Nuova Candidatura'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 0.5 }}>
          <Box>
            <TextField
              fullWidth
              required
              label="Posizione"
              value={formData.jobTitle}
              onChange={(e) => handleChange('jobTitle', e.target.value)}
            />
          </Box>
          <Box>
            <TextField
              fullWidth
              required
              label="Azienda"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
            />
          </Box>
          <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
            <TextField
              fullWidth
              label="Location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
            />
          </Box>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isRemote}
                  onChange={(e) => handleChange('isRemote', e.target.checked)}
                />
              }
              label="Remote"
            />
          </Box>
          <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
            <TextField
              fullWidth
              label="URL Annuncio"
              value={formData.jobUrl}
              onChange={(e) => handleChange('jobUrl', e.target.value)}
            />
          </Box>
          <Box>
            <TextField
              fullWidth
              type="number"
              label="Salario Min"
              value={formData.salaryMin || ''}
              onChange={(e) => handleChange('salaryMin', e.target.value ? Number(e.target.value) : undefined)}
            />
          </Box>
          <Box>
            <TextField
              fullWidth
              type="number"
              label="Salario Max"
              value={formData.salaryMax || ''}
              onChange={(e) => handleChange('salaryMax', e.target.value ? Number(e.target.value) : undefined)}
            />
          </Box>
          <Box>
            <TextField
              fullWidth
              select
              label="Valuta"
              value={formData.salaryCurrency}
              onChange={(e) => handleChange('salaryCurrency', e.target.value)}
            >
              <MenuItem value="EUR">EUR</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="GBP">GBP</MenuItem>
            </TextField>
          </Box>
          <Box>
            <TextField
              fullWidth
              select
              label="CV Utilizzato"
              value={formData.cvId || ''}
              onChange={(e) => handleChange('cvId', e.target.value)}
            >
              <MenuItem value="">Nessuno</MenuItem>
              {cvs.map((cv) => (
                <MenuItem key={cv.id} value={cv.id}>
                  {cv.name} (v{cv.version})
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box>
            <TextField
              fullWidth
              select
              required
              label="Fonte"
              value={formData.source}
              onChange={(e) => handleChange('source', e.target.value)}
            >
              {SOURCES.map((source) => (
                <MenuItem key={source.value} value={source.value}>
                  {source.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box>
            <TextField
              fullWidth
              select
              required
              label="Stato"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              {STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box>
            <TextField
              fullWidth
              select
              label="Priorità"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              <MenuItem value="low">Bassa</MenuItem>
              <MenuItem value="medium">Media</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
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
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {formData.tags.map((tag) => (
                <Chip key={tag} label={tag} onDelete={() => handleDeleteTag(tag)} />
              ))}
            </Box>
          </Box>
          <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Note"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.jobTitle || !formData.company}
        >
          {application ? 'Salva' : 'Crea'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicationFormDialog;

