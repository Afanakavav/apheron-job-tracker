/**
 * Firebase Functions for Apheron Job Tracker
 * All Gemini AI calls are handled server-side for security
 */

const { setGlobalOptions } = require("firebase-functions");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

// Initialize Gemini AI with secure API key
// For Cloud Functions v2, we need to use environment variables
// The config will be available at runtime through Cloud Functions runtime config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.FIREBASE_CONFIG_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  logger.error("❌ GEMINI_API_KEY not found in environment!");
  logger.error("   Please set GEMINI_API_KEY in Firebase Functions environment variables");
  throw new Error("GEMINI_API_KEY is required but not found in environment variables");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Models
const FLASH_MODEL = 'gemini-2.5-flash';
const PRO_MODEL = 'gemini-2.5-flash';

/**
 * Helper function to generate content with error handling
 */
async function generateContent(prompt, modelName = FLASH_MODEL) {
  try {
    logger.info(`🤖 Calling Gemini ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    logger.info('✅ Gemini response received');
    return text;
  } catch (error) {
    logger.error('❌ Gemini error:', error);
    
    if (error?.message?.includes('quota')) {
      throw new HttpsError('resource-exhausted', 'Limite giornaliero AI raggiunto. Riprova domani.');
    } else if (error?.message?.includes('API key')) {
      throw new HttpsError('unauthenticated', 'API key non valida.');
    } else if (error?.message?.includes('overloaded') || error?.message?.includes('503')) {
      throw new HttpsError('unavailable', 'L\'API di AI è temporaneamente sovraccarica. Riprova tra qualche secondo.');
    } else if (error?.message?.includes('429')) {
      throw new HttpsError('resource-exhausted', 'Limite di richieste raggiunto. Attendi qualche minuto e riprova.');
    } else {
      throw new HttpsError('internal', `Errore AI: ${error?.message || 'Unknown error'}`);
    }
  }
}

/**
 * 1. CV Matcher - Analyzes how well a CV matches a job description
 */
exports.analyzeCVMatch = onCall({ cors: true }, async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { cvText, jobDescription, language } = request.data;

  if (!cvText || !jobDescription) {
    throw new HttpsError('invalid-argument', 'cvText and jobDescription are required');
  }

  // Default to Italian if language not provided
  const analysisLanguage = language || 'it';
  const isEnglish = analysisLanguage === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  logger.info(`🔍 Analyzing CV match in language: ${analysisLanguage}`);

  const prompt = `
You are an expert recruiter and career coach. Analyze how well this CV matches the job description.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD in ${languageName} (${languageInstruction}). 
- EVERY strength must be written in ${languageName}
- EVERY gap must be written in ${languageName}
- EVERY recommendation must be written in ${languageName}
- The summary must be written in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the response
- DO NOT mix languages - use ONLY ${languageName}
- Translate any English content from the CV or job description to ${languageName} in your analysis

JOB DESCRIPTION:
${jobDescription}

CV CONTENT:
${cvText}

Provide a detailed analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "score": <number 0-100>,
  "strengths": ["<strength 1 in ${languageName} - translate to ${languageName}>", "<strength 2 in ${languageName} - translate to ${languageName}>", ...],
  "gaps": ["<gap 1 in ${languageName} - translate to ${languageName}>", "<gap 2 in ${languageName} - translate to ${languageName}>", ...],
  "recommendations": ["<recommendation 1 in ${languageName} - translate to ${languageName}>", "<recommendation 2 in ${languageName} - translate to ${languageName}>", ...],
  "summary": "<2-3 sentence overall assessment in ${languageName} - translate to ${languageName}>"
}

ABSOLUTE REQUIREMENTS:
1. EVERY field in the JSON response must be written in ${languageName}
2. Translate ALL English content to ${languageName} before including it
3. Write as if you are a native ${languageName} speaker
4. Do NOT include any English words, even technical terms - translate them to ${languageName}

Consider:
- Technical skills match
- Experience level alignment
- Soft skills presence
- Industry relevance
- Education requirements
- Years of experience

REMEMBER: The user's website is set to ${languageName}, so ALL content must match that language. No exceptions.
`;

  try {
    const response = await generateContent(prompt, FLASH_MODEL);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new HttpsError('internal', 'Invalid AI response format');
    }
    const analysis = JSON.parse(jsonMatch[0]);
    return analysis;
  } catch (error) {
    logger.error('Error in analyzeCVMatch:', error);
    throw error;
  }
});

/**
 * 2. Cover Letter Generator
 */
exports.generateCoverLetter = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { cvText, jobDescription, companyName, jobTitle, additionalInfo, language } = request.data;

  if (!cvText || !jobDescription || !companyName || !jobTitle) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  // Default to Italian if language not provided
  const coverLetterLanguage = language || 'it';
  const isEnglish = coverLetterLanguage === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  logger.info(`📝 Generating cover letter in language: ${coverLetterLanguage}`);

  const prompt = `
You are an expert career coach specializing in cover letters. Write a compelling, professional cover letter.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD of the cover letter in ${languageName} (${languageInstruction}). 
- The ENTIRE cover letter must be in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the cover letter
- DO NOT mix languages - use ONLY ${languageName}
- Translate any English content from the CV or job description to ${languageName} in the cover letter
- Write as if you are a native ${languageName} speaker

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
8. Is written ENTIRELY in ${languageName}

ABSOLUTE REQUIREMENTS:
1. The ENTIRE cover letter must be in ${languageName}
2. Translate ALL English content to ${languageName} before including it
3. Do NOT include placeholder text like [Your Address] or [Date]
4. Write a complete, ready-to-use cover letter
5. Write naturally in ${languageName}, as if you were a native speaker
6. Do NOT include any English words, even technical terms - translate them to ${languageName}

REMEMBER: The user's website is set to ${languageName}, so ALL content must match that language. No exceptions.
`;

  try {
    const coverLetter = await generateContent(prompt, PRO_MODEL);
    return { coverLetter: coverLetter.trim() };
  } catch (error) {
    logger.error('Error in generateCoverLetter:', error);
    throw error;
  }
});

/**
 * 3. Job Description Analyzer
 */
exports.analyzeJobDescription = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobDescription, language } = request.data;

  if (!jobDescription) {
    throw new HttpsError('invalid-argument', 'jobDescription is required');
  }

  // Default to Italian if language not provided
  const analysisLanguage = language || 'it';
  const isEnglish = analysisLanguage === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  logger.info(`📋 Analyzing job description in language: ${analysisLanguage}`);

  const prompt = `
You are an expert job description analyzer. Analyze this job description and extract key information.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD in ${languageName} (${languageInstruction}). 
- EVERY required skill must be written in ${languageName}
- EVERY preferred skill must be written in ${languageName}
- The experience level must be written in ${languageName}
- EVERY responsibility must be written in ${languageName}
- EVERY qualification must be written in ${languageName}
- The work type must be written in ${languageName}
- The summary must be written in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the response
- DO NOT mix languages - use ONLY ${languageName}
- Translate any English content from the job description to ${languageName} in your analysis

JOB DESCRIPTION:
${jobDescription}

Provide analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "requiredSkills": ["<skill 1 in ${languageName} - translate to ${languageName}>", "<skill 2 in ${languageName} - translate to ${languageName}>", ...],
  "preferredSkills": ["<skill 1 in ${languageName} - translate to ${languageName}>", "<skill 2 in ${languageName} - translate to ${languageName}>", ...],
  "experienceLevel": "<entry/mid/senior/lead in ${languageName} - translate to ${languageName}>",
  "responsibilities": ["<responsibility 1 in ${languageName} - translate to ${languageName}>", ...],
  "qualifications": ["<qualification 1 in ${languageName} - translate to ${languageName}>", ...],
  "salaryRange": "<if mentioned in ${languageName}, otherwise null>",
  "workType": "<remote/hybrid/onsite/not specified in ${languageName} - translate to ${languageName}>",
  "summary": "<2-3 sentence summary of the role in ${languageName} - translate to ${languageName}>"
}

ABSOLUTE REQUIREMENTS:
1. EVERY field in the JSON response must be written in ${languageName}
2. Translate ALL English content to ${languageName} before including it
3. Write as if you are a native ${languageName} speaker
4. Do NOT include any English words, even technical terms - translate them to ${languageName}

REMEMBER: The user's website is set to ${languageName}, so ALL content must match that language. No exceptions.
`;

  try {
    const response = await generateContent(prompt, FLASH_MODEL);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new HttpsError('internal', 'Invalid AI response format');
    }
    const analysis = JSON.parse(jsonMatch[0]);
    return analysis;
  } catch (error) {
    logger.error('Error in analyzeJobDescription:', error);
    throw error;
  }
});

/**
 * 4. Company Research
 */
exports.researchCompany = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { companyName, additionalContext, language } = request.data;

  if (!companyName) {
    throw new HttpsError('invalid-argument', 'companyName is required');
  }

  // Default to Italian if language not provided
  const researchLanguage = language || 'it';
  const isEnglish = researchLanguage === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  logger.info(`🔍 Researching company in language: ${researchLanguage}`);

  const prompt = `
You are a professional career research assistant. Provide comprehensive research about the following company for a job seeker.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD in ${languageName} (${languageInstruction}). 
- The overview description must be in ${languageName}
- The industry name must be in ${languageName}
- The company size description must be in ${languageName}
- EVERY culture aspect must be written in ${languageName}
- EVERY key fact must be written in ${languageName}
- EVERY interview tip must be written in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the response
- DO NOT mix languages - use ONLY ${languageName}
- If the company information is in English, translate it to ${languageName} before including it

COMPANY NAME: ${companyName}
${additionalContext ? `ADDITIONAL CONTEXT: ${additionalContext}` : ''}

Provide information in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "overview": "<2-3 sentence company description in ${languageName} - translate any English content to ${languageName}>",
  "industry": "<primary industry in ${languageName} - translate to ${languageName}>",
  "size": "<startup/small/medium/large/enterprise in ${languageName} - translate to ${languageName}>",
  "culture": ["<culture aspect 1 in ${languageName} - translate to ${languageName}>", "<culture aspect 2 in ${languageName} - translate to ${languageName}>", ...],
  "keyFacts": ["<fact 1 in ${languageName} - translate to ${languageName}>", "<fact 2 in ${languageName} - translate to ${languageName}>", ...],
  "interviewTips": ["<tip 1 in ${languageName} - translate to ${languageName}>", "<tip 2 in ${languageName} - translate to ${languageName}>", ...]
}

ABSOLUTE REQUIREMENTS:
1. EVERY field in the JSON response must be written in ${languageName}
2. Translate ALL English content to ${languageName} before including it
3. Write as if you are a native ${languageName} speaker
4. Do NOT include any English words, even technical terms - translate them to ${languageName}
5. Focus on information useful for job applications and interviews
6. If you don't have specific information, provide general insights based on the company name and industry, all in ${languageName}

REMEMBER: The user's website is set to ${languageName}, so ALL content must match that language. No exceptions.
`;

  try {
    const response = await generateContent(prompt, FLASH_MODEL);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new HttpsError('internal', 'Invalid AI response format');
    }
    const research = JSON.parse(jsonMatch[0]);
    return research;
  } catch (error) {
    logger.error('Error in researchCompany:', error);
    throw error;
  }
});

/**
 * 5. Generate Application Email
 */
exports.generateApplicationEmail = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { application, emailType, userFullName, language } = request.data;

  if (!application || !emailType) {
    throw new HttpsError('invalid-argument', 'application and emailType are required');
  }

  // Default to Italian if language not provided
  const emailLanguage = language || 'it';
  logger.info(`📧 Generating email in language: ${emailLanguage}`);

  let prompt;
  if (emailType === 'apply') {
    prompt = generateApplyEmailPrompt(application, userFullName || 'Francesco Perone', emailLanguage);
  } else if (emailType === 'confirm') {
    prompt = generateConfirmEmailPrompt(application, userFullName || 'Francesco Perone', emailLanguage);
  } else if (emailType === 'interview_feedback') {
    prompt = generateInterviewFeedbackPrompt(application, userFullName || 'Francesco Perone', emailLanguage);
  } else if (emailType === 'feedback_request') {
    prompt = generateFeedbackRequestPrompt(application, userFullName || 'Francesco Perone', emailLanguage);
  } else if (emailType === 'offer_accepted') {
    prompt = generateOfferAcceptedPrompt(application, userFullName || 'Francesco Perone', emailLanguage);
  } else if (emailType === 'offer_declined') {
    prompt = generateOfferDeclinedPrompt(application, userFullName || 'Francesco Perone', emailLanguage);
  } else {
    throw new HttpsError('invalid-argument', 'Invalid emailType');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse subject and body from AI response
    const { subject, body } = parseEmailResponse(text);

    return { subject, body };
  } catch (error) {
    logger.error('Error in generateApplicationEmail:', error);
    throw error;
  }
});

/**
 * 6. Tailor CV to Job
 */
exports.tailorCVToJob = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { cvText, jobDescription, companyName, jobTitle, language } = request.data;

  if (!cvText || !jobDescription || !companyName || !jobTitle) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  // Default to Italian if language not provided
  const tailoringLanguage = language || 'it';
  const isEnglish = tailoringLanguage === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  logger.info(`✂️ Tailoring CV in language: ${tailoringLanguage}`);

  const prompt = `
You are an expert CV writer. Analyze and optimize this CV to better match the job description while keeping it truthful.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD in ${languageName} (${languageInstruction}). 
- The summary must be written in ${languageName}
- The reasoning for each section modification must be written in ${languageName}
- The tailored CV must be written in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the response
- DO NOT mix languages - use ONLY ${languageName}
- Translate any English content from the CV or job description to ${languageName} in your analysis

ORIGINAL CV:
${cvText}

TARGET JOB:
Company: ${companyName}
Position: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

ANALYZE AND OPTIMIZE:

1. Analyze the CV and job description to identify:
   - Required skills and keywords from the job description
   - Skills in the CV that match the job requirements
   - Gaps between CV and job requirements
   - Sections that should be modified or reordered

2. Optimize the CV by:
   - Keeping ALL original information truthful and accurate
   - Reordering sections to highlight most relevant experience first
   - Rephrasing bullet points to align with job requirements
   - Emphasizing relevant skills and achievements
   - Adding keywords from job description naturally
   - Maintaining professional formatting
   - Keeping the same overall length (don't make it much longer)

RESPOND IN THE FOLLOWING JSON FORMAT:
{
  "summary": "A brief summary (2-3 sentences in ${languageName} - translate to ${languageName}) of the key changes made to optimize the CV for this position",
  "keywordsSuggested": ["keyword1", "keyword2", "keyword3", "..."],
  "skillsToHighlight": ["skill1", "skill2", "skill3", "..."],
  "sectionsToModify": [
    {
      "section": "Section name (e.g., 'Professional Summary', 'Work Experience - Company XYZ')",
      "currentContent": "Brief excerpt from original CV for this section",
      "suggestedContent": "Brief excerpt showing optimized version",
      "reasoning": "Explanation in ${languageName} - translate to ${languageName} of why this section was modified"
    }
  ],
  "tailoredCV": "Full optimized CV text ready to use - ALL in ${languageName}",
  "matchScore": 85
}

ABSOLUTE REQUIREMENTS:
1. EVERY text field in the JSON response must be written in ${languageName}
2. Translate ALL English content to ${languageName} before including it
3. Write as if you are a native ${languageName} speaker
4. Do NOT include any English words, even technical terms - translate them to ${languageName}
5. Return ONLY valid JSON
6. Extract at least 5-10 keywords and 5-10 skills
7. Identify at least 2-3 sections to modify

REMEMBER: The user's website is set to ${languageName}, so ALL content must match that language. No exceptions.
`;

  try {
    const response = await generateContent(prompt, PRO_MODEL);
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new HttpsError('internal', 'Invalid AI response format for CV tailoring');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!result.tailoredCV) {
      throw new HttpsError('internal', 'Missing tailoredCV in AI response');
    }
    
    // Default summary based on language
    const defaultSummary = isEnglish 
      ? 'CV optimized successfully using AI'
      : 'CV ottimizzato con successo utilizzando AI';
    
    // Ensure arrays exist and have defaults
    return {
      summary: result.summary || defaultSummary,
      keywordsSuggested: Array.isArray(result.keywordsSuggested) ? result.keywordsSuggested : [],
      skillsToHighlight: Array.isArray(result.skillsToHighlight) ? result.skillsToHighlight : [],
      sectionsToModify: Array.isArray(result.sectionsToModify) ? result.sectionsToModify : [],
      tailoredCV: result.tailoredCV.trim(),
      matchScore: typeof result.matchScore === 'number' ? result.matchScore : 85,
    };
  } catch (error) {
    logger.error('Error in tailorCVToJob:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to tailor CV');
  }
});

// Helper functions for email generation
function generateApplyEmailPrompt(application, userFullName, language = 'it') {
  const isEnglish = language === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  return `
Generate a professional job application email in ${languageInstruction} for the following job position.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD of the email in ${languageName} (${languageInstruction}). 
- The email subject must be in ${languageName}
- The email body must be in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the email
- DO NOT mix languages - use ONLY ${languageName}
- Write as if you are a native ${languageName} speaker

**CANDIDATE INFORMATION:**
- Name: ${userFullName}

**POSITION INFORMATION:**
- Company: ${application.company}
- Position: ${application.jobTitle}
- Location: ${application.location}${application.isRemote ? (isEnglish ? ' (Remote)' : ' (Remoto)') : ''}
${application.jobDescription ? `- Description: ${application.jobDescription}` : ''}
${application.jobUrl ? `- Job URL: ${application.jobUrl}` : ''}

**INSTRUCTIONS:**
${isEnglish ? `
1. Write a professional, concise, and direct email (maximum 200 words)
2. Express genuine interest in the position
3. Briefly mention relevant skills (generic if you don't have the job description)
4. Indicate that the CV is attached
5. Ask for availability for an interview
6. Maintain a professional but cordial tone
7. DO NOT invent specific experiences
8. Use clear and direct language
` : `
1. Scrivi un'email professionale, concisa e diretta (massimo 200 parole)
2. Esprimi interesse genuino per la posizione
3. Menziona brevemente competenze rilevanti (generiche se non hai la job description)
4. Indica che il CV è allegato
5. Chiedi disponibilità per un colloquio
6. Mantieni un tono professionale ma cordiale
7. NON inventare esperienze specifiche
8. Usa un linguaggio chiaro e diretto
`}

**RESPONSE FORMAT:**
SUBJECT: [email subject in ${languageName}]
---
BODY:
[email body in ${languageName}]

REMEMBER: The user's website is set to ${languageName}, so ALL content must match that language. No exceptions.
`;
}

function generateConfirmEmailPrompt(application, userFullName, language = 'it') {
  const isEnglish = language === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  return `
Generate a professional APPLICATION CONFIRMATION email in ${languageInstruction}.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD of the email in ${languageName} (${languageInstruction}). 
- The email subject must be in ${languageName}
- The email body must be in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the email
- DO NOT mix languages - use ONLY ${languageName}
- Write as if you are a native ${languageName} speaker

**INFORMATION:**
- Candidate: ${userFullName}
- Company: ${application.company}
- Position: ${application.jobTitle}

**INSTRUCTIONS:**
${isEnglish ? `
1. Write a brief and professional email
2. Confirm that the application has been sent
3. Briefly reiterate interest in the position
4. Ask for confirmation of receipt
5. Show availability for further information
6. Maximum 150 words
` : `
1. Scrivi un'email breve e professionale
2. Conferma l'avvenuto invio della candidatura
3. Ribadisci brevemente interesse per la posizione
4. Chiedi conferma di ricezione
5. Mostra disponibilità per ulteriori informazioni
6. Massimo 150 parole
`}

**RESPONSE FORMAT:**
SUBJECT: [email subject in ${languageName}]
---
BODY:
[email body in ${languageName}]

REMEMBER: The user's website is set to ${languageName}, so ALL content must match that language. No exceptions.
`;
}

function generateInterviewFeedbackPrompt(application, userFullName, language = 'it') {
  const isEnglish = language === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  return `
Generate a professional email to SHARE YOUR PERSONAL FEEDBACK on how an interview went in ${languageInstruction}.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD of the email in ${languageName} (${languageInstruction}). 
- The email subject must be in ${languageName}
- The email body must be in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the email
- DO NOT mix languages - use ONLY ${languageName}
- Write as if you are a native ${languageName} speaker

**INFORMATION:**
- Candidate: ${userFullName}
- Company: ${application.company}
- Position: ${application.jobTitle}

**INSTRUCTIONS:**
${isEnglish ? `
1. Write a professional and cordial email
2. Thank them for the interview opportunity
3. Share your positive feedback on how the interview went
4. Show enthusiasm for the position and company
5. Express interest in proceeding in the process
6. Maintain a professional but personal tone
7. Maximum 200 words
` : `
1. Scrivi un'email professionale e cordiale
2. Ringrazia per l'opportunità del colloquio
3. Condividi il tuo giudizio positivo su come è andato il colloquio
4. Mostra entusiasmo per la posizione e l'azienda
5. Esprimi interesse a procedere nel processo
6. Mantieni un tono professionale ma personale
7. Massimo 200 parole
`}

**RESPONSE FORMAT:**
SUBJECT: [email subject in ${languageName}]
---
BODY:
[email body in ${languageName}]

REMEMBER: The user's website is set to ${languageName}, so ALL content must match that language. No exceptions.
`;
}

function generateFeedbackRequestPrompt(application, userFullName, language = 'it') {
  const isEnglish = language === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  return `
Generate a professional email to REQUEST FEEDBACK on how an interview went in ${languageInstruction}.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD of the email in ${languageName} (${languageInstruction}). 
- The email subject must be in ${languageName}
- The email body must be in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the email
- DO NOT mix languages - use ONLY ${languageName}
- Write as if you are a native ${languageName} speaker

**INFORMATION:**
- Candidate: ${userFullName}
- Company: ${application.company}
- Position: ${application.jobTitle}

**INSTRUCTIONS:**
${isEnglish ? `
1. Write a professional and courteous email
2. Thank them for the interview opportunity
3. Gently request feedback on how the interview went
4. Show interest in receiving constructive advice
5. Express willingness to improve and grow
6. Maintain a respectful and professional tone
7. Don't be too insistent or pushy
8. Maximum 200 words
` : `
1. Scrivi un'email professionale e cortese
2. Ringrazia per l'opportunità del colloquio
3. Richiedi gentilmente un feedback su come è andato il colloquio
4. Mostra interesse a ricevere consigli costruttivi
5. Esprimi disponibilità a migliorare e crescere
6. Mantieni un tono rispettoso e professionale
7. Non essere troppo insistenti o pressanti
8. Massimo 200 parole
`}

**RESPONSE FORMAT:**
SUBJECT: [email subject in ${languageName}]
---
BODY:
[email body in ${languageName}]

REMEMBER: The user's website is set to ${languageName}, so ALL content must match that language. No exceptions.
`;
}

function generateOfferAcceptedPrompt(application, userFullName, language = 'it') {
  const isEnglish = language === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  return `
Generate a professional email to ACCEPT A JOB OFFER in ${languageInstruction}.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD of the email in ${languageName} (${languageInstruction}). 
- The email subject must be in ${languageName}
- The email body must be in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the email
- DO NOT mix languages - use ONLY ${languageName}
- Write as if you are a native ${languageName} speaker

**INFORMATION:**
- Candidate: ${userFullName}
- Company: ${application.company}
- Position: ${application.jobTitle}

**INSTRUCTIONS:**
${isEnglish ? `
1. Write a professional and enthusiastic email
2. Thank them for the offer received
3. Clearly communicate acceptance of the offer
4. Express enthusiasm for the position and company
5. Confirm your availability to start
6. Ask for information on next steps or required documentation
7. Maintain a positive and professional tone
8. Maximum 200 words
` : `
1. Scrivi un'email professionale ed entusiasta
2. Ringrazia per l'offerta ricevuta
3. Comunica chiaramente l'accettazione dell'offerta
4. Esprimi entusiasmo per la posizione e l'azienda
5. Conferma la tua disponibilità a iniziare
6. Chiedi informazioni sui prossimi passi o sulla documentazione necessaria
7. Mantieni un tono positivo e professionale
8. Massimo 200 parole
`}

**RESPONSE FORMAT:**
SUBJECT: [email subject]
---
BODY:
[email body]
`;
}

function generateOfferDeclinedPrompt(application, userFullName, language = 'it') {
  const isEnglish = language === 'en';
  const languageInstruction = isEnglish ? 'ENGLISH' : 'ITALIANO';
  const languageName = isEnglish ? 'English' : 'Italian';
  
  return `
Generate a professional email to POLITELY DECLINE A JOB OFFER in ${languageInstruction}.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
You MUST write EVERY SINGLE WORD of the email in ${languageName} (${languageInstruction}). 
- The email subject must be in ${languageName}
- The email body must be in ${languageName}
- DO NOT use English words, phrases, or sentences anywhere in the email
- DO NOT mix languages - use ONLY ${languageName}
- Write as if you are a native ${languageName} speaker

**INFORMATION:**
- Candidate: ${userFullName}
- Company: ${application.company}
- Position: ${application.jobTitle}

**INSTRUCTIONS:**
${isEnglish ? `
1. Write a professional and respectful email
2. Thank them for the offer received and the time dedicated
3. Communicate the decline clearly but courteously
4. Optionally, briefly mention the reason (if appropriate, e.g., "I have accepted another opportunity" or "I have decided to pursue another career direction")
5. Maintain a positive and professional tone
6. Express interest in maintaining relationships for the future
7. Maximum 200 words
` : `
1. Scrivi un'email professionale e rispettosa
2. Ringrazia per l'offerta ricevuta e per il tempo dedicato
3. Comunica il rifiuto in modo chiaro ma cortese
4. Opzionalmente, menziona brevemente il motivo (se appropriato, ad esempio "ho accettato un'altra opportunità" o "ho deciso di perseguire un'altra direzione di carriera")
5. Mantieni un tono positivo e professionale
6. Esprimi interesse a mantenere i rapporti per il futuro
7. Massimo 200 parole
`}

**RESPONSE FORMAT:**
SUBJECT: [email subject in ${languageName}]
----
BODY:
[email body in ${languageName}]

REMEMBER: The user's website is set to ${languageName}, so ALL content must match that language. No exceptions.
`;
}

function parseEmailResponse(text) {
  const lines = text.split('\n');
  let subject = '';
  let body = '';
  let inBody = false;

  for (const line of lines) {
    if (line.startsWith('SUBJECT:')) {
      subject = line.replace('SUBJECT:', '').trim();
    } else if (line === '---') {
      inBody = true;
    } else if (inBody && line.startsWith('BODY:')) {
      continue; // Skip "BODY:" line
    } else if (inBody) {
      body += line + '\n';
    }
  }

  return {
    subject: subject || `Candidatura - ${new Date().toLocaleDateString()}`,
    body: body.trim() || text, // Fallback to full text if parsing fails
  };
}

/**
 * 7. Parse Email for Job Offers
 * Analyzes email content to detect and extract job opportunities
 */
exports.parseEmailForJobOffers = onCall({ 
  cors: true,
  timeoutSeconds: 540, // 9 minutes max timeout
  memory: '512MiB', // Increase memory for better performance
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { emails, userLanguage } = request.data;

  if (!emails || !Array.isArray(emails)) {
    throw new HttpsError('invalid-argument', 'emails array is required');
  }

  // Limit number of emails to prevent timeout
  // Process max 20 emails at a time to stay well under timeout
  const maxEmails = 20;
  const emailsToProcess = emails.slice(0, maxEmails);
  
  if (emails.length > maxEmails) {
    logger.warn(`📧 Limiting email processing to ${maxEmails} (received ${emails.length})`);
  }

  const language = userLanguage || 'en';
  const keywords = getKeywordsByLanguage(language);

  logger.info(`📧 Parsing ${emailsToProcess.length} emails for job offers (language: ${language})`);

  const jobOffers = [];

  for (const email of emailsToProcess) {
    try {
      // Clean email body
      const cleanBody = email.body
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const emailContent = `
Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}

${cleanBody.substring(0, 5000)}`;

      const languageName = getLanguageName(language);

      const prompt = `
Analyze this email and determine if it contains a job offer or job opportunity.
IMPORTANT: This email is likely in ${languageName.toUpperCase()}. Use language-appropriate keywords for detection.

Email:
---
${emailContent}
---

LANGUAGE-SPECIFIC KEYWORDS FOR DETECTION (${languageName}):
Job Keywords: ${keywords.jobKeywords.join(', ')}
Action Keywords: ${keywords.actionKeywords.join(', ')}
Location Keywords: ${keywords.locationKeywords.join(', ')}

If this email contains a job opportunity, extract the following information in JSON format:
{
  "isJobOffer": true,
  "company": "Company name",
  "jobTitle": "Position title",
  "location": "Location (if mentioned, otherwise leave empty)",
  "salary": "Salary range (if mentioned, otherwise leave empty)",
  "jobDescription": "Brief description of the role (max 500 characters)",
  "jobUrl": "Application link or job posting URL (if present, otherwise leave empty)",
  "confidence": 85,
  "reasoning": "Brief explanation of why this is considered a job offer"
}

If this email does NOT contain a job opportunity, respond with:
{
  "isJobOffer": false,
  "confidence": 90,
  "reasoning": "Brief explanation of why this is not a job offer"
}

Guidelines:
- Search for the keywords listed above in the email content
- Consider newsletters, automated emails, or promotional content as job offers if they contain specific job openings
- Job alerts from LinkedIn, Indeed, Glassdoor, and job boards are VALID (they contain specific positions)
- LinkedIn job alerts are ALWAYS valid job offers
- Internal communications about open positions are valid
- General career advice emails are NOT job offers
- Marketing emails without specific positions are NOT job offers
- Application confirmations ("We received your application") are NOT job offers
- Be moderately strict but not overly conservative

Respond ONLY with valid JSON, no additional text.
`;

      const response = await generateContent(prompt, FLASH_MODEL);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        logger.warn(`Failed to parse AI response for email ${email.id}`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // If not a job offer or low confidence, skip
      if (!parsed.isJobOffer || parsed.confidence < 60) {
        logger.info(`Email ${email.id} is not a job offer (${parsed.reasoning})`);
        continue;
      }

      // Add to job offers
      jobOffers.push({
        company: parsed.company || extractCompanyFromSender(email.from),
        jobTitle: parsed.jobTitle,
        location: parsed.location || undefined,
        salary: parsed.salary || undefined,
        jobDescription: parsed.jobDescription,
        jobUrl: parsed.jobUrl || undefined,
        source: 'email',
        emailId: email.id,
        emailSubject: email.subject,
        emailDate: email.date,
        confidence: parsed.confidence,
      });

      logger.info(`✅ Found job offer: ${parsed.jobTitle} at ${parsed.company}`);

    } catch (error) {
      logger.error(`Error parsing email ${email.id}:`, error);
      // Continue with next email - don't fail entire batch
      continue;
    }

    // Rate limiting: small delay between requests to avoid quota issues
    // Reduced delay to speed up processing (300ms instead of 500ms)
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  logger.info(`📊 Found ${jobOffers.length} job offers out of ${emailsToProcess.length} emails processed`);

  return { 
    jobOffers,
    totalProcessed: emailsToProcess.length,
    totalReceived: emails.length,
    limited: emails.length > maxEmails
  };
});

// Helper: Get keywords by language (inline version for Cloud Functions)
function getKeywordsByLanguage(language) {
  const keywordsMap = {
    it: {
      jobKeywords: ['lavoro', 'opportunità', 'assunzione', 'posizione', 'carriera', 'apertura', 'ruolo', 'vacanza', 'occupazione', 'impiego'],
      actionKeywords: ['candidato', 'colloquio', 'candidatura', 'applicare', 'selezionatore', 'recruiter', 'selezione', 'offerta'],
      locationKeywords: ['remoto', 'ibrido', 'sede', 'ufficio', 'location'],
    },
    en: {
      jobKeywords: ['job', 'opportunity', 'hiring', 'position', 'career', 'opening', 'role', 'vacancy', 'employment', 'work'],
      actionKeywords: ['applicant', 'candidate', 'interview', 'application', 'apply', 'recruiter', 'recruitment', 'offer'],
      locationKeywords: ['remote', 'hybrid', 'on-site', 'office', 'location'],
    },
    es: {
      jobKeywords: ['trabajo', 'oportunidad', 'contratación', 'puesto', 'carrera', 'vacante', 'empleo', 'ocupación', 'plaza'],
      actionKeywords: ['candidato', 'entrevista', 'solicitud', 'aplicar', 'reclutador', 'selección', 'oferta'],
      locationKeywords: ['remoto', 'híbrido', 'presencial', 'oficina', 'ubicación'],
    },
    fr: {
      jobKeywords: ['travail', 'opportunité', 'embauche', 'poste', 'carrière', 'ouverture', 'emploi', 'vacance', 'occupation'],
      actionKeywords: ['candidat', 'entretien', 'candidature', 'postuler', 'recruteur', 'recrutement', 'offre'],
      locationKeywords: ['télétravail', 'hybride', 'sur site', 'bureau', 'localisation'],
    },
  };

  return keywordsMap[language] || keywordsMap.en;
}

// Helper: Get language name
function getLanguageName(code) {
  const names = {
    it: 'Italian',
    en: 'English',
    es: 'Spanish',
    fr: 'French',
  };
  return names[code] || 'English';
}

// Helper: Extract company from email sender
function extractCompanyFromSender(from) {
  const match = from.match(/^([^<]+)</);
  if (match) {
    return match[1].trim().replace(/Jobs?$/i, '').trim();
  }
  
  const emailMatch = from.match(/@([^.]+)\./);
  if (emailMatch) {
    const domain = emailMatch[1];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  
  return 'Unknown';
}

logger.info('✅ Firebase Functions loaded successfully');

/**
 * 10. Save Job from Chrome Extension
 * Saves a job posting from the Chrome extension to user's saved jobs
 */
exports.saveJob = onRequest({ cors: true }, async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId, job } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized - Missing token' });
      return;
    }

    if (!userId || !job) {
      res.status(400).json({ error: 'Missing userId or job data' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      logger.error('Token verification failed:', error);
      res.status(401).json({ error: 'Unauthorized - Invalid token' });
      return;
    }
    
    if (decodedToken.uid !== userId) {
      res.status(403).json({ error: 'Forbidden - User ID mismatch' });
      return;
    }

    // Prepare job data - only include defined values (Firestore doesn't accept undefined)
    const jobData = {
      title: job.title || '',
      company: job.company || '',
      description: job.description || '',
      jobUrl: job.jobUrl || '',
      source: job.source || 'manual',
      postedDate: job.postedDate ? admin.firestore.Timestamp.fromDate(new Date(job.postedDate)) : admin.firestore.FieldValue.serverTimestamp(),
      savedAt: admin.firestore.FieldValue.serverTimestamp(),
      isRemote: job.isRemote || false,
    };

    // Add optional fields only if they exist, are not undefined, and are not empty
    if (job.location !== undefined && job.location !== null && typeof job.location === 'string' && job.location.trim() !== '') {
      jobData.location = job.location.trim();
    }
    if (job.salary !== undefined && job.salary !== null && typeof job.salary === 'object') {
      jobData.salary = job.salary;
    }
    if (job.employmentType !== undefined && job.employmentType !== null && typeof job.employmentType === 'string' && job.employmentType.trim() !== '') {
      jobData.employmentType = job.employmentType.trim();
    }
    if (job.experienceLevel !== undefined && job.experienceLevel !== null && typeof job.experienceLevel === 'string' && job.experienceLevel.trim() !== '') {
      jobData.experienceLevel = job.experienceLevel.trim();
    }

    // Final safety check: remove any undefined values (shouldn't happen, but just in case)
    const finalJobData = {};
    for (const [key, value] of Object.entries(jobData)) {
      if (value !== undefined) {
        finalJobData[key] = value;
      }
    }

    // Save job to Firestore
    const jobRef = admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('saved_jobs')
      .doc();

    await jobRef.set(finalJobData);

    logger.info(`✅ Job saved: ${finalJobData.title} at ${finalJobData.company} for user ${userId}`);

    res.json({ 
      success: true, 
      id: jobRef.id,
      message: 'Job saved successfully'
    });
  } catch (error) {
    logger.error('Error saving job:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * 8. Fetch Job Description from URL (server-side proxy)
 * Note: This performs an outbound HTTP request; billing applies on Blaze plan.
 */
exports.fetchJobDescription = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { url } = request.data || {};
  if (!url || typeof url !== 'string') {
    throw new HttpsError('invalid-argument', 'url is required');
  }

  try {
    // Basic URL validation and allowlist for http/https
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new HttpsError('invalid-argument', 'Only http/https URLs are allowed');
    }

    // Use global fetch (Node 18+/Functions gen2)
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ApheronJobTracker/1.0)'
      }
    });

    if (!response.ok) {
      logger.warn(`fetchJobDescription non-OK response: ${response.status} ${response.statusText}`);
      throw new HttpsError('unavailable', `Upstream responded ${response.status}`);
    }

    const html = await response.text();

    // Minimal HTML → text cleanup
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit size to avoid huge payloads
    const maxLen = 20000;
    const trimmed = text.length > maxLen ? text.slice(0, maxLen) : text;

    return { text: trimmed };
  } catch (error) {
    logger.error('Error in fetchJobDescription:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to fetch job description');
  }
});

/**
 * 9. Cleanup Archived Applications (Admin Function)
 * This function uses Admin SDK to bypass Firestore rules and delete all archived applications.
 * Useful for cleaning up old archived data that doesn't have userId or has permission issues.
 */
exports.cleanupArchivedApplications = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    logger.info('🧹 Starting cleanup of archived applications...');
    
    // Use Admin SDK to bypass Firestore security rules
    const db = admin.firestore();
    const archivedRef = db.collection('archived_applications');
    
    // Get all archived applications
    const snapshot = await archivedRef.get();
    
    let deleted = 0;
    let errors = 0;
    
    // Delete each document
    const deletePromises = snapshot.docs.map(async (doc) => {
      try {
        await doc.ref.delete();
        deleted++;
        logger.info(`✅ Deleted archived application: ${doc.id}`);
      } catch (error) {
        errors++;
        logger.error(`❌ Error deleting archived application ${doc.id}:`, error);
      }
    });
    
    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    logger.info(`✅ Cleanup complete: ${deleted} deleted, ${errors} errors`);
    
    return {
      deleted,
      errors,
      message: `Eliminate ${deleted} candidature archiviate${errors > 0 ? `, ${errors} errori` : ''}`
    };
  } catch (error) {
    logger.error('Error in cleanupArchivedApplications:', error);
    throw new HttpsError('internal', 'Failed to cleanup archived applications');
  }
});

/**
 * 11. Process Email Notifications (Scheduled Function)
 * Runs every 5 minutes to check for pending email notifications and send them
 * 
 * Note: To send actual emails, configure one of:
 * - SendGrid (recommended): Set SENDGRID_API_KEY environment variable
 * - Mailgun: Set MAILGUN_API_KEY and MAILGUN_DOMAIN
 * - SMTP: Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */
exports.processEmailNotifications = onSchedule({
  schedule: '*/5 * * * *', // Every 5 minutes
  timeZone: 'Europe/Rome',
  region: 'europe-west1',
  secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'], // Firebase Functions v2 secrets
}, async (event) => {
  logger.info('📧 Processing email notifications...');
  
  try {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    
    // Get all pending notifications scheduled for now or earlier
    const notificationsRef = db.collection('email_notifications');
    const query = notificationsRef
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', now)
      .limit(50); // Process max 50 at a time
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      logger.info('✅ No pending email notifications to process');
      return;
    }
    
    logger.info(`📬 Found ${snapshot.size} pending notifications to process`);
    
    let sent = 0;
    let failed = 0;
    
    // Process each notification
    for (const doc of snapshot.docs) {
      try {
        const notification = doc.data();
        const userId = notification.userId;
        
        // Get user email from Firebase Auth
        let userEmail;
        try {
          const userRecord = await admin.auth().getUser(userId);
          userEmail = userRecord.email;
        } catch (error) {
          logger.error(`Error getting user email for ${userId}:`, error);
          // Try to use recipient field as fallback
          userEmail = notification.recipient;
        }
        
        if (!userEmail) {
          logger.warn(`No email found for user ${userId}, skipping notification ${doc.id}`);
          await doc.ref.update({
            status: 'failed',
            error: 'User email not found',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          failed++;
          continue;
        }
        
        // Send email (placeholder - implement actual email sending)
        const emailSent = await sendEmail({
          to: userEmail,
          subject: notification.subject,
          body: notification.body,
        });
        
        if (emailSent) {
          await doc.ref.update({
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          sent++;
          logger.info(`✅ Email sent to ${userEmail}: ${notification.subject}`);
        } else {
          throw new Error('Email sending failed');
        }
      } catch (error) {
        logger.error(`Error processing notification ${doc.id}:`, error);
        await doc.ref.update({
          status: 'failed',
          error: error.message || 'Unknown error',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        failed++;
      }
    }
    
    logger.info(`✅ Email processing complete: ${sent} sent, ${failed} failed`);
  } catch (error) {
    logger.error('Error in processEmailNotifications:', error);
    throw error;
  }
});

/**
 * Helper function to send email
 * Supports SendGrid, Mailgun, or SMTP
 */
async function sendEmail({ to, subject, body }) {
  // Check for SendGrid (preferred - free tier available)
  if (process.env.SENDGRID_API_KEY) {
    logger.info('📧 Using SendGrid to send email');
    return sendEmailViaSendGrid({ to, subject, body });
  }
  
  // Check for Mailgun
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    logger.info('📧 Using Mailgun to send email');
    return sendEmailViaMailgun({ to, subject, body });
  }
  
  // Check for SMTP
  if (process.env.SMTP_HOST) {
    logger.info('📧 Using SMTP to send email');
    return sendEmailViaSMTP({ to, subject, body });
  }
  
  // No email service configured - log and return false
  logger.warn('⚠️ No email service configured. Set SENDGRID_API_KEY, MAILGUN_API_KEY, or SMTP_HOST');
  logger.warn('💡 SendGrid offers 100 free emails/day - see EMAIL-SETUP-GUIDE.md');
  logger.info(`Would send email to ${to}: ${subject}`);
  return false;
}

/**
 * Send email via SendGrid
 */
async function sendEmailViaSendGrid({ to, subject, body }) {
  try {
    // Dynamic import to avoid requiring it if not used
    const sgMail = require('@sendgrid/mail');
    
    // Get API key from environment (Firebase Functions v2 uses process.env)
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      logger.error('SENDGRID_API_KEY not found in environment variables');
      return false;
    }
    
    sgMail.setApiKey(apiKey);
    
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@apheron.io';
    
    const msg = {
      to,
      from: fromEmail,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    };
    
    await sgMail.send(msg);
    logger.info(`✅ Email sent via SendGrid to ${to}`);
    return true;
  } catch (error) {
    logger.error('SendGrid error:', error);
    if (error.response) {
      logger.error('SendGrid response:', error.response.body);
    }
    return false;
  }
}

/**
 * Send email via Mailgun
 */
async function sendEmailViaMailgun({ to, subject, body }) {
  try {
    const formData = require('form-data');
    const Mailgun = require('mailgun.js');
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
    });
    
    await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: process.env.MAILGUN_FROM_EMAIL || `noreply@${process.env.MAILGUN_DOMAIN}`,
      to: [to],
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    });
    
    return true;
  } catch (error) {
    logger.error('Mailgun error:', error);
    return false;
  }
}

/**
 * Send email via SMTP
 */
async function sendEmailViaSMTP({ to, subject, body }) {
  try {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    });
    
    return true;
  } catch (error) {
    logger.error('SMTP error:', error);
    return false;
  }
}
