import jsPDF from 'jspdf';

/**
 * Generate a professional PDF from optimized CV text
 */
export const generatePDFFromText = (
  cvText: string,
  companyName: string,
  jobTitle?: string
): Blob => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Configure fonts and spacing
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  const lineHeight = 7;
  let yPosition = margin;

  // Header with company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`CV - ${companyName}`, margin, yPosition);
  yPosition += lineHeight * 1.5;

  if (jobTitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text(jobTitle, margin, yPosition);
    yPosition += lineHeight * 1.5;
  }

  // Add separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += lineHeight;

  // Process CV text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  // Split text into paragraphs
  const paragraphs = cvText.split('\n\n');

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) return;

    // Check if it's a section header (all caps or starts with special chars)
    const isHeader = /^[A-Z\s&-]{3,}$/.test(paragraph.trim()) || 
                     /^(EXPERIENCE|EDUCATION|SKILLS|PROFESSIONAL|SUMMARY|CONTACT|ADDITIONAL)/i.test(paragraph);

    if (isHeader) {
      // Section header
      yPosition += lineHeight * 0.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      
      const lines = doc.splitTextToSize(paragraph.trim(), maxWidth);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      
      yPosition += lineHeight * 0.3;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    } else {
      // Regular paragraph
      const lines = doc.splitTextToSize(paragraph.trim(), maxWidth);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      yPosition += lineHeight * 0.5;
    }
  });

  // Footer removed - no branding

  // Return as Blob
  return doc.output('blob');
};

/**
 * Generate filename for optimized CV
 */
export const generateCVFilename = (companyName: string): string => {
  // Sanitize company name (remove special chars)
  const sanitized = companyName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
  
  return `CV-${sanitized}.pdf`;
};

