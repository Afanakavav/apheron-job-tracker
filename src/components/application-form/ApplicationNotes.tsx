import React from 'react';
import { TextField } from '@mui/material';
import { useTranslation } from '../../hooks/useTranslation';
import type { ApplicationFormData } from '../../types';

interface ApplicationNotesProps {
  formData: ApplicationFormData;
  onChange: (field: keyof ApplicationFormData, value: any) => void;
}

export const ApplicationNotes: React.FC<ApplicationNotesProps> = ({
  formData,
  onChange,
}) => {
  const { t } = useTranslation();

  return (
    <TextField
      fullWidth
      multiline
      rows={3}
      label={t('applicationForm.notes')}
      value={formData.notes}
      onChange={(e) => onChange('notes', e.target.value)}
    />
  );
};

