import React from 'react';
import { Box, Divider, Typography, FormControlLabel, Switch, TextField } from '@mui/material';
import { useTranslation } from '../../hooks/useTranslation';
import type { ApplicationFormData } from '../../types';

interface ApplicationFollowUpProps {
  formData: ApplicationFormData;
  onChange: (field: keyof ApplicationFormData, value: any) => void;
}

export const ApplicationFollowUp: React.FC<ApplicationFollowUpProps> = ({
  formData,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        📅 {t('applicationForm.followUp')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.followUpEnabled || false}
              onChange={(e) => onChange('followUpEnabled', e.target.checked)}
              color="primary"
            />
          }
          label={t('applicationForm.enableFollowUpReminder')}
        />
        {formData.followUpEnabled && (
          <TextField
            type="date"
            label={t('applicationForm.nextFollowUp')}
            value={
              formData.nextFollowUpDate
                ? formData.nextFollowUpDate instanceof Date
                  ? formData.nextFollowUpDate.toISOString().split('T')[0]
                  : new Date(formData.nextFollowUpDate).toISOString().split('T')[0]
                : ''
            }
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : undefined;
              onChange('nextFollowUpDate', date);
            }}
            InputLabelProps={{ shrink: true }}
            helperText={t('applicationForm.followUpHelperText')}
            fullWidth
          />
        )}
      </Box>
    </Box>
  );
};

