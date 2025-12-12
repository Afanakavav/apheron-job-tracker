import type { ApplicationStatus } from '../types';

export const translateStatus = (status: ApplicationStatus): string => {
  const translations: Record<ApplicationStatus, string> = {
    saved: 'Da candidarsi',
    applied: 'Candidatura Inviata',
    interview_1: 'Colloquio Recruiter',
    interview_2: 'Colloquio Manager',
    interview_3: 'Colloquio Tecnico',
    interview_4: 'Colloquio Panel',
    offer: 'Offerta Ricevuta',
    rejected: 'Eliminata',
  };

  return translations[status] || status;
};

