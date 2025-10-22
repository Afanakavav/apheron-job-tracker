import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Fab,
  TextField,
  InputAdornment,
  Chip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getUserCVs, deleteCV } from '../services/cvService';
import CVCard from '../components/CVCard';
import CVUploadDialog from '../components/CVUploadDialog';
import CVEditDialog from '../components/CVEditDialog';
import CVViewerDialog from '../components/CVViewerDialog';
import type { CV } from '../types';

const CVManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [cvs, setCVs] = useState<CV[]>([]);
  const [filteredCVs, setFilteredCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchCVs = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const userCVs = await getUserCVs(currentUser.uid);
      setCVs(userCVs);
      setFilteredCVs(userCVs);
      setError(null);
    } catch (err) {
      console.error('Error fetching CVs:', err);
      setError('Errore nel caricamento dei CV');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCVs();
  }, [currentUser]);

  // Filter CVs based on search query and category
  useEffect(() => {
    let filtered = cvs;

    if (searchQuery) {
      filtered = filtered.filter(
        (cv) =>
          cv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cv.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
          cv.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((cv) => cv.category === selectedCategory);
    }

    setFilteredCVs(filtered);
  }, [searchQuery, selectedCategory, cvs]);

  const handleDelete = async (cv: CV) => {
    try {
      await deleteCV(cv);
      await fetchCVs();
    } catch (err) {
      console.error('Error deleting CV:', err);
      setError('Errore nell\'eliminazione del CV');
    }
  };

  const handleEdit = (cv: CV) => {
    setSelectedCV(cv);
    setEditDialogOpen(true);
  };

  const handleView = (cv: CV) => {
    setSelectedCV(cv);
    setViewDialogOpen(true);
  };

  const categories = Array.from(new Set(cvs.map((cv) => cv.category).filter(Boolean)));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Gestione CV
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {cvs.length} CV totali
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUploadDialogOpen(true)}
          sx={{ display: { xs: 'none', sm: 'flex' } }}
        >
          Carica CV
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <TextField
              fullWidth
              placeholder="Cerca CV per nome, tag o descrizione..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <FilterIcon sx={{ color: 'text.secondary' }} />
              <Chip
                label="Tutti"
                onClick={() => setSelectedCategory(null)}
                color={selectedCategory === null ? 'primary' : 'default'}
                variant={selectedCategory === null ? 'filled' : 'outlined'}
              />
              {categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  onClick={() => setSelectedCategory(category)}
                  color={selectedCategory === category ? 'primary' : 'default'}
                  variant={selectedCategory === category ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>
      </Box>

      {/* CV Grid */}
      {filteredCVs.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: 'background.paper',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {cvs.length === 0 ? 'Nessun CV caricato' : 'Nessun risultato'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {cvs.length === 0
              ? 'Carica il tuo primo CV per iniziare'
              : 'Prova a modificare i filtri di ricerca'}
          </Typography>
          {cvs.length === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Carica Primo CV
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {filteredCVs.map((cv) => (
            <Box key={cv.id}>
              <CVCard
                cv={cv}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => setUploadDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
        }}
      >
        <AddIcon />
      </Fab>

      {/* Dialogs */}
      <CVUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        userId={currentUser?.uid || ''}
        onSuccess={fetchCVs}
      />

      <CVEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedCV(null);
        }}
        cv={selectedCV}
        onSuccess={fetchCVs}
      />

      <CVViewerDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedCV(null);
        }}
        cv={selectedCV}
      />
    </Box>
  );
};

export default CVManager;


