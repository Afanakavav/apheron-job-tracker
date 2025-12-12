import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import {
  autoFillForm,
  getUserFormData,
  saveUserFormData,
  type UserFormData,
} from '../services/formAutoFillService';

interface OneClickApplyHelperProps {
  form: HTMLFormElement;
  onClose: () => void;
}

const OneClickApplyHelper: React.FC<OneClickApplyHelperProps> = ({ form, onClose }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<UserFormData>({});
  const [loading, setLoading] = useState(false);
  const [filled, setFilled] = useState<{ filled: number; total: number } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;

    try {
      const data = await getUserFormData(currentUser.uid);
      setUserData(data);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleAutoFill = async () => {
    if (!currentUser || !form) return;

    setLoading(true);
    try {
      const result = autoFillForm(form, userData);
      setFilled(result);
      setShowSuccess(true);

      // Auto-close after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error auto-filling form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveData = () => {
    if (!currentUser) return;

    saveUserFormData(currentUser.uid, userData);
    setEditMode(false);
  };


  if (showSuccess && filled) {
    return (
      <Paper
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          p: 2,
          zIndex: 10000,
          minWidth: 300,
          boxShadow: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CheckCircleIcon color="success" />
          <Typography variant="h6">
            {t('oneClickApply.success') || 'Form compilato!'}
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ ml: 'auto' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {t('oneClickApply.filledFields', { filled: filled.filled, total: filled.total }) ||
            `${filled.filled} di ${filled.total} campi compilati`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={(filled.filled / filled.total) * 100}
          sx={{ mt: 1 }}
        />
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: 20,
        right: 20,
        p: 2,
        zIndex: 10000,
        minWidth: 350,
        maxWidth: 500,
        boxShadow: 4,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6">
            {t('oneClickApply.title') || 'One-Click Apply Helper'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {!editMode ? (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('oneClickApply.description') ||
              'Compila automaticamente il form di candidatura con i tuoi dati salvati.'}
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('oneClickApply.savedData') || 'Dati salvati:'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {userData.firstName && <Chip label={`Nome: ${userData.firstName}`} size="small" />}
              {userData.lastName && <Chip label={`Cognome: ${userData.lastName}`} size="small" />}
              {userData.email && <Chip label={`Email: ${userData.email}`} size="small" />}
              {userData.phone && <Chip label={`Telefono: ${userData.phone}`} size="small" />}
              {userData.linkedin && <Chip label="LinkedIn" size="small" />}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
              onClick={handleAutoFill}
              disabled={loading}
            >
              {t('oneClickApply.autoFill') || 'Compila Automaticamente'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
            >
              {t('oneClickApply.edit') || 'Modifica'}
            </Button>
          </Box>
        </>
      ) : (
        <Dialog open={editMode} onClose={() => setEditMode(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('oneClickApply.editData') || 'Modifica Dati'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label={t('oneClickApply.firstName') || 'Nome'}
              value={userData.firstName || ''}
              onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              label={t('oneClickApply.lastName') || 'Cognome'}
              value={userData.lastName || ''}
              onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('oneClickApply.email') || 'Email'}
              type="email"
              value={userData.email || ''}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('oneClickApply.phone') || 'Telefono'}
              type="tel"
              value={userData.phone || ''}
              onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="LinkedIn"
              value={userData.linkedin || ''}
              onChange={(e) => setUserData({ ...userData, linkedin: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="GitHub"
              value={userData.github || ''}
              onChange={(e) => setUserData({ ...userData, github: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('oneClickApply.portfolio') || 'Portfolio/Website'}
              type="url"
              value={userData.portfolio || ''}
              onChange={(e) => setUserData({ ...userData, portfolio: e.target.value })}
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditMode(false)}>
              {t('common.cancel') || 'Annulla'}
            </Button>
            <Button variant="contained" onClick={handleSaveData}>
              {t('common.save') || 'Salva'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Paper>
  );
};

export default OneClickApplyHelper;

