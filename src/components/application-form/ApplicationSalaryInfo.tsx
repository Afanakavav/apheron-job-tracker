import React from 'react';
import { Box, TextField, MenuItem } from '@mui/material';
import { useTranslation } from '../../hooks/useTranslation';
import type { ApplicationFormData } from '../../types';

interface ApplicationSalaryInfoProps {
  formData: ApplicationFormData;
  onChange: (field: keyof ApplicationFormData, value: any) => void;
}

export const ApplicationSalaryInfo: React.FC<ApplicationSalaryInfoProps> = ({
  formData,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
      <TextField
        fullWidth
        type="number"
        label={t('applicationForm.salaryMin')}
        value={formData.salaryMin || ''}
        onChange={(e) => onChange('salaryMin', e.target.value ? Number(e.target.value) : undefined)}
      />
      <TextField
        fullWidth
        type="number"
        label={t('applicationForm.salaryMax')}
        value={formData.salaryMax || ''}
        onChange={(e) => onChange('salaryMax', e.target.value ? Number(e.target.value) : undefined)}
      />
      <TextField
        fullWidth
        select
        label={t('applicationForm.currency')}
        value={formData.salaryCurrency}
        onChange={(e) => onChange('salaryCurrency', e.target.value)}
      >
        <MenuItem value="EUR">EUR</MenuItem>
        <MenuItem value="USD">USD</MenuItem>
        <MenuItem value="GBP">GBP</MenuItem>
      </TextField>
    </Box>
  );
};

