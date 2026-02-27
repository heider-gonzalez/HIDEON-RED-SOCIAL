import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationField {
  value: any;
  rules: ValidationRule;
  label: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldErrors: Record<string, string[]>;
  missingFields: string[];
  fieldStatus: Record<string, 'valid' | 'error' | 'warning' | 'empty'>;
}

export function validateField(value: any, rules: ValidationRule, label: string): string[] {
  const errors: string[] = [];

  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    errors.push(`${label} es requerido`);
  }

  if (value && typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${label} debe tener al menos ${rules.minLength} caracteres`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${label} no puede exceder ${rules.maxLength} caracteres`);
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${label} tiene un formato inválido`);
    }
  }

  if (value && rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      errors.push(customError);
    }
  }

  return errors;
}

export function useFormValidation(selectedPostType: string | null, formData: any): ValidationResult {
  const result = useMemo(() => {
    const fields = getPostTypeValidation(selectedPostType, formData);
    const fieldErrors: Record<string, string[]> = {};
    const fieldStatus: Record<string, 'valid' | 'error' | 'warning' | 'empty'> = {};
    const allErrors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    Object.entries(fields).forEach(([fieldName, field]) => {
      const errors = validateField(field.value, field.rules, field.label);
      
      if (errors.length > 0) {
        fieldErrors[fieldName] = errors;
        fieldStatus[fieldName] = 'error';
        allErrors.push(...errors);
        
        if (errors.some(e => e.includes('requerido'))) {
          missingFields.push(field.label);
        }
      } else if (field.value && field.value !== '') {
        fieldStatus[fieldName] = 'valid';
      } else {
        fieldStatus[fieldName] = 'empty';
      }
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings,
      fieldErrors,
      missingFields,
      fieldStatus
    };
  }, [selectedPostType, formData]);

  return result;
}

export function getPostTypeValidation(selectedPostType: string | null, formData: any): Record<string, ValidationField> {
  const baseFields: Record<string, ValidationField> = {};

  // Common validation for institution
  if (selectedPostType === 'idea' || selectedPostType === 'proyecto') {
    baseFields.institutionName = {
      value: formData.institutionName || '',
      rules: { required: true },
      label: 'Institución'
    };

    if (formData.institutionName === 'Otra (No listada)') {
      baseFields.otherInstitutionName = {
        value: formData.otherInstitutionName || '',
        rules: { required: true, minLength: 2 },
        label: 'Nombre de la institución'
      };
    }
  }

  switch (selectedPostType) {
    case 'idea':
      return {
        ...baseFields,
        ideaTitle: {
          value: formData.ideaTitle || '',
          rules: { required: true, minLength: 5, maxLength: 100 },
          label: 'Título de la idea'
        },
        ideaDescription: {
          value: formData.ideaDescription || '',
          rules: { required: true, minLength: 20, maxLength: 2000 },
          label: 'Descripción de la idea'
        }
      };

    case 'proyecto':
      return {
        ...baseFields,
        projectTitle: {
          value: formData.projectTitle || '',
          rules: { required: true, minLength: 5, maxLength: 100 },
          label: 'Título del proyecto'
        },
        projectDescription: {
          value: formData.projectDescription || '',
          rules: { required: true, minLength: 20, maxLength: 2000 },
          label: 'Descripción del proyecto'
        },
        projectStatus: {
          value: formData.projectStatus || '',
          rules: { required: true },
          label: 'Estado del proyecto'
        },
        projectTechnologies: {
          value: formData.projectTechnologies || [],
          rules: { 
            required: false,
            custom: (techs: string[]) => {
              if (techs.length > 8) return 'Máximo 8 tecnologías permitidas';
              return null;
            }
          },
          label: 'Tecnologías'
        },
        projectTeamMembers: {
          value: formData.projectTeamMembers || [],
          rules: { 
            required: false,
            custom: (members: string[]) => {
              if (members.length > 5) return 'Máximo 5 miembros permitidos';
              return null;
            }
          },
          label: 'Miembros del equipo'
        },
        projectGithubUrl: {
          value: formData.projectGithubUrl || '',
          rules: { 
            required: false,
            pattern: /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/
          },
          label: 'URL de GitHub'
        },
        projectDemoUrl: {
          value: formData.projectDemoUrl || '',
          rules: { 
            required: false,
            pattern: /^https?:\/\/.+\..+/
          },
          label: 'URL de demo'
        }
      };

    case 'encuesta':
      return {
        pollQuestion: {
          value: formData.pollQuestion || '',
          rules: { required: true, minLength: 5, maxLength: 200 },
          label: 'Pregunta de la encuesta'
        },
        pollOptions: {
          value: formData.pollOptions || [],
          rules: {
            required: true,
            custom: (options: string[]) => {
              const validOptions = options.filter(opt => opt && opt.trim() !== '');
              if (validOptions.length < 2) return 'Mínimo 2 opciones requeridas';
              if (validOptions.length > 10) return 'Máximo 10 opciones permitidas';
              return null;
            }
          },
          label: 'Opciones de la encuesta'
        }
      };

    case 'evento':
      return {
        eventTitle: {
          value: formData.eventTitle || '',
          rules: { required: true, minLength: 5, maxLength: 100 },
          label: 'Título del evento'
        },
        eventDescription: {
          value: formData.eventDescription || '',
          rules: { required: true, minLength: 10, maxLength: 2000 },
          label: 'Descripción del evento'
        },
        eventStartDate: {
          value: formData.eventStartDate || '',
          rules: { required: true },
          label: 'Fecha de inicio'
        },
        eventEndDate: {
          value: formData.eventEndDate || '',
          rules: { 
            required: true,
            custom: (endDate: string) => {
              if (formData.eventStartDate && endDate && new Date(endDate) <= new Date(formData.eventStartDate)) {
                return 'La fecha de fin debe ser posterior a la de inicio';
              }
              return null;
            }
          },
          label: 'Fecha de fin'
        },
        eventLocation: {
          value: formData.eventLocation || '',
          rules: { 
            required: formData.eventLocationType !== 'virtual',
            minLength: 5
          },
          label: 'Ubicación del evento'
        },
        eventMeetingLink: {
          value: formData.eventMeetingLink || '',
          rules: { 
            required: formData.eventLocationType === 'virtual',
            pattern: /^https?:\/\/.+/
          },
          label: 'Link de reunión'
        },
        eventMaxAttendees: {
          value: formData.eventMaxAttendees || 0,
          rules: { 
            required: true,
            custom: (max: number) => {
              if (max < 1) return 'Mínimo 1 asistente requerido';
              if (max > 10000) return 'Máximo 10,000 asistentes permitidos';
              return null;
            }
          },
          label: 'Máximo de asistentes'
        }
      };

    case 'empleo':
      return {
        content: {
          value: formData.content || '',
          rules: { required: true, minLength: 20, maxLength: 2000 },
          label: 'Descripción de la oferta'
        }
      };

    case 'servicios':
      return {
        serviceCategory: {
          value: formData.serviceCategory || '',
          rules: { required: true },
          label: 'Categoría del servicio'
        },
        content: {
          value: formData.content || '',
          rules: { required: true, minLength: 20, maxLength: 2000 },
          label: 'Descripción del servicio'
        }
      };

    default:
      if (selectedPostType === null) {
        return {
          content: {
            value: formData.content || '',
            rules: { required: true, minLength: 1 },
            label: 'Contenido'
          }
        };
      }
      return {};
  }
}

// Legacy helpers for backward compatibility
export const validationHelpers = {
  required: (value: any) => Boolean(value && value.toString().trim()),
  minLength: (min: number) => (value: string) => value && value.trim().length >= min,
  maxLength: (max: number) => (value: string) => !value || value.trim().length <= max,
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  url: (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  number: (value: any) => !isNaN(Number(value)),
  range: (min: number, max: number) => (value: number) => value >= min && value <= max,
  arrayMinLength: (min: number) => (arr: any[]) => Array.isArray(arr) && arr.length >= min,
  oneOf: (options: any[]) => (value: any) => options.includes(value)
};