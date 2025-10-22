import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error('VITE_GEMINI_API_KEY not found in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

// Models - Using Gemini 2.5 series (as suggested - newest available)
const FLASH_MODEL = 'gemini-2.5-flash'; // Fast, efficient and free
const PRO_MODEL = 'gemini-2.5-flash'; // Same model for consistency

// Rate limiting cache
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes

/**
 * Generate content with caching and rate limiting
 */
async function generateContent(
  prompt: string,
  modelName: string = FLASH_MODEL,
  useCache: boolean = true
): Promise<string> {
  try {
    // Check cache
    const cacheKey = `${modelName}:${prompt}`;
    if (useCache && requestCache.has(cacheKey)) {
      const cached = requestCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Using cached AI response');
        return cached.data;
      } else {
        requestCache.delete(cacheKey);
      }
    }

    console.log(`Calling Gemini ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Cache the result
    if (useCache) {
      requestCache.set(cacheKey, { data: text, timestamp: Date.now() });
    }

    return text;
  } catch (error: any) {
    console.error('Error calling Gemini AI:', error);
    
    // Handle specific errors
    if (error?.message?.includes('quota')) {
      throw new Error('Limite giornaliero AI raggiunto. Riprova domani.');
    } else if (error?.message?.includes('API key')) {
      throw new Error('API key non valida. Verifica la configurazione.');
    } else {
      throw new Error(`Errore AI: ${error?.message || 'Unknown error'}`);
    }
  }
}

/**
 * 1. CV Matcher - Analyzes how well a CV matches a job description
 * Returns a score (0-100) and detailed feedback
 */
export async function analyzeCVMatch(
  cvText: string,
  jobDescription: string
): Promise<{
  score: number;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  summary: string;
}> {
  const prompt = `
You are an expert recruiter and career coach. Analyze how well this CV matches the job description.

JOB DESCRIPTION:
${jobDescription}

CV CONTENT:
${cvText}

Provide a detailed analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "score": <number 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "gaps": ["<gap 1>", "<gap 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "summary": "<2-3 sentence overall assessment>"
}

Consider:
- Technical skills match
- Experience level alignment
- Soft skills presence
- Industry relevance
- Education requirements
- Years of experience
`;

  try {
    const response = await generateContent(prompt, FLASH_MODEL);
    
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validate response structure
    if (typeof analysis.score !== 'number' || 
        !Array.isArray(analysis.strengths) || 
        !Array.isArray(analysis.gaps)) {
      throw new Error('Invalid analysis structure');
    }
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing CV match:', error);
    throw error;
  }
}

/**
 * 2. Cover Letter Generator - Generates personalized cover letter
 */
export async function generateCoverLetter(
  cvText: string,
  jobDescription: string,
  companyName: string,
  jobTitle: string,
  additionalInfo?: string
): Promise<string> {
  const prompt = `
You are an expert career coach specializing in cover letters. Write a compelling, professional cover letter.

JOB DETAILS:
- Company: ${companyName}
- Position: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S CV:
${cvText}

${additionalInfo ? `ADDITIONAL CONTEXT:\n${additionalInfo}\n` : ''}

Write a professional cover letter that:
1. Is enthusiastic but professional
2. Highlights relevant experience from the CV
3. Shows genuine interest in the role and company
4. Is concise (300-400 words)
5. Follows standard business letter format
6. Uses specific examples from the CV
7. Addresses key requirements from the job description

Do NOT include placeholder text like [Your Address] or [Date]. Write a complete, ready-to-use cover letter.
`;

  try {
    const coverLetter = await generateContent(prompt, PRO_MODEL, false); // Don't cache, always fresh
    return coverLetter.trim();
  } catch (error) {
    console.error('Error generating cover letter:', error);
    throw error;
  }
}

/**
 * 3. Job Description Analyzer - Extracts key requirements and skills
 */
export async function analyzeJobDescription(
  jobDescription: string
): Promise<{
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: string;
  responsibilities: string[];
  qualifications: string[];
  salaryRange?: string;
  workType: string; // remote, hybrid, onsite
  summary: string;
}> {
  const prompt = `
Analyze this job description and extract key information.

JOB DESCRIPTION:
${jobDescription}

Provide analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "requiredSkills": ["<skill 1>", "<skill 2>", ...],
  "preferredSkills": ["<skill 1>", "<skill 2>", ...],
  "experienceLevel": "<entry/mid/senior/lead>",
  "responsibilities": ["<responsibility 1>", ...],
  "qualifications": ["<qualification 1>", ...],
  "salaryRange": "<if mentioned, otherwise null>",
  "workType": "<remote/hybrid/onsite/not specified>",
  "summary": "<2-3 sentence summary of the role>"
}
`;

  try {
    const response = await generateContent(prompt, FLASH_MODEL);
    
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    return analysis;
  } catch (error) {
    console.error('Error analyzing job description:', error);
    throw error;
  }
}

/**
 * 4. Company Research - Gets information about a company
 */
export async function researchCompany(
  companyName: string,
  additionalContext?: string
): Promise<{
  overview: string;
  industry: string;
  size: string;
  culture: string[];
  keyFacts: string[];
  interviewTips: string[];
}> {
  const prompt = `
Provide comprehensive research about the following company for a job seeker.

COMPANY NAME: ${companyName}
${additionalContext ? `ADDITIONAL CONTEXT: ${additionalContext}` : ''}

Provide information in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "overview": "<2-3 sentence company description>",
  "industry": "<primary industry>",
  "size": "<startup/small/medium/large/enterprise>",
  "culture": ["<culture aspect 1>", "<culture aspect 2>", ...],
  "keyFacts": ["<fact 1>", "<fact 2>", ...],
  "interviewTips": ["<tip 1>", "<tip 2>", ...]
}

Focus on information useful for job applications and interviews. If you don't have specific information, provide general insights based on the company name and industry.
`;

  try {
    const response = await generateContent(prompt, FLASH_MODEL);
    
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }
    
    const research = JSON.parse(jsonMatch[0]);
    return research;
  } catch (error) {
    console.error('Error researching company:', error);
    throw error;
  }
}

/**
 * 5. Extract text from CV file URL (for PDF processing)
 * Note: This is a placeholder. In production, you'd use a PDF parsing library
 * or Firebase Cloud Function with PDF.js
 */
export async function extractCVText(_cvUrl: string): Promise<string> {
  // For now, return a placeholder
  // In production, implement PDF text extraction
  console.warn('CV text extraction not yet implemented. Please copy-paste CV text manually.');
  return '';
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearAICache(): void {
  requestCache.clear();
  console.log('AI cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: requestCache.size,
    keys: Array.from(requestCache.keys()),
  };
}

