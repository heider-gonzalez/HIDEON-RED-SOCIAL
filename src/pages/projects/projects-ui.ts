import type { Project } from '@/types/project';

export type UiState = {
  selectedProject: Project | null;
  editingProject: Project | null;
  deleteConfirmProject: string | null;
  searchQuery: string;
  selectedCategory: string;
  selectedStatus: string;
  institutionName: string;
};

export type UiAction =
  | { type: 'setSelectedProject'; value: Project | null }
  | { type: 'setEditingProject'; value: Project | null }
  | { type: 'setDeleteConfirmProject'; value: string | null }
  | { type: 'setSearchQuery'; value: string }
  | { type: 'setSelectedCategory'; value: string }
  | { type: 'setSelectedStatus'; value: string }
  | { type: 'setInstitutionName'; value: string };

export const uiInitialState: UiState = {
  selectedProject: null,
  editingProject: null,
  deleteConfirmProject: null,
  searchQuery: '',
  selectedCategory: 'all',
  selectedStatus: 'all',
  institutionName: '',
};

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'setSelectedProject':
      return { ...state, selectedProject: action.value };
    case 'setEditingProject':
      return { ...state, editingProject: action.value };
    case 'setDeleteConfirmProject':
      return { ...state, deleteConfirmProject: action.value };
    case 'setSearchQuery':
      return { ...state, searchQuery: action.value };
    case 'setSelectedCategory':
      return { ...state, selectedCategory: action.value };
    case 'setSelectedStatus':
      return { ...state, selectedStatus: action.value };
    case 'setInstitutionName':
      return { ...state, institutionName: action.value };
    default:
      return state;
  }
}
