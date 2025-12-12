import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Add, Close } from '@mui/icons-material';
import type { WidgetConfig } from './WidgetContainer';

interface DashboardSettingsProps {
  open: boolean;
  onClose: () => void;
  widgets: WidgetConfig[];
  onAddWidget: (type: WidgetConfig['type']) => void;
  onRemoveWidget: (id: string) => void;
  onToggleWidget: (id: string, enabled: boolean) => void;
}

const availableWidgets: { type: WidgetConfig['type']; title: string; description: string; icon: string }[] = [
  {
    type: 'statistics',
    title: 'Statistiche',
    description: 'Mostra statistiche principali (candidature totali, in processo, etc.)',
    icon: '📊',
  },
  {
    type: 'chart',
    title: 'Grafici',
    description: 'Grafici e trend delle candidature',
    icon: '📈',
  },
  {
    type: 'list',
    title: 'Lista',
    description: 'Lista candidature recenti o importanti',
    icon: '📋',
  },
  {
    type: 'calendar',
    title: 'Calendario',
    description: 'Prossimi colloqui e scadenze',
    icon: '📅',
  },
];

export const DashboardSettings: React.FC<DashboardSettingsProps> = ({
  open,
  onClose,
  widgets,
  onAddWidget,
  onRemoveWidget,
  onToggleWidget,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Personalizza Dashboard</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          Widget Disponibili
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
          {availableWidgets.map((widget) => (
            <Box key={widget.type} sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 3 },
                }}
                onClick={() => onAddWidget(widget.type)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h4">{widget.icon}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {widget.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {widget.description}
                      </Typography>
                    </Box>
                    <Add color="primary" />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>

        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          Widget Attivi
        </Typography>
        {widgets.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Nessun widget attivo. Aggiungi un widget dalla sezione sopra.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {widgets.map((widget) => (
              <Card key={widget.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {widget.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tipo: {widget.type}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={true}
                            onChange={(e) => onToggleWidget(widget.id, e.target.checked)}
                          />
                        }
                        label="Attivo"
                      />
                      <IconButton
                        size="small"
                        onClick={() => onRemoveWidget(widget.id)}
                        color="error"
                      >
                        <Close />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
};

