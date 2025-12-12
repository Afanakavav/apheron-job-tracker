import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';
import { generateWordFromStructuredData } from '../services/wordGenerationService';
import { uploadCVFile, createCV } from '../services/cvService';
import { GAEvents } from '../services/googleAnalytics';

interface CVManualFormDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
  gpa: string;
}

interface Skill {
  id: string;
  name: string;
  level: string; // Beginner, Intermediate, Advanced, Expert
}

const CVManualFormDialog: React.FC<CVManualFormDialogProps> = ({
  open,
  onClose,
  userId,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
  });

  const [summary, setSummary] = useState('');
  
  const [experiences, setExperiences] = useState<Experience[]>([
    {
      id: Date.now().toString(),
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    },
  ]);

  const [education, setEducation] = useState<Education[]>([
    {
      id: Date.now().toString(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      current: false,
      gpa: '',
    },
  ]);

  const [skills, setSkills] = useState<Skill[]>([
    { id: Date.now().toString(), name: '', level: 'Intermediate' },
  ]);

  const [certifications, setCertifications] = useState<string>('');
  const [languages, setLanguages] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleAddExperience = () => {
    setExperiences(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        company: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
      },
    ]);
  };

  const handleRemoveExperience = (id: string) => {
    setExperiences(prev => prev.filter(exp => exp.id !== id));
  };

  const handleExperienceChange = (id: string, field: keyof Experience, value: any) => {
    setExperiences(prev =>
      prev.map(exp => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  const handleAddEducation = () => {
    setEducation(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        institution: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        current: false,
        gpa: '',
      },
    ]);
  };

  const handleRemoveEducation = (id: string) => {
    setEducation(prev => prev.filter(edu => edu.id !== id));
  };

  const handleEducationChange = (id: string, field: keyof Education, value: any) => {
    setEducation(prev =>
      prev.map(edu => (edu.id === id ? { ...edu, [field]: value } : edu))
    );
  };

  const handleAddSkill = () => {
    setSkills(prev => [...prev, { id: Date.now().toString(), name: '', level: 'Intermediate' }]);
  };

  const handleRemoveSkill = (id: string) => {
    setSkills(prev => prev.filter(skill => skill.id !== id));
  };

  const handleSkillChange = (id: string, field: keyof Skill, value: string) => {
    setSkills(prev =>
      prev.map(skill => (skill.id === id ? { ...skill, [field]: value } : skill))
    );
  };

  const handleGenerate = async () => {
    if (!personalInfo.fullName || !personalInfo.email) {
      setError(t('cvManual.errorRequired'));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const cvData = {
        personalInfo,
        summary,
        experiences: experiences.filter(exp => exp.company && exp.position),
        education: education.filter(edu => edu.institution && edu.degree),
        skills: skills.filter(skill => skill.name),
        certifications,
        languages,
      };

      const wordBlob = await generateWordFromStructuredData(cvData);
      const filename = `CV_${personalInfo.fullName.replace(/\s+/g, '_')}_${Date.now()}.docx`;
      const wordFile = new File([wordBlob], filename, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const uploadResult = await uploadCVFile(userId, wordFile);

      await createCV(userId, {
        name: `CV - ${personalInfo.fullName}`,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.url,
        fileSize: wordFile.size,
        tags: ['manual', 'generated'],
        category: 'General',
        description: `CV creato manualmente per ${personalInfo.fullName}`,
        folder: 'CV', // Auto-assign to CV folder for manually created CVs
      });

      setSuccessMessage(`✅ ${t('cvManual.successGenerated')} "${filename}"`);
      GAEvents.uploadCV('word');
      onSuccess();
      
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error generating CV:', err);
      setError(err.message || t('cvManual.errorGenerating'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError(null);
      setSuccessMessage(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('cvManual.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success" onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}

          {/* Personal Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('cvManual.personalInfo')}
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                required
                label={t('cvManual.fullName')}
                value={personalInfo.fullName}
                onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                disabled={saving}
              />
              <TextField
                fullWidth
                required
                label={t('cvManual.email')}
                type="email"
                value={personalInfo.email}
                onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                disabled={saving}
              />
              <TextField
                fullWidth
                label={t('cvManual.phone')}
                value={personalInfo.phone}
                onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                disabled={saving}
              />
              <TextField
                fullWidth
                label={t('cvManual.location')}
                value={personalInfo.location}
                onChange={(e) => handlePersonalInfoChange('location', e.target.value)}
                disabled={saving}
              />
              <TextField
                fullWidth
                label={t('cvManual.linkedin')}
                value={personalInfo.linkedin}
                onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                disabled={saving}
              />
              <TextField
                fullWidth
                label={t('cvManual.github')}
                value={personalInfo.github}
                onChange={(e) => handlePersonalInfoChange('github', e.target.value)}
                disabled={saving}
              />
              <TextField
                fullWidth
                label={t('cvManual.website')}
                value={personalInfo.website}
                onChange={(e) => handlePersonalInfoChange('website', e.target.value)}
                disabled={saving}
              />
            </Stack>
          </Box>

          <Divider />

          {/* Summary */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('cvManual.summary')}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label={t('cvManual.summaryPlaceholder')}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={saving}
            />
          </Box>

          <Divider />

          {/* Experience */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('cvManual.experience')}</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddExperience}
                disabled={saving}
                size="small"
              >
                {t('cvManual.add')}
              </Button>
            </Box>
            {experiences.map((exp, index) => (
              <Box key={exp.id} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2">{t('cvManual.experienceNum')}{index + 1}</Typography>
                  {experiences.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveExperience(exp.id)}
                      disabled={saving}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label={t('cvManual.company')}
                    value={exp.company}
                    onChange={(e) => handleExperienceChange(exp.id, 'company', e.target.value)}
                    disabled={saving}
                  />
                  <TextField
                    fullWidth
                    label={t('cvManual.position')}
                    value={exp.position}
                    onChange={(e) => handleExperienceChange(exp.id, 'position', e.target.value)}
                    disabled={saving}
                  />
                  <TextField
                    fullWidth
                    label={t('cvManual.location')}
                    value={exp.location}
                    onChange={(e) => handleExperienceChange(exp.id, 'location', e.target.value)}
                    disabled={saving}
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      label={t('cvManual.startDate')}
                      value={exp.startDate}
                      onChange={(e) => handleExperienceChange(exp.id, 'startDate', e.target.value)}
                      disabled={saving}
                      placeholder={t('cvManual.startDatePlaceholder')}
                    />
                    <TextField
                      fullWidth
                      label={t('cvManual.endDate')}
                      value={exp.endDate}
                      onChange={(e) => handleExperienceChange(exp.id, 'endDate', e.target.value)}
                      disabled={saving || exp.current}
                      placeholder={t('cvManual.endDatePlaceholder')}
                    />
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label={t('cvManual.description')}
                    value={exp.description}
                    onChange={(e) => handleExperienceChange(exp.id, 'description', e.target.value)}
                    disabled={saving}
                    placeholder={t('cvManual.descriptionPlaceholder')}
                  />
                </Stack>
              </Box>
            ))}
          </Box>

          <Divider />

          {/* Education */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('cvManual.education')}</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddEducation}
                disabled={saving}
                size="small"
              >
                {t('cvManual.add')}
              </Button>
            </Box>
            {education.map((edu, index) => (
              <Box key={edu.id} sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2">{t('cvManual.educationNum')}{index + 1}</Typography>
                  {education.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveEducation(edu.id)}
                      disabled={saving}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label={t('cvManual.institution')}
                    value={edu.institution}
                    onChange={(e) => handleEducationChange(edu.id, 'institution', e.target.value)}
                    disabled={saving}
                  />
                  <TextField
                    fullWidth
                    label={t('cvManual.degree')}
                    value={edu.degree}
                    onChange={(e) => handleEducationChange(edu.id, 'degree', e.target.value)}
                    disabled={saving}
                  />
                  <TextField
                    fullWidth
                    label={t('cvManual.field')}
                    value={edu.field}
                    onChange={(e) => handleEducationChange(edu.id, 'field', e.target.value)}
                    disabled={saving}
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      fullWidth
                      label={t('cvManual.startDate')}
                      value={edu.startDate}
                      onChange={(e) => handleEducationChange(edu.id, 'startDate', e.target.value)}
                      disabled={saving}
                      placeholder="2015"
                    />
                    <TextField
                      fullWidth
                      label={t('cvManual.endDate')}
                      value={edu.endDate}
                      onChange={(e) => handleEducationChange(edu.id, 'endDate', e.target.value)}
                      disabled={saving || edu.current}
                      placeholder="2019"
                    />
                  </Box>
                  <TextField
                    fullWidth
                    label={t('cvManual.gpa')}
                    value={edu.gpa}
                    onChange={(e) => handleEducationChange(edu.id, 'gpa', e.target.value)}
                    disabled={saving}
                  />
                </Stack>
              </Box>
            ))}
          </Box>

          <Divider />

          {/* Skills */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{t('cvManual.skills')}</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddSkill}
                disabled={saving}
                size="small"
              >
                {t('cvManual.add')}
              </Button>
            </Box>
            {skills.map((skill, index) => (
              <Box
                key={skill.id}
                sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}
              >
                <TextField
                  fullWidth
                  label={`${t('cvManual.skillNum')}${index + 1}`}
                  value={skill.name}
                  onChange={(e) => handleSkillChange(skill.id, 'name', e.target.value)}
                  disabled={saving}
                />
                <TextField
                  select
                  label={t('cvManual.skillLevel')}
                  value={skill.level}
                  onChange={(e) => handleSkillChange(skill.id, 'level', e.target.value)}
                  disabled={saving}
                  sx={{ minWidth: 150 }}
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="Beginner">{t('cvManual.beginner')}</option>
                  <option value="Intermediate">{t('cvManual.intermediate')}</option>
                  <option value="Advanced">{t('cvManual.advanced')}</option>
                  <option value="Expert">{t('cvManual.expert')}</option>
                </TextField>
                {skills.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveSkill(skill.id)}
                    disabled={saving}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>

          <Divider />

          {/* Additional Sections */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('cvManual.certifications')} & {t('cvManual.languages')}
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label={t('cvManual.addCertification')}
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                disabled={saving}
                placeholder={t('cvManual.certificationNamePlaceholder')}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label={t('cvManual.addLanguage')}
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                disabled={saving}
                placeholder={t('cvManual.languageNamePlaceholder')}
              />
            </Stack>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleGenerate}
          variant="contained"
          disabled={saving || !personalInfo.fullName || !personalInfo.email}
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          {saving ? t('cvManual.generating') : t('cvManual.generate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVManualFormDialog;

