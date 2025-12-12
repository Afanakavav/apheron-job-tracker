// Form Auto-Fill Service - Helps fill job application forms automatically
import type { Application } from '../types';

export interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  value?: string;
}

export interface UserFormData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  resume?: File;
  coverLetter?: string;
  availability?: string;
  salary?: string;
  noticePeriod?: string;
  workAuthorization?: string;
}

/**
 * Get label text for an input field
 */
const getLabelForInput = (input: HTMLElement): string => {
  // Try to find associated label
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) {
      return label.textContent?.trim() || '';
    }
  }

  // Try to find parent label
  const parentLabel = input.closest('label');
  if (parentLabel) {
    return parentLabel.textContent?.trim() || '';
  }

  // Try to find nearby label
  const prevSibling = input.previousElementSibling;
  if (prevSibling && prevSibling.tagName === 'LABEL') {
    return prevSibling.textContent?.trim() || '';
  }

  // Try placeholder
  if (input instanceof HTMLInputElement && input.placeholder) {
    return input.placeholder;
  }

  return '';
};

/**
 * Analyze a form and extract field information
 */
export const analyzeForm = (form: HTMLFormElement): FormField[] => {
  const fields: FormField[] = [];

  form.querySelectorAll('input, textarea, select').forEach((element) => {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    // Skip hidden, submit, button, and checkbox/radio (unless it's a specific field we want)
    if (
      input.type === 'hidden' ||
      input.type === 'submit' ||
      input.type === 'button' ||
      input.type === 'reset' ||
      (input.type === 'checkbox' && !input.name?.toLowerCase().includes('authorization')) ||
      (input.type === 'radio' && !(input as HTMLInputElement).checked)
    ) {
      return;
    }

    const field: FormField = {
      name: input.name || input.id || '',
      type: input.type || 'text',
      label: getLabelForInput(input),
      required: input.hasAttribute('required'),
      element: input,
    };

    fields.push(field);
  });

  return fields;
};

/**
 * Detect field type based on name, label, and type
 */
const detectFieldType = (field: FormField): keyof UserFormData | null => {
  const name = field.name.toLowerCase();
  const label = field.label.toLowerCase();
  const type = field.type.toLowerCase();

  // First name
  if (
    name.includes('first') ||
    name.includes('fname') ||
    label.includes('first name') ||
    label.includes('nome')
  ) {
    return 'firstName';
  }

  // Last name
  if (
    name.includes('last') ||
    name.includes('lname') ||
    name.includes('surname') ||
    label.includes('last name') ||
    label.includes('cognome')
  ) {
    return 'lastName';
  }

  // Full name
  if (
    name.includes('fullname') ||
    name.includes('name') && !name.includes('first') && !name.includes('last') ||
    label.includes('full name') ||
    label.includes('nome completo')
  ) {
    return 'fullName';
  }

  // Email
  if (
    type === 'email' ||
    name.includes('email') ||
    name.includes('e-mail') ||
    label.includes('email') ||
    label.includes('e-mail')
  ) {
    return 'email';
  }

  // Phone
  if (
    type === 'tel' ||
    name.includes('phone') ||
    name.includes('mobile') ||
    name.includes('telephone') ||
    label.includes('phone') ||
    label.includes('telefono')
  ) {
    return 'phone';
  }

  // LinkedIn
  if (
    name.includes('linkedin') ||
    name.includes('linked') ||
    label.includes('linkedin') ||
    label.includes('linked in')
  ) {
    return 'linkedin';
  }

  // GitHub
  if (
    name.includes('github') ||
    name.includes('git') ||
    label.includes('github')
  ) {
    return 'github';
  }

  // Portfolio/Website
  if (
    type === 'url' ||
    name.includes('portfolio') ||
    name.includes('website') ||
    name.includes('url') ||
    label.includes('portfolio') ||
    label.includes('website')
  ) {
    return 'portfolio';
  }

  // Address
  if (
    name.includes('address') ||
    name.includes('street') ||
    label.includes('address') ||
    label.includes('indirizzo')
  ) {
    return 'address';
  }

  // City
  if (
    name.includes('city') ||
    label.includes('city') ||
    label.includes('città')
  ) {
    return 'city';
  }

  // ZIP Code
  if (
    name.includes('zip') ||
    name.includes('postal') ||
    name.includes('cap') ||
    label.includes('zip') ||
    label.includes('postal code')
  ) {
    return 'zipCode';
  }

  // Country
  if (
    name.includes('country') ||
    label.includes('country') ||
    label.includes('paese')
  ) {
    return 'country';
  }

  // Salary
  if (
    name.includes('salary') ||
    name.includes('compensation') ||
    name.includes('pay') ||
    label.includes('salary') ||
    label.includes('stipendio')
  ) {
    return 'salary';
  }

  // Availability
  if (
    name.includes('availability') ||
    name.includes('start') ||
    label.includes('availability') ||
    label.includes('disponibilità')
  ) {
    return 'availability';
  }

  // Notice Period
  if (
    name.includes('notice') ||
    name.includes('preavviso') ||
    label.includes('notice period')
  ) {
    return 'noticePeriod';
  }

  // Work Authorization
  if (
    name.includes('authorization') ||
    name.includes('visa') ||
    name.includes('work permit') ||
    label.includes('authorization')
  ) {
    return 'workAuthorization';
  }

  return null;
};

/**
 * Get value for a field based on user data
 */
const getValueForField = (
  field: FormField,
  userData: UserFormData
): string | null => {
  const fieldType = detectFieldType(field);

  if (!fieldType) {
    return null;
  }

  const value = userData[fieldType];

  if (value === undefined || value === null) {
    return null;
  }

  // Handle full name split
  if (fieldType === 'firstName' && !userData.firstName && userData.fullName) {
    return userData.fullName.split(' ')[0] || '';
  }

  if (fieldType === 'lastName' && !userData.lastName && userData.fullName) {
    const parts = userData.fullName.split(' ');
    return parts.slice(1).join(' ') || '';
  }

  return String(value);
};

/**
 * Auto-fill form with user data
 * Returns number of fields filled
 */
export const autoFillForm = (
  form: HTMLFormElement,
  userData: UserFormData
): { filled: number; total: number; fields: FormField[] } => {
  const fields = analyzeForm(form);
  let filledCount = 0;
  const filledFields: FormField[] = [];

  fields.forEach((field) => {
    const value = getValueForField(field, userData);

    if (value && field.element) {
      try {
        if (
          field.element instanceof HTMLInputElement ||
          field.element instanceof HTMLTextAreaElement
        ) {
          // Set value
          field.element.value = value;

          // Trigger events to ensure form validation works
          field.element.dispatchEvent(new Event('input', { bubbles: true }));
          field.element.dispatchEvent(new Event('change', { bubbles: true }));
          field.element.dispatchEvent(new Event('blur', { bubbles: true }));

          filledCount++;
          filledFields.push(field);
        } else if (field.element instanceof HTMLSelectElement) {
          // Try to find matching option
          const option = Array.from(field.element.options).find(
            (opt) => opt.value.toLowerCase() === value.toLowerCase() ||
                     opt.text.toLowerCase().includes(value.toLowerCase())
          );

          if (option) {
            field.element.value = option.value;
            field.element.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
            filledFields.push(field);
          }
        }
      } catch (error) {
        console.warn(`Error filling field ${field.name}:`, error);
      }
    }
  });

  return {
    filled: filledCount,
    total: fields.length,
    fields: filledFields,
  };
};

/**
 * Fill file input with resume
 */
export const fillFileInput = async (
  fileInput: HTMLInputElement,
  file: File
): Promise<boolean> => {
  try {
    if (fileInput.type !== 'file') {
      return false;
    }

    // Create a new FileList with the file
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // Trigger change event
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
  } catch (error) {
    console.error('Error filling file input:', error);
    return false;
  }
};

/**
 * Get user data from application or user profile
 */
export const getUserFormData = async (
  userId: string,
  application?: Application
): Promise<UserFormData> => {
  // In a real implementation, you would fetch user profile from Firestore
  // For now, we'll use localStorage or return default structure
  
  const storedData = localStorage.getItem(`userFormData_${userId}`);
  let userData: UserFormData = {};

  if (storedData) {
    try {
      userData = JSON.parse(storedData);
    } catch (error) {
      console.error('Error parsing stored user data:', error);
    }
  }

  // Merge with application data if available
  if (application) {
    if (application.recruiterEmail) {
      userData.email = application.recruiterEmail;
    }
  }

  return userData;
};

/**
 * Save user form data for future use
 */
export const saveUserFormData = (userId: string, data: UserFormData): void => {
  try {
    localStorage.setItem(`userFormData_${userId}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving user form data:', error);
  }
};

