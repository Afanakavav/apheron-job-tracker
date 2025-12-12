import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTranslation } from '../hooks/useTranslation';
import * as mammoth from 'mammoth';
import { generateWordFromHTML } from '../services/wordGenerationService';
import { uploadCVFile, updateCV } from '../services/cvService';
import type { CV, CVVersion } from '../types';

interface CVRichEditorDialogProps {
  open: boolean;
  onClose: () => void;
  cv: CV | null;
  userId: string;
  onSuccess: () => void;
}

const CVRichEditorDialog: React.FC<CVRichEditorDialogProps> = ({
  open,
  onClose,
  cv,
  userId,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (cv && open) {
      loadCVContent();
    }
  }, [cv, open]);

  const loadCVContent = async () => {
    if (!cv) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch Word file
      const response = await fetch(cv.fileUrl);
      const wordBlob = await response.blob();

      // Extract HTML from Word
      const arrayBuffer = await wordBlob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      setContent(result.value);
    } catch (err: any) {
      console.error('Error loading CV content:', err);
      setError('Errore nel caricamento del contenuto del CV');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!cv || !content) {
      setError('Nessun contenuto da salvare');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare previous version to save
      const previousVersion: CVVersion = {
        version: cv.version,
        fileUrl: cv.fileUrl,
        fileName: cv.fileName,
        fileSize: cv.fileSize,
        savedAt: new Date(),
      };

      // Add previous version to array (keep only last 5 versions)
      const versions = cv.versions || [];
      const updatedVersions = [previousVersion, ...versions].slice(0, 5);

      // Generate Word from HTML
      const wordBlob = await generateWordFromHTML(content, cv.name);
      const wordFile = new File([wordBlob], cv.fileName, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Upload new version
      const uploadResult = await uploadCVFile(userId, wordFile);

      // Update CV metadata with new version and history
      await updateCV(cv.id, {
        fileUrl: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: wordFile.size,
        version: cv.version + 1,
        versions: updatedVersions,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving CV:', err);
      setError(err.message || 'Errore nel salvataggio del CV');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setContent('');
      setError(null);
      onClose();
    }
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['link'],
      ['clean'],
    ],
  };

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'indent',
    'align',
    'link',
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('cvRichEditor.title')} - {cv?.name}
        <Typography variant="caption" display="block" color="text.secondary">
          {t('cvRichEditor.version')} {cv?.version} → {cv ? cv.version + 1 : ''}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>{t('cvRichEditor.loadingContent')}</Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              formats={formats}
              style={{ height: '400px', marginBottom: '50px' }}
              placeholder={t('cvRichEditor.placeholder')}
            />
          </Box>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>💡 {t('cvRichEditor.tipTitle')}:</strong> {t('cvRichEditor.tipText')} (v
            {cv ? cv.version + 1 : ''})
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving || loading}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || loading || !content}
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          {saving ? t('cvRichEditor.saving') : t('cvRichEditor.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVRichEditorDialog;

