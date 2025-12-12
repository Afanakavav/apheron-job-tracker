import { httpsCallable } from 'firebase/functions';
import { functions, storage } from './firebase';
import { ref, getBlob } from 'firebase/storage';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Use shared Functions instance configured with region

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text from PDF file
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Impossibile estrarre il testo dal PDF');
  }
};

/**
 * Extract text from Word file
 */
export const extractTextFromWord = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from Word:', error);
    throw new Error('Impossibile estrarre il testo dal documento Word');
  }
};

/**
 * Extract text from CV file (PDF or Word)
 * Uses Firebase Storage SDK to avoid CORS issues
 */
export const extractTextFromCV = async (fileUrl: string, fileName: string): Promise<string> => {
  try {
    // Extract storage path from URL
    // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const urlObj = new URL(fileUrl);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
    
    if (!pathMatch) {
      throw new Error('Invalid Firebase Storage URL');
    }
    
    // Decode the path (Firebase encodes it)
    const storagePath = decodeURIComponent(pathMatch[1]);
    console.log('Fetching CV from Firebase Storage:', storagePath);
    
    // Use Firebase Storage SDK instead of fetch() to avoid CORS
    const storageRef = ref(storage, storagePath);
    const blob = await getBlob(storageRef);
    
    console.log('CV blob downloaded, size:', blob.size, 'fileName:', fileName);
    
    // Detect file type from fileName
    const isPDF = fileName.toLowerCase().endsWith('.pdf');
    const isWord = fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');
    
    if (isPDF) {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      return await extractTextFromPDF(file);
    } else if (isWord) {
      const file = new File([blob], fileName, { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      return await extractTextFromWord(file);
    } else {
      throw new Error('Formato file non supportato. Usa file PDF o Word (.docx).');
    }
  } catch (error) {
    console.error('Error extracting text from CV:', error);
    if (error instanceof Error && error.message.includes('Formato file')) {
      throw error; // Re-throw format error as-is
    }
    throw new Error('Impossibile estrarre il testo dal CV');
  }
};

/**
 * Fetch job description from URL
 */
export const fetchJobDescriptionFromURL = async (url: string): Promise<string> => {
  try {
    const fn = httpsCallable(functions, 'fetchJobDescription');
    const res = await fn({ url });
    return (res.data as any).text as string;
  } catch (error) {
    console.error('Error fetching job description from URL:', error);
    throw new Error('Impossibile recuperare la job description dall\'URL. Per favore, copia e incolla il testo manualmente.');
  }
};

/**
 * CV Tailoring Result
 */
export interface CVTailoringResult {
  summary: string;
  keywordsSuggested: string[];
  skillsToHighlight: string[];
  sectionsToModify: {
    section: string;
    currentContent: string;
    suggestedContent: string;
    reasoning: string;
  }[];
  tailoredCV: string;
  matchScore: number;
}

/**
 * Tailor CV to job description using AI
 */
export const tailorCVToJob = async (
  cvText: string,
  jobDescription: string,
  companyName?: string,
  jobTitle?: string,
  language?: string
): Promise<CVTailoringResult> => {
  try {
    // Call Firebase Function instead of direct Gemini API
    const tailorCVToJobFn = httpsCallable(functions, 'tailorCVToJob');
    const result = await tailorCVToJobFn({ 
      cvText, 
      jobDescription, 
      companyName: companyName || '', 
      jobTitle: jobTitle || '',
      language
    });

    const data = result.data as any;
    
    // Return the structured result from the Cloud Function
    return {
      summary: data.summary || 'CV ottimizzato con successo utilizzando AI',
      keywordsSuggested: Array.isArray(data.keywordsSuggested) ? data.keywordsSuggested : [],
      skillsToHighlight: Array.isArray(data.skillsToHighlight) ? data.skillsToHighlight : [],
      sectionsToModify: Array.isArray(data.sectionsToModify) ? data.sectionsToModify : [],
      tailoredCV: data.tailoredCV || '',
      matchScore: typeof data.matchScore === 'number' ? data.matchScore : 85,
    };
  } catch (error: any) {
    console.error('Error tailoring CV:', error);
    throw new Error(`Errore nell'adattamento del CV: ${error.message}`);
  }
};

/**
 * Generate a comparison between original and tailored CV
 */
export interface CVComparison {
  originalLength: number;
  tailoredLength: number;
  addedKeywords: string[];
  modifiedSections: number;
  improvementSuggestions: string[];
}

export const compareCV = (
  originalCV: string,
  tailoredResult: CVTailoringResult
): CVComparison => {
  return {
    originalLength: originalCV.split(' ').length,
    tailoredLength: tailoredResult.tailoredCV.split(' ').length,
    addedKeywords: tailoredResult.keywordsSuggested,
    modifiedSections: tailoredResult.sectionsToModify.length,
    improvementSuggestions: tailoredResult.sectionsToModify.map(s => 
      `${s.section}: ${s.reasoning}`
    ),
  };
};

