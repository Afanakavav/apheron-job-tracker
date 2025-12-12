import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

/**
 * Generate a professional Word document from optimized CV text
 */
export const generateWordFromText = async (
  cvText: string,
  companyName: string,
  jobTitle?: string
): Promise<Blob> => {
  // Parse CV text into sections
  const lines = cvText.split('\n').filter(line => line.trim());
  const paragraphs: Paragraph[] = [];

  // Add header with company name
  paragraphs.push(
    new Paragraph({
      text: `CV - ${companyName}`,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  if (jobTitle) {
    paragraphs.push(
      new Paragraph({
        text: jobTitle,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );
  }

  // Parse content
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    
    // Check if it's a section header (all caps, or starts with specific keywords)
    const isHeader = 
      /^[A-Z\s&-]{3,}$/.test(trimmedLine) || 
      /^(EXPERIENCE|EDUCATION|SKILLS|PROFESSIONAL|SUMMARY|CONTACT|ADDITIONAL|COMPETENZE|ESPERIENZE|ISTRUZIONE|RIEPILOGO)/i.test(trimmedLine);

    if (isHeader) {
      // Section header
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              bold: true,
              size: 28, // 14pt
              color: '2E74B5',
            }),
          ],
          spacing: { before: 300, after: 200 },
          border: {
            bottom: {
              color: '2E74B5',
              space: 1,
              style: 'single',
              size: 6,
            },
          },
        })
      );
    } else if (trimmedLine.match(/^\d{4}\s*-\s*\d{4}/)) {
      // Date range (e.g., "2020 - 2023")
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              italics: true,
              color: '7F7F7F',
            }),
          ],
          spacing: { before: 100, after: 50 },
        })
      );
    } else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
      // Bullet point
      paragraphs.push(
        new Paragraph({
          text: trimmedLine.substring(1).trim(),
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      );
    } else if (trimmedLine) {
      // Regular paragraph
      const isBold = trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length < 50;
      
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedLine,
              bold: isBold,
            }),
          ],
          spacing: { after: 150 },
        })
      );
    }
  });

  // Footer removed - no branding

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  // Generate blob
  const blob = await Packer.toBlob(doc);
  return blob;
};

/**
 * Generate filename for optimized CV (Word format)
 */
export const generateCVFilenameWord = (companyName: string): string => {
  // Sanitize company name (remove special chars)
  const sanitized = companyName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
  
  return `CV-${sanitized}.docx`;
};

/**
 * Generate a professional Word document from structured CV data
 */
export interface CVStructuredData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website: string;
  };
  summary: string;
  experiences: Array<{
    company: string;
    position: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    current: boolean;
    gpa: string;
  }>;
  skills: Array<{
    name: string;
    level: string;
  }>;
  certifications: string;
  languages: string;
}

export const generateWordFromStructuredData = async (
  data: CVStructuredData
): Promise<Blob> => {
  const paragraphs: Paragraph[] = [];

  // Header - Name
  paragraphs.push(
    new Paragraph({
      text: data.personalInfo.fullName.toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Contact Info
  const contactLines: string[] = [];
  if (data.personalInfo.email) contactLines.push(data.personalInfo.email);
  if (data.personalInfo.phone) contactLines.push(data.personalInfo.phone);
  if (data.personalInfo.location) contactLines.push(data.personalInfo.location);

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: contactLines.join(' | '),
          size: 20, // 10pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  // Links
  const linkLines: string[] = [];
  if (data.personalInfo.linkedin) linkLines.push(`LinkedIn: ${data.personalInfo.linkedin}`);
  if (data.personalInfo.github) linkLines.push(`GitHub: ${data.personalInfo.github}`);
  if (data.personalInfo.website) linkLines.push(`Website: ${data.personalInfo.website}`);

  if (linkLines.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: linkLines.join(' | '),
            size: 18, // 9pt
            color: '0563C1',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    );
  }

  // Summary Section
  if (data.summary) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'PROFESSIONAL SUMMARY',
            bold: true,
            size: 24, // 12pt
            color: '2E74B5',
          }),
        ],
        spacing: { before: 200, after: 150 },
        border: {
          bottom: {
            color: '2E74B5',
            space: 1,
            style: 'single',
            size: 6,
          },
        },
      })
    );
    paragraphs.push(
      new Paragraph({
        text: data.summary,
        spacing: { after: 300 },
      })
    );
  }

  // Experience Section
  if (data.experiences.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'PROFESSIONAL EXPERIENCE',
            bold: true,
            size: 24, // 12pt
            color: '2E74B5',
          }),
        ],
        spacing: { before: 200, after: 150 },
        border: {
          bottom: {
            color: '2E74B5',
            space: 1,
            style: 'single',
            size: 6,
          },
        },
      })
    );

    data.experiences.forEach((exp) => {
      // Position & Company
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${exp.position} - ${exp.company}`,
              bold: true,
              size: 22, // 11pt
            }),
          ],
          spacing: { before: 200, after: 50 },
        })
      );

      // Location & Dates
      const dateRange = exp.current
        ? `${exp.startDate} - Present`
        : `${exp.startDate} - ${exp.endDate}`;
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${exp.location} | ${dateRange}`,
              italics: true,
              color: '7F7F7F',
            }),
          ],
          spacing: { after: 100 },
        })
      );

      // Description
      if (exp.description) {
        exp.description.split('\n').forEach((line) => {
          if (line.trim()) {
            paragraphs.push(
              new Paragraph({
                text: line.trim(),
                bullet: { level: 0 },
                spacing: { after: 50 },
              })
            );
          }
        });
      }

      paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    });
  }

  // Education Section
  if (data.education.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'EDUCATION',
            bold: true,
            size: 24, // 12pt
            color: '2E74B5',
          }),
        ],
        spacing: { before: 200, after: 150 },
        border: {
          bottom: {
            color: '2E74B5',
            space: 1,
            style: 'single',
            size: 6,
          },
        },
      })
    );

    data.education.forEach((edu) => {
      // Degree & Field
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${edu.degree} in ${edu.field}`,
              bold: true,
              size: 22, // 11pt
            }),
          ],
          spacing: { before: 200, after: 50 },
        })
      );

      // Institution & Dates
      const dateRange = edu.current
        ? `${edu.startDate} - Present`
        : `${edu.startDate} - ${edu.endDate}`;
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${edu.institution} | ${dateRange}`,
              italics: true,
              color: '7F7F7F',
            }),
          ],
          spacing: { after: 50 },
        })
      );

      // GPA
      if (edu.gpa) {
        paragraphs.push(
          new Paragraph({
            text: `GPA: ${edu.gpa}`,
            spacing: { after: 100 },
          })
        );
      }

      paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
    });
  }

  // Skills Section
  if (data.skills.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'SKILLS',
            bold: true,
            size: 24, // 12pt
            color: '2E74B5',
          }),
        ],
        spacing: { before: 200, after: 150 },
        border: {
          bottom: {
            color: '2E74B5',
            space: 1,
            style: 'single',
            size: 6,
          },
        },
      })
    );

    data.skills.forEach((skill) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${skill.name}: `,
              bold: true,
            }),
            new TextRun({
              text: skill.level,
            }),
          ],
          bullet: { level: 0 },
          spacing: { after: 50 },
        })
      );
    });

    paragraphs.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Certifications Section
  if (data.certifications) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'CERTIFICATIONS',
            bold: true,
            size: 24, // 12pt
            color: '2E74B5',
          }),
        ],
        spacing: { before: 200, after: 150 },
        border: {
          bottom: {
            color: '2E74B5',
            space: 1,
            style: 'single',
            size: 6,
          },
        },
      })
    );

    data.certifications.split('\n').forEach((cert) => {
      if (cert.trim()) {
        paragraphs.push(
          new Paragraph({
            text: cert.trim(),
            bullet: { level: 0 },
            spacing: { after: 50 },
          })
        );
      }
    });

    paragraphs.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Languages Section
  if (data.languages) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'LANGUAGES',
            bold: true,
            size: 24, // 12pt
            color: '2E74B5',
          }),
        ],
        spacing: { before: 200, after: 150 },
        border: {
          bottom: {
            color: '2E74B5',
            space: 1,
            style: 'single',
            size: 6,
          },
        },
      })
    );

    data.languages.split('\n').forEach((lang) => {
      if (lang.trim()) {
        paragraphs.push(
          new Paragraph({
            text: lang.trim(),
            bullet: { level: 0 },
            spacing: { after: 50 },
          })
        );
      }
    });
  }

  // Footer removed - no branding

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  // Generate blob
  const blob = await Packer.toBlob(doc);
  return blob;
};

/**
 * Generate a Word document from HTML content (from Rich Text Editor)
 */
export const generateWordFromHTML = async (
  htmlContent: string,
  cvName: string
): Promise<Blob> => {
  const paragraphs: Paragraph[] = [];

  // Parse HTML and convert to paragraphs
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
  const body = htmlDoc.body;

  // Process each element
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        paragraphs.push(
          new Paragraph({
            text: text,
            spacing: { after: 100 },
          })
        );
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
        const level = tagName === 'h1' ? HeadingLevel.HEADING_1 : tagName === 'h2' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
        paragraphs.push(
          new Paragraph({
            text: element.textContent || '',
            heading: level,
            spacing: { before: 200, after: 150 },
          })
        );
      } else if (tagName === 'p') {
        const children: TextRun[] = [];
        element.childNodes.forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            children.push(new TextRun(child.textContent || ''));
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as HTMLElement;
            const childTag = childEl.tagName.toLowerCase();
            
            children.push(
              new TextRun({
                text: childEl.textContent || '',
                bold: childTag === 'strong' || childTag === 'b',
                italics: childTag === 'em' || childTag === 'i',
                underline: childTag === 'u' ? {} : undefined,
                strike: childTag === 'strike' || childTag === 's',
              })
            );
          }
        });

        paragraphs.push(
          new Paragraph({
            children: children.length > 0 ? children : [new TextRun(element.textContent || '')],
            spacing: { after: 150 },
          })
        );
      } else if (tagName === 'ul' || tagName === 'ol') {
        const items = element.querySelectorAll('li');
        items.forEach((li) => {
          paragraphs.push(
            new Paragraph({
              text: li.textContent || '',
              bullet: { level: 0 },
              spacing: { after: 50 },
            })
          );
        });
      } else if (tagName === 'br') {
        paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      } else {
        // Recursively process children
        element.childNodes.forEach(processNode);
      }
    }
  };

  body.childNodes.forEach(processNode);

  // Add header
  paragraphs.unshift(
    new Paragraph({
      text: cvName,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Footer removed - no branding

  // Create document
  const wordDoc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  // Generate blob
  const blob = await Packer.toBlob(wordDoc);
  return blob;
};
