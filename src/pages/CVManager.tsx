import React, { useState, useEffect, useMemo } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { getUserCVs, deleteCV, uploadCVFile, createCV } from '../services/cvService';
import { getApplicationsByCV } from '../services/cvUsageService';
import { useApplications } from '../hooks/useApplications';
import { getArchivedApplications } from '../services/applicationService';
import { convertWordToPDF, generatePDFFilename } from '../services/wordToPdfService';
import { getDocumentIcon } from '../utils/documentIcons';
import { getFolderColor } from '../utils/documentFolders';
import CVCard from '../components/CVCard';
import CVUploadDialog from '../components/CVUploadDialog';
import CVEditDialog from '../components/CVEditDialog';
import CVViewerDialog from '../components/CVViewerDialog';
import CVManualFormDialog from '../components/CVManualFormDialog';
import CVRichEditorDialog from '../components/CVRichEditorDialog';
import { VirtualizedList } from '../components/VirtualizedList';
import type { CV, Application } from '../types';

const CVManager: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [cvs, setCVs] = useState<CV[]>([]);
  const [filteredCVs, setFilteredCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [manualFormDialogOpen, setManualFormDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [richEditorDialogOpen, setRichEditorDialogOpen] = useState(false);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [minApplications, setMinApplications] = useState(0);
  
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [converting, setConverting] = useState(false);
  const [cvApplicationCounts, setCvApplicationCounts] = useState<Record<string, number>>({});
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [quickFilter, setQuickFilter] = useState<'cv' | 'coverLetter' | 'aiGenerated' | 'recent7Days' | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'recent'>('all');
  
  // Use the custom hook for applications data
  const { applications: activeApplications } = useApplications(currentUser?.uid);
  const [archivedApplications, setArchivedApplications] = useState<Application[]>([]);
  
  // Combine active and archived applications for folder color matching
  const applications = useMemo(() => [...activeApplications, ...archivedApplications], [activeApplications, archivedApplications]);

  const fetchCVs = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Clean up orphaned folders before fetching CVs
      try {
        const { cleanupOrphanedFolders } = await import('../services/folderCleanupService');
        await cleanupOrphanedFolders(currentUser.uid);
      } catch (error) {
        console.error('Error cleaning up orphaned folders:', error);
        // Continue even if cleanup fails
      }
      
      const userCVs = await getUserCVs(currentUser.uid);
      setCVs(userCVs);
      setFilteredCVs(userCVs);
      
      // Fetch archived applications for folder color matching
      // Active applications are already loaded via useApplications hook
      const archivedApps = await getArchivedApplications(currentUser.uid);
      setArchivedApplications(archivedApps);
      
      // Fetch application counts for each CV
      const counts: Record<string, number> = {};
      for (const cv of userCVs) {
        const applications = await getApplicationsByCV(cv.id, currentUser.uid);
        counts[cv.id] = applications.length;
      }
      setCvApplicationCounts(counts);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching CVs:', err);
      setError(t('cvManager.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCVs();
  }, [currentUser]);

  // Filter CVs based on search query, category, and quick filters
  useEffect(() => {
    const applyFilters = async () => {
      if (!currentUser) {
        setFilteredCVs([]);
        return;
      }

      let filtered = cvs;

      // Enhanced global search: name, tags, description, folder, and content (if available)
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (cv) =>
            cv.name.toLowerCase().includes(queryLower) ||
            cv.tags.some((tag) => tag.toLowerCase().includes(queryLower)) ||
            cv.description?.toLowerCase().includes(queryLower) ||
            cv.folder?.toLowerCase().includes(queryLower) ||
            cv.category?.toLowerCase().includes(queryLower) ||
            cv.fileName?.toLowerCase().includes(queryLower)
        );
      }

      if (selectedCategory) {
        filtered = filtered.filter((cv) => cv.category === selectedCategory);
      }

      // Quick filters
      if (quickFilter === 'cv') {
        filtered = filtered.filter((cv) => 
          cv.folder === 'CV' || 
          cv.tags?.some(tag => tag.toLowerCase() === 'cv') ||
          cv.category === 'CV'
        );
      } else if (quickFilter === 'coverLetter') {
        filtered = filtered.filter((cv) => 
          cv.folder === 'Cover Letter' || 
          cv.tags?.some(tag => tag.toLowerCase().includes('cover')) ||
          cv.category === 'Cover Letter'
        );
      } else if (quickFilter === 'aiGenerated') {
        filtered = filtered.filter((cv) => 
          cv.tags?.some(tag => tag.toLowerCase().includes('ai')) ||
          cv.folder === 'Documenti AI' ||
          cv.category === 'AI Generated'
        );
      } else if (quickFilter === 'recent7Days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = filtered.filter((cv) => {
          const createdAt = cv.createdAt ? new Date(cv.createdAt) : null;
          return createdAt && createdAt >= sevenDaysAgo;
        });
      }

      // Apply view mode filter
      if (viewMode === 'recent') {
        // Show only recent documents (already filtered by recentDocuments)
        filtered = recentDocuments.filter(cv => filtered.includes(cv));
      }

      // Advanced filters
      if (filterCompany || filterPosition || minApplications > 0) {
        const filteredWithUsage = [];
        for (const cv of filtered) {
          try {
            const applications = await getApplicationsByCV(cv.id, currentUser.uid);
            
            let keep = true;
            
            if (filterCompany) {
              keep = keep && applications.some(app => 
                app.company.toLowerCase().includes(filterCompany.toLowerCase())
              );
            }
            
            if (filterPosition) {
              keep = keep && applications.some(app => 
                app.jobTitle.toLowerCase().includes(filterPosition.toLowerCase())
              );
            }
            
            if (minApplications > 0) {
              keep = keep && applications.length >= minApplications;
            }
            
            if (keep) {
              filteredWithUsage.push(cv);
            }
          } catch (error) {
            console.error('Error filtering CV:', error);
          }
        }
        filtered = filteredWithUsage;
      }

      setFilteredCVs(filtered);
    };

    applyFilters();
  }, [debouncedSearchQuery, selectedCategory, filterCompany, filterPosition, minApplications, cvs, currentUser, viewMode]);

  const handleDelete = async (cv: CV) => {
    try {
      await deleteCV(cv);
      await fetchCVs();
    } catch (err) {
      console.error('Error deleting CV:', err);
      setError(t('cvManager.errorDeleting'));
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

  const handleEditContent = (cv: CV) => {
    setSelectedCV(cv);
    setRichEditorDialogOpen(true);
  };

  const handleConvertToPDF = async (cv: CV) => {
    if (!currentUser) return;

    try {
      setConverting(true);
      setError(null);

      // Fetch Word file
      const response = await fetch(cv.fileUrl);
      const wordBlob = await response.blob();

      // Convert to PDF
      const pdfBlob = await convertWordToPDF(wordBlob);
      const pdfFilename = generatePDFFilename(cv.fileName);
      const pdfFile = new File([pdfBlob], pdfFilename, { type: 'application/pdf' });

      // Upload PDF
      const uploadResult = await uploadCVFile(currentUser.uid, pdfFile);

      // Create new CV entry for PDF (keep same folder as original)
      await createCV(currentUser.uid, {
        name: `${cv.name} (PDF)`,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.url,
        fileSize: pdfFile.size,
        tags: [...(cv.tags || []), 'converted'],
        category: cv.category,
        description: `PDF convertito da ${cv.name}`,
        folder: cv.folder || 'Documenti generali', // Keep same folder as original
      });

      await fetchCVs();
      setError(null);
      alert(`✅ CV convertito con successo in PDF: "${pdfFilename}"`);
    } catch (err: any) {
      console.error('Error converting to PDF:', err);
      setError(err.message || t('cvManager.errorConverting'));
    } finally {
      setConverting(false);
    }
  };

  const categories = Array.from(new Set(cvs.map((cv) => cv.category).filter((c): c is string => Boolean(c))));
  const allTags = Array.from(new Set(cvs.flatMap((cv) => cv.tags || [])));
  
  // Get recent documents (last 10 accessed/used)
  const recentDocuments = useMemo(() => {
    // Sort by createdAt (most recent first) and take top 10
    return [...cvs]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);
  }, [cvs]);
  
  // Suggested tags based on content (most common tags)
  const suggestedTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    cvs.forEach((cv) => {
      cv.tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);
  }, [cvs]);
  
  // Handle duplicate document
  const handleDuplicate = async (cv: CV) => {
    if (!currentUser) return;
    
    try {
      // Download the original file
      const response = await fetch(cv.fileUrl);
      const blob = await response.blob();
      const file = new File([blob], cv.fileName, { type: blob.type });
      
      // Upload as new file
      const uploadResult = await uploadCVFile(currentUser.uid, file);
      
      // Create new CV entry with "Copy" suffix
      await createCV(currentUser.uid, {
        name: `${cv.name} (Copia)`,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.url,
        fileSize: cv.fileSize,
        tags: [...(cv.tags || [])],
        category: cv.category,
        description: cv.description ? `Copia di: ${cv.description}` : `Copia di ${cv.name}`,
        folder: cv.folder || 'Documenti generali',
      });
      
      await fetchCVs();
      setError(null);
    } catch (err: any) {
      console.error('Error duplicating document:', err);
      setError(err.message || t('cvManager.errorDuplicating'));
    }
  };
  
  // Group documents by folder
  const documentsByFolder = useMemo(() => {
    const grouped: Record<string, CV[]> = {};
    filteredCVs.forEach((cv) => {
      const folder = cv.folder || 'Documenti generali';
      if (!grouped[folder]) {
        grouped[folder] = [];
      }
      grouped[folder].push(cv);
    });
    
    // Always include standard folders, even if empty
    const standardFolders = ['CV', 'Cover Letter', 'Documenti generali', 'Documenti AI'];
    standardFolders.forEach(folder => {
      if (!grouped[folder]) {
        grouped[folder] = [];
      }
    });
    
    // Sort folders: standard folders first (always shown), then application folders
    const sortedFolders = [
      ...standardFolders, // Always include all standard folders
      ...Object.keys(grouped).filter(f => !standardFolders.includes(f)).sort()
    ];
    
    return { grouped, sortedFolders };
  }, [filteredCVs]);

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
            {t('cvManager.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {cvs.length} {t('cvManager.total')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ display: { xs: 'none', sm: 'flex' } }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            {t('cvManager.uploadNew')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setManualFormDialogOpen(true)}
          >
            {t('cvManager.createManual')}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {converting && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Conversione in PDF in corso... Attendere prego.
        </Alert>
      )}

      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            fullWidth
            placeholder={t('cvManager.searchPlaceholder') || 'Cerca in tutti i documenti (nome, tag, contenuto)...'}
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
          <IconButton
            onClick={(e) => setFilterMenuAnchorEl(e.currentTarget)}
            size="large"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: selectedCategory ? 'primary.main' : 'background.paper',
              color: selectedCategory ? 'primary.contrastText' : 'text.secondary',
              '&:hover': {
                bgcolor: selectedCategory ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <FilterIcon />
          </IconButton>
        </Box>
        
        {/* Quick Filters */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <ButtonGroup variant="outlined" size="small">
            <Button
              variant={quickFilter === 'cv' ? 'contained' : 'outlined'}
              onClick={() => setQuickFilter(quickFilter === 'cv' ? null : 'cv')}
            >
              {t('cvManager.filters.cv') || 'CV'}
            </Button>
            <Button
              variant={quickFilter === 'coverLetter' ? 'contained' : 'outlined'}
              onClick={() => setQuickFilter(quickFilter === 'coverLetter' ? null : 'coverLetter')}
            >
              {t('cvManager.filters.coverLetter') || 'Cover Letter'}
            </Button>
            <Button
              variant={quickFilter === 'aiGenerated' ? 'contained' : 'outlined'}
              onClick={() => setQuickFilter(quickFilter === 'aiGenerated' ? null : 'aiGenerated')}
            >
              {t('cvManager.filters.aiGenerated') || 'AI Generated'}
            </Button>
            <Button
              variant={quickFilter === 'recent7Days' ? 'contained' : 'outlined'}
              onClick={() => setQuickFilter(quickFilter === 'recent7Days' ? null : 'recent7Days')}
            >
              {t('cvManager.filters.recent7Days') || 'Ultimi 7 giorni'}
            </Button>
          </ButtonGroup>
          
          {/* View Mode Toggle */}
          <ButtonGroup variant="outlined" size="small" sx={{ ml: 1 }}>
            <Button
              variant={viewMode === 'all' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('all')}
            >
              {t('cvManager.viewAll') || 'Tutti'}
            </Button>
            <Button
              variant={viewMode === 'recent' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('recent')}
            >
              {t('cvManager.viewRecent') || 'Recenti'}
            </Button>
          </ButtonGroup>
          
          {/* Suggested Tags */}
          {suggestedTags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ml: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                {t('cvManager.suggestedTags') || 'Tag suggeriti:'}
              </Typography>
              {suggestedTags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  onClick={() => setSearchQuery(tag)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchorEl}
        open={Boolean(filterMenuAnchorEl)}
        onClose={() => setFilterMenuAnchorEl(null)}
        PaperProps={{
          sx: { minWidth: 250, maxHeight: 400 },
        }}
      >
        <MenuItem
          onClick={() => {
            setSelectedCategory(null);
            setFilterMenuAnchorEl(null);
          }}
          selected={selectedCategory === null}
        >
          <Chip label="Tutti" size="small" sx={{ mr: 1 }} />
          {t('cvManager.allCVs')}
        </MenuItem>
        
        {categories.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
              CATEGORIE
            </Typography>
            {categories.map((category) => {
              const iconConfig = getDocumentIcon(category);
              return (
                <MenuItem
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setFilterMenuAnchorEl(null);
                  }}
                  selected={selectedCategory === category}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    width: '100%'
                  }}>
                    <Box sx={{ 
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 24,
                    }}>
                      {iconConfig.icon}
                    </Box>
                    <Chip 
                      label={category} 
                      size="small" 
                      sx={{ 
                        bgcolor: `${iconConfig.color}15`,
                        color: iconConfig.color,
                        borderColor: iconConfig.color,
                        fontWeight: 600,
                      }}
                      variant="outlined"
                    />
                  </Box>
                </MenuItem>
              );
            })}
          </>
        )}
        
        {allTags.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
              TAG DISPONIBILI ({allTags.length})
            </Typography>
            {allTags.slice(0, 10).map((tag) => (
              <MenuItem
                key={tag}
                onClick={() => {
                  setSearchQuery(tag);
                  setFilterMenuAnchorEl(null);
                }}
              >
                <Chip label={tag} size="small" variant="outlined" sx={{ mr: 1 }} />
                {tag}
              </MenuItem>
            ))}
            {allTags.length > 10 && (
              <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary', fontStyle: 'italic' }}>
                + {allTags.length - 10} altri tag...
              </Typography>
            )}
          </>
        )}
      </Menu>

      {/* Recent Documents View */}
      {viewMode === 'recent' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('cvManager.recentDocuments') || 'Documenti Recenti'}
          </Typography>
          {recentDocuments.length === 0 ? (
            <Alert severity="info">
              {t('cvManager.noRecentDocuments') || 'Nessun documento recente'}
            </Alert>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              {recentDocuments.map((cv) => (
                <Box key={cv.id}>
                  <CVCard
                    cv={cv}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                    onDuplicate={handleDuplicate}
                    linkedApplicationsCount={cvApplicationCounts[cv.id] || 0}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Documents grouped by folder */}
      {viewMode === 'all' && filteredCVs.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: 'background.paper',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {cvs.length === 0 ? 'Nessun documento caricato' : 'Nessun risultato'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {cvs.length === 0
              ? 'Carica il tuo primo documento per iniziare'
              : 'Prova a modificare i filtri di ricerca'}
          </Typography>
          {cvs.length === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              Carica Primo Documento
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {documentsByFolder.sortedFolders.map((folderName) => {
            const documentsInFolder = documentsByFolder.grouped[folderName] || [];
            const standardFolders = ['CV', 'Cover Letter', 'Documenti generali', 'Documenti AI'];
            const isStandardFolder = standardFolders.includes(folderName);
            
            // Always show standard folders, hide empty application folders
            if (!isStandardFolder && documentsInFolder.length === 0) return null;
            
            const folderColor = getFolderColor(folderName, documentsInFolder, applications);
            
            return (
              <Accordion key={folderName} defaultExpanded={false}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      alignItems: 'center',
                      gap: 1,
                    },
                  }}
                >
                  <FolderIcon sx={{ color: folderColor }} />
                  <Typography variant="h6" sx={{ flex: 1 }}>
                    {folderName}
                  </Typography>
                  <Chip 
                    label={`${documentsInFolder.length} ${documentsInFolder.length === 1 ? 'documento' : 'documenti'}`}
                    size="small"
                    sx={{
                      bgcolor: `${folderColor}15`,
                      color: folderColor,
                      borderColor: folderColor,
                    }}
                    variant="outlined"
                  />
                </AccordionSummary>
                {documentsInFolder.length > 0 && (
                  <AccordionDetails>
                    <VirtualizedList
                      items={documentsInFolder}
                      renderItem={(cv) => (
                        <CVCard
                          cv={cv}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onView={handleView}
                          linkedApplicationsCount={cvApplicationCounts[cv.id] || 0}
                        />
                      )}
                      itemHeight={280}
                      height={Math.min(600, documentsInFolder.length * 50)}
                      columns={{ xs: 1, sm: 2, md: 3 }}
                      gap={24}
                      threshold={20}
                    />
                  </AccordionDetails>
                )}
              </Accordion>
            );
          })}
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

      <CVManualFormDialog
        open={manualFormDialogOpen}
        onClose={() => setManualFormDialogOpen(false)}
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
        onEditContent={handleEditContent}
        onConvertToPDF={handleConvertToPDF}
      />

      <CVRichEditorDialog
        open={richEditorDialogOpen}
        onClose={() => {
          setRichEditorDialogOpen(false);
          setSelectedCV(null);
        }}
        cv={selectedCV}
        userId={currentUser?.uid || ''}
        onSuccess={fetchCVs}
      />

      {/* Advanced Filters Dialog */}
      <Dialog open={advancedFiltersOpen} onClose={() => setAdvancedFiltersOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Filtri Avanzati CV
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Filtra per Azienda"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              placeholder="es: Google, Microsoft..."
              helperText="Mostra CV usati per candidature in questa azienda"
            />
            
            <TextField
              fullWidth
              label="Filtra per Posizione"
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              placeholder="es: Developer, Manager..."
              helperText="Mostra CV usati per questa posizione"
            />
            
            <Box>
              <Typography variant="body2" gutterBottom>
                Minimo Candidature: {minApplications}
              </Typography>
              <Slider
                value={minApplications}
                onChange={(_, value) => setMinApplications(value as number)}
                min={0}
                max={20}
                step={1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 20, label: '20+' },
                ]}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Mostra solo CV usati almeno {minApplications} {minApplications === 1 ? 'volta' : 'volte'}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setFilterCompany('');
            setFilterPosition('');
            setMinApplications(0);
          }}>
            Reset
          </Button>
          <Button onClick={() => setAdvancedFiltersOpen(false)} variant="contained">
            Applica
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CVManager;


