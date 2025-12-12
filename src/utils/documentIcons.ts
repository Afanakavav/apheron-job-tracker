/**
 * Document Icons Utility
 * 
 * Provides icon mappings and utilities for different document categories
 */

export interface DocumentIconConfig {
  icon: string;
  color: string;
  label: string;
  description: string;
}

/**
 * Document category icon mapping
 */
export const DOCUMENT_ICONS: Record<string, DocumentIconConfig> = {
  'AI Generated': {
    icon: '🤖',
    color: '#f57c00',
    label: 'AI Generated',
    description: 'Documento generato con AI'
  },
  'AI Analyzed': {
    icon: '🔍',
    color: '#1976d2',
    label: 'AI Analyzed',
    description: 'Documento analizzato con AI'
  },
  'Tech': {
    icon: '💻',
    color: '#2196f3',
    label: 'Tech',
    description: 'Documenti tecnologici'
  },
  'Marketing': {
    icon: '📢',
    color: '#e91e63',
    label: 'Marketing',
    description: 'Documenti marketing'
  },
  'Sales': {
    icon: '💼',
    color: '#4caf50',
    label: 'Sales',
    description: 'Documenti commerciali'
  },
  'Design': {
    icon: '🎨',
    color: '#9c27b0',
    label: 'Design',
    description: 'Documenti design'
  },
  'Management': {
    icon: '👔',
    color: '#ff9800',
    label: 'Management',
    description: 'Documenti gestionali'
  },
  'General': {
    icon: '📄',
    color: '#757575',
    label: 'General',
    description: 'Documenti generali'
  },
  'default': {
    icon: '📄',
    color: '#757575',
    label: 'Documento',
    description: 'Documento generico'
  }
};

/**
 * Get icon configuration for a document category
 * @param category - The document category
 * @returns Icon configuration
 */
export const getDocumentIcon = (category?: string): DocumentIconConfig => {
  if (!category) {
    return DOCUMENT_ICONS.default;
  }
  
  return DOCUMENT_ICONS[category] || DOCUMENT_ICONS.default;
};

/**
 * Get icon emoji only
 * @param category - The document category
 * @returns Icon emoji string
 */
export const getDocumentIconEmoji = (category?: string): string => {
  return getDocumentIcon(category).icon;
};

/**
 * Get icon color only
 * @param category - The document category
 * @returns Color hex string
 */
export const getDocumentIconColor = (category?: string): string => {
  return getDocumentIcon(category).color;
};

/**
 * Get all available categories for filtering
 * @returns Array of category names
 */
export const getAllDocumentCategories = (): string[] => {
  return Object.keys(DOCUMENT_ICONS).filter(key => key !== 'default');
};

/**
 * Check if a category exists
 * @param category - The category to check
 * @returns True if category exists
 */
export const isValidCategory = (category: string): boolean => {
  return category in DOCUMENT_ICONS && category !== 'default';
};

