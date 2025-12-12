import React from 'react';
import { Box, TextField, Chip } from '@mui/material';
import { useTranslation } from '../../hooks/useTranslation';
import type { ApplicationFormData } from '../../types';

interface ApplicationTagsProps {
  formData: ApplicationFormData;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onDeleteTag: (tag: string) => void;
}

export const ApplicationTags: React.FC<ApplicationTagsProps> = ({
  formData,
  tagInput,
  onTagInputChange,
  onAddTag,
  onDeleteTag,
}) => {
  const { t } = useTranslation();

  return (
    <Box>
      <TextField
        fullWidth
        label={t('applicationForm.tags')}
        value={tagInput}
        onChange={(e) => onTagInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onAddTag();
          }
        }}
        helperText={t('applicationForm.tagsHelper')}
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {formData.tags.map((tag) => (
          <Chip key={tag} label={tag} onDelete={() => onDeleteTag(tag)} />
        ))}
      </Box>
    </Box>
  );
};

