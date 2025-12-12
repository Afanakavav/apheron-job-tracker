import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { Application } from '../types';

// Use shared Functions instance configured with region

/**
 * Generate application email using AI (via Firebase Functions)
 */
export const generateApplicationEmail = async (
  application: Application,
  emailType: 'apply' | 'confirm' | 'interview_feedback' | 'feedback_request' | 'offer_accepted' | 'offer_declined',
  userFullName: string = 'Francesco Perone',
  language: string = 'it' // Language code: 'it' for Italian, 'en' for English
): Promise<{ subject: string; body: string }> => {
  try {
    console.log('🤖 [EmailGenerator] Generating email with AI...', { emailType, company: application.company, language });

    const generateApplicationEmailFn = httpsCallable(functions, 'generateApplicationEmail');
    const result = await generateApplicationEmailFn({ 
      application, 
      emailType, 
      userFullName,
      language // Pass language to Cloud Function
    });

    console.log('✅ [EmailGenerator] Email generated successfully');

    return result.data as { subject: string; body: string };
  } catch (error: any) {
    console.error('❌ [EmailGenerator] Error generating email:', error);
    
    // Check if it's a Google AI overload error (503)
    if (error.message?.includes('overloaded') || error.message?.includes('503')) {
      throw new Error('⚠️ L\'API di AI è temporaneamente sovraccarica. Riprova tra qualche secondo.');
    }
    
    // Check if it's a rate limit error (429)
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('⚠️ Limite di richieste raggiunto. Attendi qualche minuto e riprova.');
    }
    
    // Generic error
    throw new Error('Errore nella generazione dell\'email con AI. Riprova.');
  }
};

/**
 * Get user's email from Gmail API (if connected)
 */
export const getUserEmail = (): string => {
  // Try to get from localStorage (Gmail integration)
  const gmailEmail = localStorage.getItem('gmail_user_email');
  if (gmailEmail) return gmailEmail;

  // Fallback: return empty (will be filled by auth user)
  return '';
};
