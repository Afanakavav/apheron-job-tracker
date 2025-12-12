/**
 * AI Document Colors Utility
 * 
 * Determines the color for AI-generated documents based on their tags
 */

/**
 * AI function color mapping
 */
export const AI_DOCUMENT_COLORS: Record<string, string> = {
  'Company Research': '#2e7d32', // green
  'Job Analyzer': '#1976d2', // blue
  'CV Matcher': '#7b1fa2', // purple
  'CV Tailoring': '#f57c00', // orange
  'Cover Letter Generator': '#c2185b', // red
  'Email Generator': '#00897b', // light green/teal
};

/**
 * Get AI document color based on tags
 * @param tags - Array of document tags
 * @param category - Document category
 * @returns Color hex string or null if not an AI document
 */
export const getAIDocumentColor = (tags?: string[], category?: string): string | null => {
  if (!tags || tags.length === 0) {
    return null;
  }

  // Check for AI Analyzed documents
  if (category === 'AI Analyzed' || tags.includes('AI Analysis')) {
    if (tags.includes('Company Research')) {
      return AI_DOCUMENT_COLORS['Company Research'];
    }
    if (tags.includes('Job Analyzer')) {
      return AI_DOCUMENT_COLORS['Job Analyzer'];
    }
    if (tags.includes('CV Matcher')) {
      return AI_DOCUMENT_COLORS['CV Matcher'];
    }
  }

  // Check for AI Generated documents (CV Tailoring, Cover Letter)
  if (category === 'AI Generated' || tags.includes('AI Generated')) {
    // Check tags to determine type
    // CV Tailoring: has AI Generated tag but no Cover Letter indication
    // Cover Letter: has AI Generated tag and is likely in Cover Letter folder or has Cover Letter in name/tags
    if (tags.some(tag => tag.toLowerCase().includes('cover letter') || tag.toLowerCase().includes('cl'))) {
      return AI_DOCUMENT_COLORS['Cover Letter Generator'];
    }
    // Default to CV Tailoring for AI Generated documents
    return AI_DOCUMENT_COLORS['CV Tailoring'];
  }

  return null;
};

