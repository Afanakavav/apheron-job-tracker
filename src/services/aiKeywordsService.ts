/**
 * AI Keywords Service - Multilingual keyword management for AI parsing
 * This service provides language-specific keywords for AI job detection
 */

export interface LanguageKeywords {
  jobKeywords: string[];
  actionKeywords: string[];
  locationKeywords: string[];
}

/**
 * Get keywords for a specific language
 */
export const getKeywordsByLanguage = (language: string): LanguageKeywords => {
  const keywordsMap: Record<string, LanguageKeywords> = {
    // Italian
    it: {
      jobKeywords: [
        'lavoro', 'opportunità', 'assunzione', 'posizione', 'carriera',
        'apertura', 'ruolo', 'vacanza', 'occupazione', 'impiego',
      ],
      actionKeywords: [
        'candidato', 'colloquio', 'candidatura', 'applicare',
        'selezionatore', 'recruiter', 'selezione', 'offerta',
      ],
      locationKeywords: [
        'remoto', 'ibrido', 'sede', 'ufficio', 'location',
      ],
    },

    // English
    en: {
      jobKeywords: [
        'job', 'opportunity', 'hiring', 'position', 'career',
        'opening', 'role', 'vacancy', 'employment', 'work',
      ],
      actionKeywords: [
        'applicant', 'candidate', 'interview', 'application', 'apply',
        'recruiter', 'recruitment', 'offer',
      ],
      locationKeywords: [
        'remote', 'hybrid', 'on-site', 'office', 'location',
      ],
    },
  };

  // Fallback to English + Italian if language not found
  return keywordsMap[language] || {
    ...keywordsMap.en,
    jobKeywords: [...keywordsMap.en.jobKeywords, ...keywordsMap.it.jobKeywords],
    actionKeywords: [...keywordsMap.en.actionKeywords, ...keywordsMap.it.actionKeywords],
    locationKeywords: [...keywordsMap.en.locationKeywords, ...keywordsMap.it.locationKeywords],
  };
};

/**
 * Build AI prompt with language-specific keywords
 */
export const buildMultilingualPrompt = (
  basePrompt: string,
  userLanguage: string
): string => {
  const keywords = getKeywordsByLanguage(userLanguage);
  
  const keywordSection = `
**LANGUAGE-SPECIFIC KEYWORDS (${userLanguage.toUpperCase()}):**

**Job Keywords:** ${keywords.jobKeywords.join(', ')}
**Action Keywords:** ${keywords.actionKeywords.join(', ')}
**Location Keywords:** ${keywords.locationKeywords.join(', ')}

Search for these keywords in the email content. The email is likely in ${getLanguageName(userLanguage)}.
`;

  return basePrompt + '\n' + keywordSection;
};

/**
 * Get full language name from code
 */
const getLanguageName = (code: string): string => {
  const names: Record<string, string> = {
    it: 'Italian',
    en: 'English',
  };
  return names[code] || 'English';
};

/**
 * Format keywords for AI prompt (comma-separated list)
 */
export const formatKeywordsForPrompt = (language: string): string => {
  const keywords = getKeywordsByLanguage(language);
  const allKeywords = [
    ...keywords.jobKeywords,
    ...keywords.actionKeywords,
    ...keywords.locationKeywords,
  ];
  return allKeywords.join(', ');
};

/**
 * Check if keywords match user's language preference
 */
export const getKeywordMatchScore = (
  text: string,
  language: string
): number => {
  const keywords = getKeywordsByLanguage(language);
  const allKeywords = [
    ...keywords.jobKeywords,
    ...keywords.actionKeywords,
  ];
  
  const textLower = text.toLowerCase();
  let matches = 0;
  
  for (const keyword of allKeywords) {
    if (textLower.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  
  // Return percentage (0-100)
  return Math.min((matches / allKeywords.length) * 100, 100);
};


