import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    CardActions,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    Paper,
    Avatar,
    Tabs,
    Tab,
    Snackbar,
    Alert,
  } from '@mui/material';
import { NetworkingSkeleton } from '../components/skeletons';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  LinkedIn as LinkedInIcon,
  Business as BusinessIcon,
  Note as NoteIcon,
  Event as EventIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { HelpTooltip } from '../components/HelpTooltip';
import {
  createContact,
  getContacts,
  updateContact,
  deleteContact,
  createContactNote,
  getContactNotes,
  deleteContactNote,
  createNetworkingEvent,
  getNetworkingEvents,
  deleteNetworkingEvent,
  linkContactToApplication,
  unlinkContactFromApplication,
  type CreateContactData,
  type UpdateContactData,
  type CreateNetworkingEventData,
} from '../services/networkingService';
import { useApplications } from '../hooks/useApplications';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { scheduleFollowUpChecks } from '../services/networkingFollowUpService';
import { VirtualizedList } from '../components/VirtualizedList';
import type { Contact, ContactNote, NetworkingEvent, ContactType, NetworkingEventType } from '../types';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';

const Networking: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContactType | 'all'>('all');
  const [showFollowUpOnly, setShowFollowUpOnly] = useState(false);
  
  // Use the custom hook for applications data
  const { applications } = useApplications(currentUser?.uid);
  
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  
  // Error handling
  const [errorSnackbar, setErrorSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  
  // Dialogs
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedContactNotes, setSelectedContactNotes] = useState<ContactNote[]>([]);
  const [selectedContactEvents, setSelectedContactEvents] = useState<NetworkingEvent[]>([]);
  const [contactDetailsTab, setContactDetailsTab] = useState(0);
  
  // Form states
  const [contactForm, setContactForm] = useState<CreateContactData>({
    name: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    company: '',
    role: '',
    type: 'recruiter',
    tags: [],
    followUpReminderDays: 14,
  });
  const [noteContent, setNoteContent] = useState('');
  const [eventForm, setEventForm] = useState<CreateNetworkingEventData>({
    contactId: '',
    type: 'meeting',
    title: '',
    description: '',
    date: new Date(),
    location: '',
    linkedApplicationId: '',
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (currentUser?.uid) {
      loadData();
      // Schedule follow-up checks
      const cleanup = scheduleFollowUpChecks(currentUser.uid);
      return cleanup;
    }
  }, [currentUser]);

  // Removed useEffect - using useMemo for filteredContacts instead

  const loadData = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      // Use cache for faster initial load
      const contactsData = await getContacts(currentUser.uid, true);
      setContacts(contactsData);
      // Applications are already loaded via useApplications hook
    } catch (error: any) {
      console.error('Error loading data:', error);
      const errorMessage = error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions'
        ? t('networking.errors.permissionDenied')
        : t('networking.errors.loadFailed');
      setErrorSnackbar({ open: true, message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Memoize filtered contacts with debounced search
  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    // Search filter (using debounced value)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.company?.toLowerCase().includes(query) ||
        contact.role?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(contact => contact.type === typeFilter);
    }

    // Follow-up filter
    if (showFollowUpOnly) {
      const now = new Date();
      filtered = filtered.filter(contact => {
        if (!contact.lastContactDate || !contact.followUpReminderDays) return false;
        const daysSince = Math.floor(
          (now.getTime() - contact.lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSince >= (contact.followUpReminderDays || 14);
      });
    }

    return filtered;
  }, [contacts, debouncedSearchQuery, typeFilter, showFollowUpOnly]);

  const handleAddContact = async () => {
    if (!currentUser?.uid || !contactForm.name) return;

    try {
      await createContact(currentUser.uid, contactForm);
      await loadData();
      setContactDialogOpen(false);
      resetContactForm();
    } catch (error: any) {
      console.error('Error creating contact:', error);
      const errorMessage = error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions'
        ? t('networking.errors.permissionDenied')
        : t('networking.errors.createFailed');
      setErrorSnackbar({ open: true, message: errorMessage });
    }
  };

  const handleEditContact = async () => {
    if (!currentUser?.uid || !selectedContact) return;

    try {
      await updateContact(currentUser.uid, selectedContact.id, contactForm as UpdateContactData);
      await loadData();
      setContactDialogOpen(false);
      setSelectedContact(null);
      resetContactForm();
    } catch (error: any) {
      console.error('Error updating contact:', error);
      const errorMessage = error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions'
        ? t('networking.errors.permissionDenied')
        : t('networking.errors.updateFailed');
      setErrorSnackbar({ open: true, message: errorMessage });
    }
  };

  const handleDeleteContact = async () => {
    if (!currentUser?.uid || !selectedContact) return;

    try {
      await deleteContact(currentUser.uid, selectedContact.id);
      await loadData();
      setDeleteDialogOpen(false);
      setSelectedContact(null);
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      const errorMessage = error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions'
        ? t('networking.errors.permissionDenied')
        : t('networking.errors.deleteFailed');
      setErrorSnackbar({ open: true, message: errorMessage });
    }
  };

  const handleOpenContactDialog = (contact?: Contact) => {
    if (contact) {
      setSelectedContact(contact);
      setContactForm({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
        linkedinUrl: contact.linkedinUrl || '',
        company: contact.company || '',
        role: contact.role || '',
        type: contact.type,
        tags: contact.tags || [],
        followUpReminderDays: contact.followUpReminderDays || 14,
      });
    } else {
      resetContactForm();
    }
    setContactDialogOpen(true);
  };

  const resetContactForm = () => {
    setContactForm({
      name: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      company: '',
      role: '',
      type: 'recruiter',
      tags: [],
      followUpReminderDays: 14,
    });
    setSelectedContact(null);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !contactForm.tags?.includes(tagInput.trim())) {
      setContactForm({
        ...contactForm,
        tags: [...(contactForm.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setContactForm({
      ...contactForm,
      tags: contactForm.tags?.filter(t => t !== tag) || [],
    });
  };

  const loadContactDetails = async (contact: Contact) => {
    if (!currentUser?.uid) return;
    
    setSelectedContact(contact);
    try {
      const [notes, events] = await Promise.all([
        getContactNotes(currentUser.uid, contact.id).catch((error: any) => {
          console.error('Error loading contact notes:', error);
          // If index is missing, return empty array (fallback is handled in service)
          return [];
        }),
        getNetworkingEvents(currentUser.uid, contact.id).catch((error: any) => {
          console.error('Error loading networking events:', error);
          // If index is missing, return empty array (fallback is handled in service)
          return [];
        }),
      ]);
      setSelectedContactNotes(notes);
      setSelectedContactEvents(events);
    } catch (error: any) {
      console.error('Error loading contact details:', error);
      // Error is already handled by individual catch blocks above
    }
  };

  const handleAddNote = async () => {
    if (!currentUser?.uid || !selectedContact || !noteContent.trim()) return;

    try {
      await createContactNote(currentUser.uid, selectedContact.id, noteContent);
      setNoteContent('');
      await loadContactDetails(selectedContact);
      await loadData();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!currentUser?.uid) return;

    try {
      await deleteContactNote(currentUser.uid, noteId);
      if (selectedContact) {
        await loadContactDetails(selectedContact);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleAddEvent = async () => {
    if (!currentUser?.uid || !eventForm.contactId || !eventForm.title) return;

    try {
      await createNetworkingEvent(currentUser.uid, eventForm);
      setEventDialogOpen(false);
      setEventForm({
        contactId: '',
        type: 'meeting',
        title: '',
        description: '',
        date: new Date(),
        location: '',
        linkedApplicationId: '',
      });
      if (selectedContact) {
        await loadContactDetails(selectedContact);
      }
      await loadData();
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!currentUser?.uid) return;

    try {
      await deleteNetworkingEvent(currentUser.uid, eventId);
      if (selectedContact) {
        await loadContactDetails(selectedContact);
      }
      await loadData();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleLinkApplication = async (applicationId: string) => {
    if (!currentUser?.uid || !selectedContact) return;

    try {
      await linkContactToApplication(currentUser.uid, selectedContact.id, applicationId);
      await loadContactDetails(selectedContact);
      await loadData();
    } catch (error) {
      console.error('Error linking application:', error);
    }
  };

  const handleUnlinkApplication = async (applicationId: string) => {
    if (!currentUser?.uid || !selectedContact) return;

    try {
      await unlinkContactFromApplication(currentUser.uid, selectedContact.id, applicationId);
      await loadContactDetails(selectedContact);
      await loadData();
    } catch (error) {
      console.error('Error unlinking application:', error);
    }
  };

  const handleImportFromLinkedIn = async () => {
    if (!window.chrome?.runtime) {
      alert('Estensione Chrome non trovata. Installa l\'estensione Apheron Job Tracker per importare contatti da LinkedIn.');
      return;
    }

    if (!currentUser?.uid) {
      alert('Devi essere autenticato per importare contatti.');
      return;
    }

    try {
      // Send message to extension to extract contacts from current LinkedIn page
      const response = await new Promise<any>((resolve) => {
        if (!window.chrome?.runtime) {
          resolve({ success: false, error: 'Chrome extension not available' });
          return;
        }
        
        window.chrome.runtime.sendMessage(
          { action: 'extractLinkedInContacts' },
          (response) => {
            if (window.chrome?.runtime?.lastError) {
              resolve({ success: false, error: window.chrome.runtime.lastError.message });
            } else {
              resolve(response);
            }
          }
        );
      });

      if (response && response.success && response.contacts) {
        // Import contacts
        let imported = 0;
        let skipped = 0;

        for (const contactData of response.contacts) {
          try {
            // Check if contact already exists (by email or LinkedIn URL)
            const existing = contacts.find(
              c => c.email === contactData.email || c.linkedinUrl === contactData.linkedinUrl
            );

            if (existing) {
              skipped++;
              continue;
            }

            await createContact(currentUser!.uid, {
              name: contactData.name,
              email: contactData.email,
              linkedinUrl: contactData.linkedinUrl,
              company: contactData.company,
              role: contactData.role,
              type: contactData.type || 'other',
              tags: ['linkedin-import'],
            });
            imported++;
          } catch (error) {
            console.error('Error importing contact:', error);
            skipped++;
          }
        }

        await loadData();
        alert(t('networking.importSuccess', { count: imported }));
      } else {
        alert(response?.error || t('networking.importError'));
      }
    } catch (error) {
      console.error('Error importing from LinkedIn:', error);
      alert(t('networking.importError'));
    }
  };


  const formatLastContact = (date?: Date) => {
    if (!date) return t('networking.lastContact') + ': -';
    
    if (isToday(date)) return t('networking.today');
    if (isYesterday(date)) return t('networking.yesterday');
    
    const days = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return t('networking.daysAgo', { days });
  };

  const getContactTypeLabel = (type: ContactType) => {
    return t(`networking.${type}`);
  };

  if (loading) {
    return <NetworkingSkeleton />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('networking.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('networking.subtitle')}
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <HelpTooltip
            title="Importa da LinkedIn"
            content="Apri LinkedIn e naviga alla pagina del profilo o delle connessioni. Poi clicca qui per importare i contatti automaticamente."
          />
          <Button
            variant="outlined"
            startIcon={<LinkedInIcon />}
            onClick={handleImportFromLinkedIn}
            disabled={!window.chrome?.runtime}
          >
            {t('networking.importFromLinkedIn')}
          </Button>
          <HelpTooltip
            title="Aggiungi Contatto"
            content="Aggiungi manualmente un nuovo contatto professionale. Potrai aggiungere note, impostare follow-up e collegare candidature."
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenContactDialog()}
          >
            {t('networking.addContact')}
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          placeholder={t('networking.searchContacts')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>{t('networking.filterByType')}</InputLabel>
          <Select
            value={typeFilter}
            label={t('networking.filterByType')}
            onChange={(e) => setTypeFilter(e.target.value as ContactType | 'all')}
          >
            <MenuItem value="all">{t('networking.allTypes')}</MenuItem>
            <MenuItem value="recruiter">{t('networking.recruiter')}</MenuItem>
            <MenuItem value="hiring_manager">{t('networking.hiringManager')}</MenuItem>
            <MenuItem value="hr">{t('networking.hr')}</MenuItem>
            <MenuItem value="referral">{t('networking.referral')}</MenuItem>
            <MenuItem value="other">{t('networking.other')}</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant={showFollowUpOnly ? 'contained' : 'outlined'}
          startIcon={<FilterListIcon />}
          onClick={() => setShowFollowUpOnly(!showFollowUpOnly)}
        >
          {t('networking.needsFollowUp')}
        </Button>
      </Box>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {t('networking.noContacts')}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('networking.noContactsDescription')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenContactDialog()}
          >
            {t('networking.addContact')}
          </Button>
        </Paper>
      ) : (
        <VirtualizedList
          items={filteredContacts}
          renderItem={(contact) => (
            <Card key={contact.id}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box flexGrow={1}>
                    <Typography variant="h6">{contact.name}</Typography>
                    {contact.role && (
                      <Typography variant="body2" color="text.secondary">
                        {contact.role}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {contact.company && (
                  <Box display="flex" alignItems="center" mb={1}>
                    <BusinessIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">{contact.company}</Typography>
                  </Box>
                )}

                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                  <Chip
                    label={getContactTypeLabel(contact.type)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {contact.tags?.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>

                <Box mb={1}>
                  <Typography variant="caption" color="text.secondary">
                    {formatLastContact(contact.lastContactDate)}
                  </Typography>
                </Box>

                {contact.email && (
                  <Box display="flex" alignItems="center" mb={0.5}>
                    <EmailIcon sx={{ mr: 1, fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption">{contact.email}</Typography>
                  </Box>
                )}

                {contact.linkedinUrl && (
                  <Box display="flex" alignItems="center" mb={1}>
                    <LinkedInIcon sx={{ mr: 1, fontSize: 14, color: 'text.secondary' }} />
                    <Typography
                      variant="caption"
                      component="a"
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textDecoration: 'none', color: 'primary.main' }}
                    >
                      LinkedIn
                    </Typography>
                  </Box>
                )}

                {/* Follow-up indicator */}
                {contact.lastContactDate && contact.followUpReminderDays && (() => {
                  const now = new Date();
                  const daysSince = Math.floor(
                    (now.getTime() - contact.lastContactDate!.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const needsFollowUp = daysSince >= (contact.followUpReminderDays || 14);
                  return needsFollowUp ? (
                    <Chip
                      label={t('networking.needsFollowUp')}
                      size="small"
                      color="warning"
                      sx={{ mt: 1 }}
                    />
                  ) : null;
                })()}
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<NoteIcon />}
                  onClick={() => {
                    loadContactDetails(contact);
                    setNoteDialogOpen(true);
                  }}
                >
                  {t('networking.notes')}
                </Button>
                <Button
                  size="small"
                  startIcon={<EventIcon />}
                  onClick={() => {
                    loadContactDetails(contact);
                    setEventForm({ ...eventForm, contactId: contact.id });
                    setEventDialogOpen(true);
                  }}
                >
                  {t('networking.events')}
                </Button>
                <IconButton
                  size="small"
                  onClick={() => handleOpenContactDialog(contact)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedContact(contact);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          )}
          itemHeight={280}
          height={600}
          columns={{ xs: 1, sm: 2, md: 3 }}
          gap={24}
          threshold={20}
        />
      )}

      {/* Add/Edit Contact Dialog */}
      <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedContact ? t('networking.editContact') : t('networking.addContact')}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('networking.name')}
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label={t('networking.email')}
            type="email"
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label={t('networking.phone')}
            value={contactForm.phone}
            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label={t('networking.linkedin')}
            value={contactForm.linkedinUrl}
            onChange={(e) => setContactForm({ ...contactForm, linkedinUrl: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label={t('networking.company')}
            value={contactForm.company}
            onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label={t('networking.role')}
            value={contactForm.role}
            onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('networking.type')}</InputLabel>
            <Select
              value={contactForm.type}
              label={t('networking.type')}
              onChange={(e) => setContactForm({ ...contactForm, type: e.target.value as ContactType })}
            >
              <MenuItem value="recruiter">{t('networking.recruiter')}</MenuItem>
              <MenuItem value="hiring_manager">{t('networking.hiringManager')}</MenuItem>
              <MenuItem value="hr">{t('networking.hr')}</MenuItem>
              <MenuItem value="referral">{t('networking.referral')}</MenuItem>
              <MenuItem value="other">{t('networking.other')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={t('networking.followUpReminder')}
            type="number"
            value={contactForm.followUpReminderDays}
            onChange={(e) => setContactForm({ ...contactForm, followUpReminderDays: parseInt(e.target.value) || 14 })}
            margin="normal"
          />
          <Box mt={2}>
            <TextField
              fullWidth
              label={t('networking.tags')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              InputProps={{
                endAdornment: (
                  <Button onClick={handleAddTag} size="small">
                    {t('networking.add')}
                  </Button>
                ),
              }}
            />
            <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
              {contactForm.tags?.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialogOpen(false)}>{t('networking.cancel')}</Button>
          <Button
            onClick={selectedContact ? handleEditContact : handleAddContact}
            variant="contained"
            disabled={!contactForm.name}
          >
            {t('networking.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contact Details Dialog (Notes & Applications) */}
      <Dialog
        open={noteDialogOpen}
        onClose={() => {
          setNoteDialogOpen(false);
          setContactDetailsTab(0);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedContact?.name}
        </DialogTitle>
        <DialogContent>
          <Tabs value={contactDetailsTab} onChange={(_e, newValue) => setContactDetailsTab(newValue)} sx={{ mb: 2 }}>
            <Tab label={t('networking.notes')} />
            <Tab label={t('networking.linkedApplications')} />
          </Tabs>

          {/* Notes Tab */}
          {contactDetailsTab === 0 && (
            <Box>
              <Box mb={2}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder={t('networking.addNote')}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddNote}
                  disabled={!noteContent.trim()}
                  sx={{ mt: 1 }}
                >
                  {t('networking.addNote')}
                </Button>
              </Box>
              <Divider sx={{ my: 2 }} />
              <List>
                {selectedContactNotes.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="Nessuna nota" />
                  </ListItem>
                ) : (
                  selectedContactNotes.map((note) => (
                    <ListItem key={note.id}>
                      <ListItemText
                        primary={note.content}
                        secondary={format(note.createdAt, 'PPp', { locale: it })}
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => handleDeleteNote(note.id)} size="small">
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
          )}

          {/* Linked Applications Tab */}
          {contactDetailsTab === 1 && (
            <Box>
              {selectedContact?.applicationIds && selectedContact.applicationIds.length > 0 ? (
                <List>
                  {selectedContact.applicationIds.map((appId) => {
                    const app = applications.find(a => a.id === appId);
                    if (!app) return null;
                    return (
                      <ListItem key={appId}>
                        <ListItemText
                          primary={`${app.company} - ${app.jobTitle}`}
                          secondary={app.status}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            onClick={() => handleUnlinkApplication(appId)}
                            size="small"
                            title={t('networking.unlinkApplication')}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  {t('networking.noLinkedApplications')}
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <FormControl fullWidth>
                <InputLabel>{t('networking.linkApplication')}</InputLabel>
                <Select
                  value=""
                  label={t('networking.linkApplication')}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLinkApplication(e.target.value);
                    }
                  }}
                >
                  {applications
                    .filter(app => !selectedContact?.applicationIds?.includes(app.id))
                    .map((app) => (
                      <MenuItem key={app.id} value={app.id}>
                        {app.company} - {app.jobTitle}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setNoteDialogOpen(false);
            setContactDetailsTab(0);
          }}>{t('networking.cancel')}</Button>
        </DialogActions>
      </Dialog>

      {/* Events Dialog */}
      <Dialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('networking.events')} - {selectedContact?.name}
        </DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder={t('networking.eventTitle')}
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            />
            <Box display="flex" gap={1} mt={1}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>{t('networking.eventType')}</InputLabel>
                <Select
                  value={eventForm.type}
                  label={t('networking.eventType')}
                  onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as NetworkingEventType })}
                >
                  <MenuItem value="meeting">{t('networking.meeting')}</MenuItem>
                  <MenuItem value="email_sent">{t('networking.emailSent')}</MenuItem>
                  <MenuItem value="email_received">{t('networking.emailReceived')}</MenuItem>
                  <MenuItem value="phone_call">{t('networking.phoneCall')}</MenuItem>
                  <MenuItem value="referral_given">{t('networking.referralGiven')}</MenuItem>
                  <MenuItem value="referral_received">{t('networking.referralReceived')}</MenuItem>
                  <MenuItem value="event_attended">{t('networking.eventAttended')}</MenuItem>
                  <MenuItem value="coffee_chat">{t('networking.coffeeChat')}</MenuItem>
                  <MenuItem value="other">{t('networking.other')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                type="datetime-local"
                label={t('networking.eventDate')}
                value={format(eventForm.date, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setEventForm({ ...eventForm, date: new Date(e.target.value) })}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              fullWidth
              multiline
              rows={2}
              label={t('networking.eventDescription')}
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label={t('networking.eventLocation')}
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>{t('networking.linkToApplication')}</InputLabel>
              <Select
                value={eventForm.linkedApplicationId || ''}
                label={t('networking.linkToApplication')}
                onChange={(e) => setEventForm({ ...eventForm, linkedApplicationId: e.target.value || undefined })}
              >
                <MenuItem value="">{t('networking.noApplication')}</MenuItem>
                {applications.map((app) => (
                  <MenuItem key={app.id} value={app.id}>
                    {app.company} - {app.jobTitle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddEvent}
              disabled={!eventForm.title || !eventForm.contactId}
              sx={{ mt: 1 }}
            >
              {t('networking.addEvent')}
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            {t('networking.events')}
          </Typography>
          <List>
            {selectedContactEvents.length === 0 ? (
              <ListItem>
                <ListItemText primary={t('networking.noEvents')} />
              </ListItem>
            ) : (
              selectedContactEvents.map((event) => (
                <ListItem key={event.id}>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip label={t(`networking.${event.type}`)} size="small" />
                        <Typography variant="body1">{event.title}</Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {format(event.date, 'PPp', { locale: it })}
                        </Typography>
                        {event.description && (
                          <Typography variant="body2" color="text.secondary">
                            {event.description}
                          </Typography>
                        )}
                        {event.location && (
                          <Typography variant="caption" color="text.secondary">
                            📍 {event.location}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => handleDeleteEvent(event.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)}>{t('networking.cancel')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('networking.deleteContact')}</DialogTitle>
        <DialogContent>
          <Typography>{t('networking.confirmDelete')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('networking.cancel')}</Button>
          <Button onClick={handleDeleteContact} color="error" variant="contained">
            {t('networking.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setErrorSnackbar({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setErrorSnackbar({ open: false, message: '' })}
          severity="error"
          sx={{ width: '100%' }}
        >
          {errorSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Networking;

