import type { Application, CV, Contact } from '../types';
// import { pdfGenerationService } from './pdfGenerationService';

/**
 * Export applications to JSON
 */
export const exportApplicationsJSON = (applications: Application[]): void => {
  const dataStr = JSON.stringify(applications, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  downloadFile(blob, `apheron-applications-${Date.now()}.json`);
};

/**
 * Export applications to CSV
 */
export const exportApplicationsCSV = (applications: Application[]): void => {
  if (applications.length === 0) {
    alert('Nessuna candidatura da esportare');
    return;
  }

  // CSV headers
  const headers = [
    'ID',
    'Company',
    'Job Title',
    'Location',
    'Remote',
    'Status',
    'Source',
    'Priority',
    'Applied Date',
    'Job URL',
    'Salary Min',
    'Salary Max',
    'Currency',
    'Notes',
    'Tags',
    'Created At',
    'Updated At',
  ];

  // Build CSV rows
  const rows = applications.map(app => [
    app.id,
    app.company,
    app.jobTitle,
    app.location,
    app.isRemote ? 'Yes' : 'No',
    app.status,
    app.source,
    app.priority,
    app.appliedDate ? app.appliedDate.toLocaleDateString() : '',
    app.jobUrl || '',
    app.salaryMin?.toString() || '',
    app.salaryMax?.toString() || '',
    app.salaryCurrency,
    app.notes || '',
    app.tags.join('; '),
    app.createdAt.toLocaleDateString(),
    app.updatedAt.toLocaleDateString(),
  ]);

  // Escape CSV values (handle commas and quotes)
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(val => escapeCSV(val)).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `apheron-applications-${Date.now()}.csv`);
};

/**
 * Export CVs data to JSON
 */
export const exportCVsJSON = (cvs: CV[]): void => {
  // Don't include file URLs in export for privacy
  const exportData = cvs.map(cv => ({
    id: cv.id,
    name: cv.name,
    fileName: cv.fileName,
    fileSize: cv.fileSize,
    category: cv.category,
    description: cv.description,
    tags: cv.tags,
    version: cv.version,
    createdAt: cv.createdAt,
    updatedAt: cv.updatedAt,
  }));

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  downloadFile(blob, `apheron-cvs-${Date.now()}.json`);
};

/**
 * Export all data (applications + CVs)
 */
export const exportAllData = (applications: Application[], cvs: CV[]): void => {
  const exportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    applications: applications,
    cvs: cvs.map(cv => ({
      id: cv.id,
      name: cv.name,
      fileName: cv.fileName,
      fileSize: cv.fileSize,
      category: cv.category,
      description: cv.description,
      tags: cv.tags,
      version: cv.version,
      createdAt: cv.createdAt,
      updatedAt: cv.updatedAt,
    })),
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  downloadFile(blob, `apheron-full-backup-${Date.now()}.json`);
};

/**
 * Helper to download file
 */
const downloadFile = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Export applications to PDF
 */
export const exportApplicationsPDF = async (applications: Application[]): Promise<void> => {
  if (applications.length === 0) {
    alert('Nessuna candidatura da esportare');
    return;
  }

  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;
    const lineHeight = 7;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Report Candidature', margin, yPosition);
    yPosition += lineHeight * 2;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Esportato il: ${new Date().toLocaleDateString('it-IT')}`, margin, yPosition);
    doc.text(`Totale candidature: ${applications.length}`, margin, yPosition + lineHeight);
    yPosition += lineHeight * 3;

    // Applications list
    applications.forEach((app, index) => {
      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPosition = margin;
      }

      // Application header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${app.jobTitle}`, margin, yPosition);
      yPosition += lineHeight;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Azienda: ${app.company}`, margin + 5, yPosition);
      yPosition += lineHeight;

      if (app.location) {
        doc.text(`Luogo: ${app.location}${app.isRemote ? ' (Remoto)' : ''}`, margin + 5, yPosition);
        yPosition += lineHeight;
      }

      doc.text(`Stato: ${app.status}`, margin + 5, yPosition);
      yPosition += lineHeight;

      if (app.appliedDate) {
        doc.text(`Data candidatura: ${app.appliedDate.toLocaleDateString('it-IT')}`, margin + 5, yPosition);
        yPosition += lineHeight;
      }

      if (app.notes) {
        const notesLines = doc.splitTextToSize(`Note: ${app.notes}`, pageWidth - margin * 2 - 10);
        doc.text(notesLines, margin + 5, yPosition);
        yPosition += lineHeight * notesLines.length;
      }

      yPosition += lineHeight; // Space between applications
    });

    // Save PDF
    const blob = doc.output('blob');
    downloadFile(blob, `apheron-applications-${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Errore durante la generazione del PDF');
  }
};

/**
 * Export contacts to vCard format
 */
export const exportContactsVCard = (contacts: Contact[]): void => {
  if (contacts.length === 0) {
    alert('Nessun contatto da esportare');
    return;
  }

  const vCardLines = contacts.map(contact => {
    const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];
    
    if (contact.name) {
      lines.push(`FN:${contact.name}`);
      const nameParts = contact.name.split(' ');
      if (nameParts.length >= 2) {
        lines.push(`N:${nameParts.slice(1).join(' ')};${nameParts[0]};;;`);
      } else {
        lines.push(`N:${contact.name};;;;`);
      }
    }
    
    if (contact.email) {
      lines.push(`EMAIL;TYPE=INTERNET:${contact.email}`);
    }
    
    if (contact.phone) {
      lines.push(`TEL;TYPE=CELL:${contact.phone}`);
    }
    
    if (contact.company) {
      lines.push(`ORG:${contact.company}`);
    }
    
    if (contact.role) {
      lines.push(`TITLE:${contact.role}`);
    }
    
    if (contact.linkedinUrl) {
      lines.push(`URL:${contact.linkedinUrl}`);
    }
    
    lines.push('END:VCARD');
    return lines.join('\n');
  });

  const vCardContent = vCardLines.join('\n\n');
  const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8' });
  downloadFile(blob, `apheron-contacts-${Date.now()}.vcf`);
};

/**
 * Export contacts to CSV
 */
export const exportContactsCSV = (contacts: Contact[]): void => {
  if (contacts.length === 0) {
    alert('Nessun contatto da esportare');
    return;
  }

  const headers = [
    'Name',
    'Email',
    'Phone',
    'Company',
    'Role',
    'Type',
    'LinkedIn URL',
    'Tags',
    'Last Contact Date',
    'Next Follow-Up Date',
    'Created At',
  ];

  const rows = contacts.map(contact => [
    contact.name,
    contact.email || '',
    contact.phone || '',
    contact.company || '',
    contact.role || '',
    contact.type,
    contact.linkedinUrl || '',
    contact.tags.join('; '),
    contact.lastContactDate ? contact.lastContactDate.toLocaleDateString() : '',
    contact.nextFollowUpDate ? contact.nextFollowUpDate.toLocaleDateString() : '',
    contact.createdAt.toLocaleDateString(),
  ]);

  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(val => escapeCSV(String(val))).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `apheron-contacts-${Date.now()}.csv`);
};

/**
 * Parse imported JSON data
 */
export const parseImportedJSON = (jsonString: string): { applications?: Application[]; cvs?: CV[] } | null => {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate data structure
    if (Array.isArray(data)) {
      // Old format: just applications array
      return { applications: data };
    } else if (data.applications || data.cvs) {
      // New format: object with applications and cvs
      return data;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
};

