import React from 'react';
import { TextField, MenuItem } from '@mui/material';
import { useTranslation } from '../../hooks/useTranslation';
import type { Application, ApplicationFormData, ApplicationStatus, JobSource } from '../../types';

interface ApplicationStatusInfoProps {
  formData: ApplicationFormData;
  application?: Application | null;
  onChange: (field: keyof ApplicationFormData, value: any) => void;
}

export const ApplicationStatusInfo: React.FC<ApplicationStatusInfoProps> = ({
  formData,
  application,
  onChange,
}) => {
  const { t } = useTranslation();

  const STATUSES: { value: ApplicationStatus; label: string }[] = [
    { value: 'saved', label: t('applicationStatus.saved') },
    { value: 'applied', label: t('applicationStatus.applied') },
    { value: 'interview_1', label: t('applicationStatus.interview1') },
    { value: 'interview_2', label: t('applicationStatus.interview2') },
    { value: 'interview_3', label: t('applicationStatus.interview3') },
    { value: 'interview_4', label: t('applicationStatus.interview4') },
    { value: 'offer', label: t('applicationStatus.offer') },
    { value: 'rejected', label: t('applicationStatus.rejected') },
  ];

  const SOURCES: { value: JobSource; label: string }[] = [
    { value: 'linkedin', label: t('sources.linkedin') },
    { value: 'indeed', label: t('sources.indeed') },
    { value: 'glassdoor', label: t('sources.glassdoor') },
    { value: 'company_website', label: t('sources.companyWebsite') },
    { value: 'referral', label: t('sources.referral') },
    { value: 'recruiter', label: t('sources.recruiter') },
    { value: 'other', label: t('sources.other') },
  ];

  const isLocked = !!(application && application.status !== 'saved');

  return (
    <>
      {/* Fonte */}
      <TextField
        fullWidth
        select
        label={t('applicationForm.source')}
        value={formData.source}
        onChange={(e) => onChange('source', e.target.value)}
        disabled={isLocked}
        helperText={isLocked ? '🔒 Non modificabile dopo aver candidato' : ''}
      >
        {SOURCES.map((source) => (
          <MenuItem key={source.value} value={source.value}>
            {source.label}
          </MenuItem>
        ))}
      </TextField>

      {/* Priorità */}
      <TextField
        fullWidth
        select
        label={t('applicationForm.priority')}
        value={formData.priority}
        onChange={(e) => onChange('priority', e.target.value)}
      >
        <MenuItem value="low">{t('applicationForm.low')}</MenuItem>
        <MenuItem value="medium">{t('applicationForm.medium')}</MenuItem>
        <MenuItem value="high">{t('applicationForm.high')}</MenuItem>
      </TextField>

      {/* Stato */}
      <TextField
        fullWidth
        select
        required
        label={t('applicationForm.status')}
        value={formData.status}
        onChange={(e) => onChange('status', e.target.value)}
      >
        {STATUSES.map((status) => (
          <MenuItem key={status.value} value={status.value}>
            {status.label}
          </MenuItem>
        ))}
      </TextField>
    </>
  );
};

