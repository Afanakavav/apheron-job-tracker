import React from 'react';
import { Box, TextField, ToggleButton, ToggleButtonGroup, IconButton, Tooltip, Typography } from '@mui/material';
import {
  Link as LinkIcon,
  Description as DescriptionIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import type { Application, ApplicationFormData } from '../../types';

interface ApplicationJobDescriptionProps {
  formData: ApplicationFormData;
  application?: Application | null;
  jobDescInputType: 'url' | 'text';
  onJobDescInputTypeChange: (type: 'url' | 'text') => void;
  onChange: (field: keyof ApplicationFormData, value: any) => void;
  onOpenJobAnalyzer?: (jobDescriptionTextOrApplication: string | Application) => void;
  currentUser?: { uid: string } | null;
}

export const ApplicationJobDescription: React.FC<ApplicationJobDescriptionProps> = ({
  formData,
  application,
  jobDescInputType,
  onJobDescInputTypeChange,
  onChange,
  onOpenJobAnalyzer,
  currentUser,
}) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Job Description
        </Typography>
        <ToggleButtonGroup
          value={jobDescInputType}
          exclusive
          onChange={(_, newType) => {
            if (newType) onJobDescInputTypeChange(newType);
          }}
          size="small"
        >
          <ToggleButton value="url">
            <Tooltip title="Inserisci URL">
              <LinkIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="text">
            <Tooltip title="Inserisci Testo">
              <DescriptionIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
        {onOpenJobAnalyzer && (
          <Tooltip title={
            (formData.jobUrl || formData.jobDescription)
              ? "Analizza Job Description con AI"
              : "Inserisci Job Description"
          }>
            <span>
              <IconButton
                onClick={() => {
                  const content = formData.jobUrl || formData.jobDescription;
                  if (content && onOpenJobAnalyzer) {
                    if (application) {
                      onOpenJobAnalyzer(application);
                    } else if (formData.jobTitle && formData.company) {
                      const tempApp = {
                        id: '',
                        userId: currentUser?.uid || '',
                        jobTitle: formData.jobTitle,
                        company: formData.company,
                        jobDescription: formData.jobDescription,
                        jobUrl: formData.jobUrl,
                        status: 'saved' as const,
                      } as Application;
                      onOpenJobAnalyzer(tempApp);
                    } else {
                      onOpenJobAnalyzer(content);
                    }
                  }
                }}
                size="small"
                disabled={!formData.jobUrl && !formData.jobDescription}
                sx={{ color: '#1976d2' }}
              >
                <AnalyticsIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
      
      {jobDescInputType === 'url' ? (
        <TextField
          fullWidth
          label="URL Job Description"
          value={formData.jobUrl}
          onChange={(e) => onChange('jobUrl', e.target.value)}
          placeholder="https://..."
        />
      ) : (
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Job Description"
          value={formData.jobDescription}
          onChange={(e) => onChange('jobDescription', e.target.value)}
          placeholder="Incolla qui la job description..."
        />
      )}
    </Box>
  );
};

