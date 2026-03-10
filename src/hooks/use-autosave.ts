import { useEffect, useRef } from 'react';

export interface AutosaveData {
  content: string;
  ideaTitle?: string;
  ideaDescription?: string;
  ideaTechnologies?: string[];
  ideaTechInput?: string;
  ideaTags?: string[];
  ideaTagInput?: string;
  ideaGithubUrl?: string;
  ideaDemoUrl?: string;
  projectTitle?: string;
  projectDescription?: string;
  projectStatus?: 'idea' | 'in_progress' | 'completed';
  projectTechnologies?: string[];
  projectObjectives?: string;
  projectTeamMembers?: string[];
  projectGithubUrl?: string;
  projectDemoUrl?: string;
  pollQuestion?: string;
  pollOptions?: string[];
  eventTitle?: string;
  eventDescription?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventLocationType?: 'presencial' | 'virtual' | 'híbrido';
  eventLocation?: string;
  eventMeetingLink?: string;
  eventCategory?: string;
  eventMaxAttendees?: number;
  serviceCategory?: string;
  institutionName?: string;
  otherInstitutionName?: string;
  selectedTemplate?: {
    id: string;
    name: string;
    category: string;
  };
  savedAt: number;
}

const AUTOSAVE_KEY = 'hsocial_post_draft';
const AUTOSAVE_INTERVAL = 5000; // 5 seconds

export function useAutosave(
  isVisible: boolean,
  selectedPostType: string | null,
  data: Partial<AutosaveData>,
  onSave?: (data: AutosaveData) => void
) {
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<number>(0);

  // Save data to localStorage
  const saveData = (dataToSave: Partial<AutosaveData>) => {
    try {
      const autosaveData: AutosaveData = {
        ...dataToSave,
        savedAt: Date.now(),
      } as AutosaveData;
      
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(autosaveData));
      lastSaveRef.current = Date.now();
      onSave?.(autosaveData);
    } catch (error) {
      console.warn('Failed to autosave:', error);
    }
  };

  // Load data from localStorage
  const loadSavedData = (): AutosaveData | null => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return null;
      
      const data = JSON.parse(saved) as AutosaveData;
      
      // Check if data is too old (older than 24 hours)
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - data.savedAt > dayInMs) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('Failed to load autosaved data:', error);
      return null;
    }
  };

  // Clear autosaved data
  const clearAutosave = () => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch (error) {
      console.warn('Failed to clear autosaved data:', error);
    }
  };

  // Check if there's saved data for current post type
  const hasSavedData = (): boolean => {
    const saved = loadSavedData();
    if (!saved) return false;
    
    // Check if the saved data matches the current post type
    if (selectedPostType === 'idea' && saved.ideaTitle) return true;
    if (selectedPostType === 'proyecto' && saved.projectTitle) return true;
    if (selectedPostType === 'encuesta' && saved.pollQuestion) return true;
    if (selectedPostType === 'evento' && saved.eventTitle) return true;
    if (selectedPostType === 'empleo' && saved.content) return true;
    if (selectedPostType === 'servicios' && saved.serviceCategory) return true;
    if (selectedPostType === null && saved.content) return true;
    
    return false;
  };

  // Set up autosave interval
  useEffect(() => {
    if (!isVisible) {
      // Clear timeout when modal is not visible
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      return;
    }

    // Debounced save function
    const debouncedSave = () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      
      autosaveTimeoutRef.current = setTimeout(() => {
        saveData(data);
      }, AUTOSAVE_INTERVAL);
    };

    // Save immediately when data changes
    debouncedSave();

    // Set up interval for periodic saves
    const interval = setInterval(() => {
      saveData(data);
    }, AUTOSAVE_INTERVAL * 2); // Double interval for periodic saves

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      clearInterval(interval);
    };
  }, [isVisible, data, selectedPostType, onSave]);

  return {
    saveData,
    loadSavedData,
    clearAutosave,
    hasSavedData,
    lastSavedAt: lastSaveRef.current,
  };
}
