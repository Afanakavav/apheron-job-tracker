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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
  Divider,
  IconButton,
  Alert,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ErrorAlert } from './ErrorAlert';
import type { Workflow, WorkflowTrigger, WorkflowAction } from '../services/workflowService';

interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  workflow?: Workflow;
  onSave: () => void;
}

export const WorkflowDialog: React.FC<WorkflowDialogProps> = ({
  open,
  onClose,
  workflow,
  onSave,
}) => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [triggerType, setTriggerType] = useState<WorkflowTrigger['type']>('application_created');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      setDescription(workflow.description || '');
      setEnabled(workflow.enabled);
      setTriggerType(workflow.trigger.type);
      setTriggerConfig(workflow.trigger.type !== 'manual' ? (workflow.trigger as any).filters || {} : {});
      setActions(workflow.actions);
    } else {
      setName('');
      setDescription('');
      setEnabled(true);
      setTriggerType('application_created');
      setTriggerConfig({});
      setActions([]);
    }
  }, [workflow, open]);

  const handleSave = async () => {
    if (!currentUser || !name.trim()) {
      setError('Il nome è obbligatorio');
      return;
    }

    if (actions.length === 0) {
      setError('Aggiungi almeno un\'azione');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { createWorkflow, updateWorkflow } = await import('../services/workflowService');

      const trigger: WorkflowTrigger = triggerType === 'manual'
        ? { type: 'manual' }
        : triggerType === 'application_status_changed'
        ? {
            type: 'application_status_changed',
            fromStatus: triggerConfig.fromStatus,
            toStatus: triggerConfig.toStatus || 'applied',
          }
        : triggerType === 'interview_scheduled'
        ? {
            type: 'interview_scheduled',
            daysBefore: triggerConfig.daysBefore || 1,
          }
        : { type: triggerType, filters: triggerConfig };

      const workflowData: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: currentUser.uid,
        name,
        description: description || undefined,
        trigger,
        actions,
        enabled,
      };

      if (workflow?.id) {
        await updateWorkflow(workflow.id, workflowData);
      } else {
        await createWorkflow(workflowData);
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Errore nel salvataggio del workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAction = () => {
    setActions([
      ...actions,
      { type: 'add_tag', tag: '' } as WorkflowAction,
    ]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleUpdateAction = (index: number, updates: Partial<WorkflowAction>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates } as WorkflowAction;
    setActions(newActions);
  };

  const renderActionEditor = (action: WorkflowAction, index: number) => {
    switch (action.type) {
      case 'add_tag':
        return (
          <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Aggiungi Tag</Typography>
              <IconButton size="small" onClick={() => handleRemoveAction(index)}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
            <TextField
              size="small"
              label="Tag"
              value={(action as any).tag || ''}
              onChange={(e) => handleUpdateAction(index, { tag: e.target.value } as any)}
              fullWidth
            />
          </Box>
        );

      case 'update_status':
        return (
          <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Aggiorna Status</Typography>
              <IconButton size="small" onClick={() => handleRemoveAction(index)}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Nuovo Status</InputLabel>
              <Select
                value={(action as any).status || 'applied'}
                onChange={(e) => handleUpdateAction(index, { status: e.target.value } as any)}
                label="Nuovo Status"
              >
                <MenuItem value="saved">Salvata</MenuItem>
                <MenuItem value="applied">Candidata</MenuItem>
                <MenuItem value="interview">Colloquio</MenuItem>
                <MenuItem value="offer">Offerta</MenuItem>
                <MenuItem value="rejected">Rifiutata</MenuItem>
                <MenuItem value="archived">Archiviata</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 'send_email':
        return (
          <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Invia Email</Typography>
              <IconButton size="small" onClick={() => handleRemoveAction(index)}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
            <Stack spacing={2}>
              <TextField
                size="small"
                label="Destinatario"
                value={(action as any).to || ''}
                onChange={(e) => handleUpdateAction(index, { to: e.target.value } as any)}
                placeholder="email@example.com o {{contactEmail}}"
                fullWidth
              />
              <TextField
                size="small"
                label="Oggetto"
                value={(action as any).subject || ''}
                onChange={(e) => handleUpdateAction(index, { subject: e.target.value } as any)}
                fullWidth
              />
              <TextField
                size="small"
                label="Corpo"
                value={(action as any).body || ''}
                onChange={(e) => handleUpdateAction(index, { body: e.target.value } as any)}
                multiline
                rows={3}
                fullWidth
              />
            </Stack>
          </Box>
        );

      case 'create_contact':
        return (
          <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Crea Contatto</Typography>
              <IconButton size="small" onClick={() => handleRemoveAction(index)}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
            <Stack spacing={2}>
              <TextField
                size="small"
                label="Nome"
                value={(action as any).data?.name || ''}
                onChange={(e) => handleUpdateAction(index, {
                  data: { ...(action as any).data, name: e.target.value },
                } as any)}
                fullWidth
              />
              <TextField
                size="small"
                label="Email"
                value={(action as any).data?.email || ''}
                onChange={(e) => handleUpdateAction(index, {
                  data: { ...(action as any).data, email: e.target.value },
                } as any)}
                fullWidth
              />
              <TextField
                size="small"
                label="Azienda"
                value={(action as any).data?.company || ''}
                onChange={(e) => handleUpdateAction(index, {
                  data: { ...(action as any).data, company: e.target.value },
                } as any)}
                fullWidth
              />
            </Stack>
          </Box>
        );

      case 'set_reminder':
        return (
          <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Imposta Promemoria</Typography>
              <IconButton size="small" onClick={() => handleRemoveAction(index)}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
            <Stack spacing={2}>
              <TextField
                size="small"
                label="Messaggio"
                value={(action as any).message || ''}
                onChange={(e) => handleUpdateAction(index, { message: e.target.value } as any)}
                fullWidth
              />
              <TextField
                size="small"
                type="datetime-local"
                label="Data"
                value={(action as any).date ? new Date((action as any).date).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleUpdateAction(index, { date: new Date(e.target.value) } as any)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {workflow ? 'Modifica Workflow' : 'Nuovo Workflow'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <ErrorAlert error={error} />
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          <TextField
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Descrizione"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          <FormControl fullWidth>
            <InputLabel>Trigger</InputLabel>
            <Select
              value={triggerType}
              onChange={(e) => {
                setTriggerType(e.target.value as WorkflowTrigger['type']);
                setTriggerConfig({});
              }}
              label="Trigger"
            >
              <MenuItem value="application_created">Candidatura creata</MenuItem>
              <MenuItem value="application_status_changed">Status candidatura cambiato</MenuItem>
              <MenuItem value="interview_scheduled">Colloquio programmato</MenuItem>
              <MenuItem value="follow_up_due">Follow-up scaduto</MenuItem>
              <MenuItem value="manual">Manuale</MenuItem>
            </Select>
          </FormControl>

          {triggerType === 'application_status_changed' && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Da Status</InputLabel>
                <Select
                  value={triggerConfig.fromStatus || ''}
                  onChange={(e) => setTriggerConfig({ ...triggerConfig, fromStatus: e.target.value })}
                  label="Da Status"
                >
                  <MenuItem value="">Qualsiasi</MenuItem>
                  <MenuItem value="saved">Salvata</MenuItem>
                  <MenuItem value="applied">Candidata</MenuItem>
                  <MenuItem value="interview">Colloquio</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>A Status</InputLabel>
                <Select
                  value={triggerConfig.toStatus || 'applied'}
                  onChange={(e) => setTriggerConfig({ ...triggerConfig, toStatus: e.target.value })}
                  label="A Status"
                >
                  <MenuItem value="applied">Candidata</MenuItem>
                  <MenuItem value="interview">Colloquio</MenuItem>
                  <MenuItem value="offer">Offerta</MenuItem>
                  <MenuItem value="rejected">Rifiutata</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}

          {triggerType === 'interview_scheduled' && (
            <TextField
              type="number"
              label="Giorni prima del colloquio"
              value={triggerConfig.daysBefore || 1}
              onChange={(e) => setTriggerConfig({ ...triggerConfig, daysBefore: parseInt(e.target.value) || 1 })}
              fullWidth
              inputProps={{ min: 1 }}
            />
          )}

          <Divider />

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Azioni</Typography>
              <Button
                startIcon={<Add />}
                onClick={handleAddAction}
                size="small"
                variant="outlined"
              >
                Aggiungi Azione
              </Button>
            </Box>

            {actions.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>Aggiungi almeno un'azione al workflow</Alert>
            ) : (
              <Box>
                {actions.map((action, index) => (
                  <Box key={index}>
                    {action.type === 'add_tag' && renderActionEditor(action, index)}
                    {action.type === 'update_status' && renderActionEditor(action, index)}
                    {action.type === 'send_email' && renderActionEditor(action, index)}
                    {action.type === 'create_contact' && renderActionEditor(action, index)}
                    {action.type === 'set_reminder' && renderActionEditor(action, index)}
                  </Box>
                ))}
              </Box>
            )}

            {actions.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Aggiungi Nuova Azione</InputLabel>
                  <Select
                    value=""
                    onChange={(e) => {
                      const actionType = e.target.value as string;
                      if (!actionType) return;
                      if (actionType === 'add_tag') {
                        setActions([...actions, { type: 'add_tag', tag: '' } as WorkflowAction]);
                      } else if (actionType === 'update_status') {
                        setActions([...actions, { type: 'update_status', status: 'applied' } as WorkflowAction]);
                      } else if (actionType === 'send_email') {
                        setActions([...actions, { type: 'send_email', to: '', subject: '', body: '' } as WorkflowAction]);
                      } else if (actionType === 'create_contact') {
                        setActions([...actions, { type: 'create_contact', data: { name: '', email: '', company: '' } } as WorkflowAction]);
                      } else if (actionType === 'set_reminder') {
                        setActions([...actions, { type: 'set_reminder', message: '', date: new Date() } as WorkflowAction]);
                      }
                    }}
                    label="Aggiungi Nuova Azione"
                  >
                    <MenuItem value="add_tag">Aggiungi Tag</MenuItem>
                    <MenuItem value="update_status">Aggiorna Status</MenuItem>
                    <MenuItem value="send_email">Invia Email</MenuItem>
                    <MenuItem value="create_contact">Crea Contatto</MenuItem>
                    <MenuItem value="set_reminder">Imposta Promemoria</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
            }
            label="Workflow attivo"
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

