# Dialog Manager - Guida all'Utilizzo

Il Dialog Manager centralizzato semplifica la gestione di tutti i dialog nell'applicazione.

## Utilizzo Base

```typescript
import { useDialogManager } from '../hooks/useDialogManager';
import { DialogManager } from '../components/DialogManager';

const MyComponent: React.FC = () => {
  const { dialogState, openDialog, closeDialog } = useDialogManager();

  const handleOpenApplicationForm = () => {
    openDialog('application-form', {
      application: null, // null per nuova applicazione, Application per modifica
    });
  };

  const handleOpenDeleteConfirm = (application: Application) => {
    openDialog('delete-confirmation', {
      applicationToDelete: application,
    });
  };

  return (
    <>
      <Button onClick={handleOpenApplicationForm}>Nuova Candidatura</Button>
      
      <DialogManager
        dialogState={dialogState}
        onClose={closeDialog}
        onApplicationFormSubmit={async (data) => {
          // Gestisci il submit
          await createApplication(data);
          closeDialog();
        }}
        onDeleteConfirm={async (applicationId, reason) => {
          // Gestisci l'eliminazione
          await deleteApplication(applicationId, reason);
          closeDialog();
        }}
      />
    </>
  );
};
```

## Tipi di Dialog Disponibili

- `'application-form'` - Form per creare/modificare candidatura
- `'quick-application'` - Dialog rapido per nuova candidatura
- `'cv-tailoring'` - Ottimizzazione CV con AI
- `'cover-letter-generator'` - Generazione Cover Letter con AI
- `'company-research'` - Ricerca azienda con AI
- `'job-analyzer'` - Analisi job description con AI
- `'cv-matcher'` - Matching CV con job description
- `'cv-upload'` - Upload CV/Cover Letter
- `'email-ai'` - Generazione email con AI
- `'delete-confirmation'` - Conferma eliminazione

## Esempio Completo

```typescript
const Applications: React.FC = () => {
  const { dialogState, openDialog, closeDialog, updateDialogData } = useDialogManager();

  const handleEdit = (application: Application) => {
    openDialog('application-form', { application });
  };

  const handleDelete = (application: Application) => {
    openDialog('delete-confirmation', { applicationToDelete: application });
  };

  const handleCVUploadSuccess = (cvId: string) => {
    // Aggiorna i dati del dialog se è aperto
    updateDialogData({ uploadedCVId: cvId });
  };

  return (
    <>
      {/* ... resto del componente ... */}
      
      <DialogManager
        dialogState={dialogState}
        onClose={closeDialog}
        onApplicationFormSubmit={handleCreateApplication}
        onQuickApplicationSubmit={handleQuickCreateApplication}
        onCoverLetterSuccess={handleSaveCoverLetter}
        onCVUploadSuccess={handleCVUploadSuccess}
        onDeleteConfirm={handleConfirmDelete}
        onOpenCompanyResearch={handleOpenCompanyResearch}
        onOpenJobAnalyzer={handleOpenJobAnalyzer}
        onUploadCV={handleUploadCV}
        onUploadCoverLetter={handleUploadCoverLetter}
        onAnalyzeCV={handleAnalyzeCV}
        onOptimizeCV={handleOptimizeCV}
        onGenerateCoverLetter={handleGenerateCoverLetter}
      />
    </>
  );
};
```

## Vantaggi

1. **Gestione centralizzata**: Un solo punto per tutti i dialog
2. **Codice più pulito**: Meno stati da gestire manualmente
3. **Type-safe**: TypeScript garantisce type safety
4. **Facile da estendere**: Aggiungere nuovi dialog è semplice

