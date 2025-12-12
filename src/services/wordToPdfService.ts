import { jsPDF } from 'jspdf';
import * as mammoth from 'mammoth';

/**
 * Convert a Word document (.docx) to PDF
 * This is a simplified conversion that extracts text and formatting
 */
export const convertWordToPDF = async (wordBlob: Blob): Promise<Blob> => {
  try {
    // Extract text from Word document
    const arrayBuffer = await wordBlob.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = 15;
    const maxWidth = pageWidth - 2 * margins;

    let yPosition = 20;

    // Split text into lines
    const lines = text.split('\n');

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        yPosition += 5; // Add spacing for empty lines
        return;
      }

      // Check if it's a header (all caps, short)
      const isHeader = 
        /^[A-Z\s&-]{3,}$/.test(trimmedLine) ||
        /^(PROFESSIONAL|EXPERIENCE|EDUCATION|SKILLS|SUMMARY|CONTACT|CERTIFICATIONS|LANGUAGES)/i.test(trimmedLine);

      if (isHeader) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(46, 116, 181); // Blue color
        
        const wrappedHeader = doc.splitTextToSize(trimmedLine, maxWidth);
        doc.text(wrappedHeader, margins, yPosition);
        yPosition += wrappedHeader.length * 7 + 3;
        
        // Add underline
        doc.setDrawColor(46, 116, 181);
        doc.setLineWidth(0.5);
        doc.line(margins, yPosition, pageWidth - margins, yPosition);
        yPosition += 5;
      } else {
        // Regular text
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        const wrappedText = doc.splitTextToSize(trimmedLine, maxWidth);
        doc.text(wrappedText, margins, yPosition);
        yPosition += wrappedText.length * 6;
      }

      // Check if we need a new page
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
    });

    // Footer removed - no branding

    // Generate PDF blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  } catch (error) {
    console.error('Error converting Word to PDF:', error);
    throw new Error('Errore nella conversione Word → PDF. Verifica che il file sia un valido documento Word.');
  }
};

/**
 * Generate a PDF filename from a Word filename
 */
export const generatePDFFilename = (wordFilename: string): string => {
  return wordFilename.replace(/\.docx$/i, '.pdf');
};

