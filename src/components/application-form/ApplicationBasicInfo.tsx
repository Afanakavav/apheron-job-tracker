import React from 'react';
import { Box, TextField, FormControlLabel, Switch, IconButton, Tooltip } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useTranslation } from '../../hooks/useTranslation';
import type { Application, ApplicationFormData } from '../../types';

interface ApplicationBasicInfoProps {
  formData: ApplicationFormData;
  application?: Application | null;
  onChange: (field: keyof ApplicationFormData, value: any) => void;
  onOpenCompanyResearch?: (companyNameOrApplication: string | Application) => void;
}

export const ApplicationBasicInfo: React.FC<ApplicationBasicInfoProps> = ({
  formData,
  application,
  onChange,
  onOpenCompanyResearch,
}) => {
  const { t } = useTranslation();

  const isLocked = !!(application && application.status !== 'saved');

  return (
    <>
      {/* Titolo Posizione (obbligatorio) */}
      <TextField
        fullWidth
        required
        label={t('applicationForm.jobTitle')}
        value={formData.jobTitle}
        onChange={(e) => onChange('jobTitle', e.target.value)}
        disabled={isLocked}
        helperText={isLocked ? '🔒 Non modificabile dopo aver candidato' : ''}
      />

      {/* Azienda (obbligatorio) con pulsante Company Research */}
      <Box sx={{ position: 'relative' }}>
        <TextField
          fullWidth
          required
          label={t('applicationForm.company')}
          value={formData.company}
          onChange={(e) => onChange('company', e.target.value)}
          disabled={isLocked}
          helperText={isLocked ? '🔒 Non modificabile dopo aver candidato' : ''}
          InputProps={{
            endAdornment: onOpenCompanyResearch && (
              <Tooltip title={formData.company ? "Ricerca informazioni azienda con AI" : "Inserisci nome azienda"}>
                <span>
                  <IconButton
                    edge="end"
                    onClick={() => {
                      if (formData.company && onOpenCompanyResearch) {
                        if (application) {
                          onOpenCompanyResearch(application);
                        } else if (formData.jobTitle && formData.company) {
                          const tempApp = {
                            id: '',
                            userId: '',
                            jobTitle: formData.jobTitle,
                            company: formData.company,
                            status: 'saved' as const,
                          } as Application;
                          onOpenCompanyResearch(tempApp);
                        } else {
                          onOpenCompanyResearch(formData.company);
                        }
                      }
                    }}
                    size="small"
                    disabled={!formData.company}
                    sx={{ color: '#2e7d32' }}
                  >
                    <SearchIcon />
                  </IconButton>
                </span>
              </Tooltip>
            ),
          }}
        />
      </Box>

      {/* Location con toggle Remote */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
        <TextField
          fullWidth
          label={t('applicationForm.location')}
          value={formData.location}
          onChange={(e) => onChange('location', e.target.value)}
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.isRemote}
              onChange={(e) => onChange('isRemote', e.target.checked)}
            />
          }
          label={t('applicationForm.isRemote')}
        />
      </Box>
    </>
  );
};

