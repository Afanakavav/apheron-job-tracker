import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  MenuItem,
  TextField,
  Button,
  Divider,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import {
  Language,
  Notifications,
  Security,
  AccountCircle,
  Save,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getUserApplications } from '../services/applicationService';
import { getUserCVs } from '../services/cvService';
import { 
  exportApplicationsCSV, 
  exportApplicationsPDF,
  exportAllData 
} from '../services/exportService';
import { exportContactsCSV, exportContactsVCard } from '../services/exportService';
import { getContacts } from '../services/networkingService';
import { FileDownload, PictureAsPdf, ContactMail, TableChart, Description, Add, Edit, Delete, PlayArrow, School } from '@mui/icons-material';
import { TemplateDialog } from '../components/TemplateDialog';
import { WorkflowDialog } from '../components/WorkflowDialog';
import { HelpTooltip } from '../components/HelpTooltip';
import { useOnboarding } from '../components/OnboardingTour';
import { getUserTemplates, deleteTemplate, getDefaultTemplates, createTemplate } from '../services/templateService';
import { getUserWorkflows, deleteWorkflow, getDefaultWorkflows, createWorkflow } from '../services/workflowService';
import type { Template } from '../types';
import type { Workflow } from '../services/workflowService';
import i18n from '../i18n/i18n'; // Direct import

/**
 * Settings Page - v3.0 - Fixed i18n initialization issue
 * Using direct i18n import instead of useTranslation hook
 */
const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const { setShowOnboarding } = useOnboarding();
  
  // Direct i18n usage without hook (to avoid useContext issues)
  const t = (key: string) => {
    try {
      return i18n.t(key);
    } catch {
      return key;
    }
  };
  
  const [language, setLanguage] = useState(i18n.language || 'it');
  const [tempLanguage, setTempLanguage] = useState(i18n.language || 'it'); // Temporary until Save
  const [aiLanguage, setAiLanguage] = useState(localStorage.getItem('ai_language') || 'auto');
  const [tempAiLanguage, setTempAiLanguage] = useState(localStorage.getItem('ai_language') || 'auto'); // Temporary until Save
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem('email_notifications');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [pushNotifications, setPushNotifications] = useState(() => {
    const saved = localStorage.getItem('push_notifications');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [saved, setSaved] = useState(false);
  
  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateType, setTemplateType] = useState<Template['type']>('email');

  // Workflows
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    try {
      const currentLang = i18n.language || 'it';
      setLanguage(currentLang);
      setTempLanguage(currentLang);
    } catch {
      setLanguage('it');
      setTempLanguage('it');
    }
    
    // Load notification preferences from localStorage
    const savedEmail = localStorage.getItem('email_notifications');
    const savedPush = localStorage.getItem('push_notifications');
    if (savedEmail !== null) setEmailNotifications(JSON.parse(savedEmail));
    if (savedPush !== null) setPushNotifications(JSON.parse(savedPush));
    
    // Load templates and workflows
    if (currentUser) {
      fetchTemplates();
      fetchWorkflows();
    }
  }, [currentUser]);
  
  const fetchTemplates = async () => {
    if (!currentUser) return;
    
    try {
      setTemplatesLoading(true);
      const userTemplates = await getUserTemplates(currentUser.uid);
      
      // If no templates, create default ones
      if (userTemplates.length === 0) {
        const defaults = getDefaultTemplates();
        for (const defaultTemplate of defaults) {
          await createTemplate({
            ...defaultTemplate,
            userId: currentUser.uid,
          });
        }
        // Reload templates
        const reloaded = await getUserTemplates(currentUser.uid);
        setTemplates(reloaded);
      } else {
        setTemplates(userTemplates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };
  
  const handleCreateTemplate = (type: Template['type']) => {
    setTemplateType(type);
    setSelectedTemplate(null);
    setTemplateDialogOpen(true);
  };
  
  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setTemplateType(template.type);
    setTemplateDialogOpen(true);
  };
  
  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo template?')) return;
    
    try {
      await deleteTemplate(templateId);
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Errore nell\'eliminazione del template');
    }
  };
  
  const handleTemplateSaved = () => {
    fetchTemplates();
  };

  const fetchWorkflows = async () => {
    if (!currentUser) return;
    
    try {
      setWorkflowsLoading(true);
      const userWorkflows = await getUserWorkflows(currentUser.uid);
      
      // If no workflows, create default ones
      if (userWorkflows.length === 0) {
        const defaults = getDefaultWorkflows();
        for (const defaultWorkflow of defaults) {
          await createWorkflow({
            userId: currentUser.uid,
            ...defaultWorkflow,
          });
        }
        // Reload workflows
        const reloaded = await getUserWorkflows(currentUser.uid);
        setWorkflows(reloaded);
      } else {
        setWorkflows(userWorkflows);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setWorkflowsLoading(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    // Just update temporary state, don't apply yet
    setTempLanguage(newLang);
  };

  const handleAiLanguageChange = (newLang: string) => {
    // Just update temporary state, don't apply yet
    setTempAiLanguage(newLang);
  };

  const handleEmailNotificationsChange = (checked: boolean) => {
    setEmailNotifications(checked);
    localStorage.setItem('email_notifications', JSON.stringify(checked));
  };

  const handlePushNotificationsChange = (checked: boolean) => {
    setPushNotifications(checked);
    localStorage.setItem('push_notifications', JSON.stringify(checked));
  };

  const handleSave = () => {
    // Apply language changes only when Save is clicked
    if (tempLanguage !== language) {
      try {
        i18n.changeLanguage(tempLanguage);
        setLanguage(tempLanguage);
        localStorage.setItem('app_language', tempLanguage);
      } catch (error) {
        console.error('Error changing language:', error);
      }
    }

    // Apply AI language changes
    if (tempAiLanguage !== aiLanguage) {
      setAiLanguage(tempAiLanguage);
      if (tempAiLanguage === 'auto') {
        localStorage.removeItem('ai_language');
      } else {
        localStorage.setItem('ai_language', tempAiLanguage);
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExportData = async () => {
    if (!currentUser) return;

    try {
      const applications = await getUserApplications(currentUser.uid);
      const cvs = await getUserCVs(currentUser.uid);
      exportAllData(applications, cvs);
      alert(t('settings.exportSuccess'));
    } catch (error) {
      console.error('Error exporting data:', error);
      alert(t('settings.exportError'));
    }
  };

  const handleExportApplicationsCSV = async () => {
    if (!currentUser) return;

    try {
      const applications = await getUserApplications(currentUser.uid);
      exportApplicationsCSV(applications);
      alert(t('settings.exportCSVSuccess'));
    } catch (error) {
      console.error('Error exporting applications:', error);
      alert(t('settings.exportCSVError'));
    }
  };

  const handleExportApplicationsPDF = async () => {
    if (!currentUser) return;

    try {
      const applications = await getUserApplications(currentUser.uid);
      await exportApplicationsPDF(applications);
      alert('PDF esportato con successo!');
    } catch (error) {
      console.error('Error exporting applications PDF:', error);
      alert('Errore nell\'esportazione del PDF');
    }
  };

  const handleExportContactsCSV = async () => {
    if (!currentUser) return;

    try {
      const contacts = await getContacts(currentUser.uid);
      exportContactsCSV(contacts);
      alert('Contatti esportati in CSV con successo!');
    } catch (error) {
      console.error('Error exporting contacts CSV:', error);
      alert('Errore nell\'esportazione dei contatti');
    }
  };

  const handleExportContactsVCard = async () => {
    if (!currentUser) return;

    try {
      const contacts = await getContacts(currentUser.uid);
      exportContactsVCard(contacts);
      alert('Contatti esportati in vCard con successo!');
    } catch (error) {
      console.error('Error exporting contacts vCard:', error);
      alert('Errore nell\'esportazione dei contatti');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        ⚙️ {t('settings.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {t('settings.subtitle')}
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('settings.saved')}
        </Alert>
      )}

      {/* Account Settings */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AccountCircle sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">{t('settings.account')}</Typography>
          </Box>
          <Stack spacing={2}>
            <TextField
              label="Email"
              value={currentUser?.email || ''}
              disabled
              fullWidth
            />
            <Typography variant="caption" color="text.secondary">
              {t('settings.emailChangeContact')}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Language */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Language sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">{t('settings.language')}</Typography>
          </Box>
          <Stack spacing={2}>
            <TextField
              select
              label={t('settings.language')}
              value={tempLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              fullWidth
              helperText={t('settings.languageHelper')}
            >
              <MenuItem value="it">🇮🇹 Italiano</MenuItem>
              <MenuItem value="en">🇬🇧 English</MenuItem>
            </TextField>

            <TextField
              select
              label={t('settings.aiLanguage')}
              value={tempAiLanguage}
              onChange={(e) => handleAiLanguageChange(e.target.value)}
              fullWidth
              helperText={t('settings.aiLanguageHelper')}
            >
              <MenuItem value="auto">{t('settings.aiLanguageAuto')}</MenuItem>
              <MenuItem value="it">🇮🇹 Italiano</MenuItem>
              <MenuItem value="en">🇬🇧 English</MenuItem>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Notifications sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">{t('settings.notifications')}</Typography>
          </Box>
          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={emailNotifications}
                  onChange={(e) => handleEmailNotificationsChange(e.target.checked)}
                />
              }
              label={t('settings.emailNotifications')}
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
              {t('settings.emailDesc')}
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={pushNotifications}
                  onChange={(e) => handlePushNotificationsChange(e.target.checked)}
                />
              }
              label={t('settings.pushNotifications')}
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
              {t('settings.pushDesc')}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Export & Backup */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FileDownload sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Export & Backup</Typography>
          </Box>
          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              Candidature
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<TableChart />}
              fullWidth
              onClick={handleExportApplicationsCSV}
            >
              Esporta Candidature (CSV)
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<PictureAsPdf />}
              fullWidth
              onClick={handleExportApplicationsPDF}
            >
              Esporta Candidature (PDF)
            </Button>
            
            <Divider />
            
            <Typography variant="subtitle2" color="text.secondary">
              Contatti
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<TableChart />}
              fullWidth
              onClick={handleExportContactsCSV}
            >
              Esporta Contatti (CSV)
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<ContactMail />}
              fullWidth
              onClick={handleExportContactsVCard}
            >
              Esporta Contatti (vCard)
            </Button>
            
            <Divider />
            
            <Typography variant="subtitle2" color="text.secondary">
              Backup Completo
            </Typography>
            <Button 
              variant="contained" 
              color="success" 
              startIcon={<FileDownload />}
              fullWidth
              onClick={handleExportData}
            >
              {t('settings.exportAllData')}
            </Button>
            <Typography variant="caption" color="text.secondary">
              Esporta tutti i dati (candidature, CV, contatti) in formato JSON
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Workflows */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlayArrow sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Automazioni</Typography>
              <HelpTooltip
                title="Automazioni"
                content="Crea workflow automatici che si attivano quando accadono eventi specifici (es: candidatura creata, status cambiato). Puoi automatizzare azioni come aggiungere tag, aggiornare status, inviare email o creare contatti."
              />
            </Box>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => {
                setSelectedWorkflow(null);
                setWorkflowDialogOpen(true);
              }}
            >
              Nuovo
            </Button>
          </Box>
          
          {workflowsLoading ? (
            <Typography variant="body2" color="text.secondary">
              Caricamento automazioni...
            </Typography>
          ) : workflows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nessuna automazione. Crea la tua prima automazione!
            </Typography>
          ) : (
            <Stack spacing={1}>
              {workflows.map((workflow) => (
                <Box
                  key={workflow.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {workflow.name}
                      </Typography>
                      <Chip
                        label={workflow.enabled ? 'Attivo' : 'Disattivo'}
                        color={workflow.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {workflow.description || 'Nessuna descrizione'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Trigger: {workflow.trigger.type === 'application_created' ? 'Candidatura creata' :
                               workflow.trigger.type === 'application_status_changed' ? 'Status cambiato' :
                               workflow.trigger.type === 'interview_scheduled' ? 'Colloquio programmato' :
                               workflow.trigger.type === 'follow_up_due' ? 'Follow-up scaduto' : 'Manuale'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => {
                        setSelectedWorkflow(workflow);
                        setWorkflowDialogOpen(true);
                      }}
                    >
                      Modifica
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={async () => {
                        if (workflow.id && window.confirm('Sei sicuro di voler eliminare questa automazione?')) {
                          try {
                            await deleteWorkflow(workflow.id);
                            await fetchWorkflows();
                          } catch (error) {
                            console.error('Error deleting workflow:', error);
                            alert('Errore nell\'eliminazione dell\'automazione');
                          }
                        }
                      }}
                    >
                      Elimina
                    </Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Tutorial */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <School sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Tutorial</Typography>
          </Box>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Rivedi il tutorial iniziale per scoprire tutte le funzionalità dell'applicazione.
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<School />}
              onClick={() => {
                localStorage.removeItem('onboarding_completed');
                localStorage.removeItem('onboarding_skipped');
                setShowOnboarding(true);
              }}
            >
              Mostra Tutorial
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Description sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Template</Typography>
              <HelpTooltip
                title="Template"
                content="Crea template riutilizzabili per email, cover letter e thank you. Usa variabili dinamiche come {{company}} e {{jobTitle}} che verranno sostituite automaticamente."
              />
            </Box>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => handleCreateTemplate('email')}
            >
              Nuovo
            </Button>
          </Box>
          
          {templatesLoading ? (
            <Typography variant="body2" color="text.secondary">
              Caricamento template...
            </Typography>
          ) : templates.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nessun template. Crea il tuo primo template!
            </Typography>
          ) : (
            <Stack spacing={1}>
              {templates.map((template) => (
                <Box
                  key={template.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {template.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tipo: {template.type === 'email' ? 'Email' : template.type === 'cover_letter' ? 'Cover Letter' : 'Thank You'}
                      {template.isDefault && ' • Predefinito'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleEditTemplate(template)}
                    >
                      Modifica
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => template.id && handleDeleteTemplate(template.id)}
                    >
                      Elimina
                    </Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Security sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">{t('settings.privacySecurity')}</Typography>
          </Box>
          <Stack spacing={2}>
            <Button variant="outlined" fullWidth>
              {t('settings.changePassword')}
            </Button>
            <Divider />
            <Button variant="outlined" color="error" fullWidth>
              {t('settings.deleteAccount')}
            </Button>
            <Typography variant="caption" color="error" textAlign="center">
              {t('settings.irreversible')}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Template Dialog */}
      <TemplateDialog
        open={templateDialogOpen}
        onClose={() => {
          setTemplateDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate || undefined}
        type={templateType}
        onSave={handleTemplateSaved}
      />

      {/* Workflow Dialog */}
      <WorkflowDialog
        open={workflowDialogOpen}
        onClose={() => {
          setWorkflowDialogOpen(false);
          setSelectedWorkflow(null);
        }}
        workflow={selectedWorkflow || undefined}
        onSave={async () => {
          await fetchWorkflows();
        }}
      />

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined">{t('settings.cancel')}</Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
        >
          {t('settings.saveChanges')}
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
