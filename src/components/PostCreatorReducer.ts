export interface PostCreatorState {
  content: string;
  selectedFiles: File[];
  filePreviews: string[];
  postType: 'regular' | 'idea' | 'proyecto' | null;
  contentStyle: {
    isTextOnly: boolean;
    backgroundKey: string;
    textColor: string;
  };
  idea: {
    title: string;
    description: string;
    max_participants: number;
    required_skills: string[];
    deadline: string | null;
    contact_link: string | null;
  };
  proyecto: {
    title: string;
    description: string;
    status: 'idea' | 'in_progress' | 'completed';
    required_skills: string[];
    contact_link: string;
    demo_url: string;
    github_url: string;
    impact: string;
    stack: string[];
    max_participants: number;
  };
  userGroups: Array<{
    group_id: string;
    group_name: string;
    status?: string;
  }>;
  selectedGroupId: string;
  isLoadingGroups: boolean;
  userCompanies: Array<{
    company_id: string;
    company_name: string;
    logo_url?: string | null;
  }>;
  selectedCompanyId: string;
  isLoadingCompanies: boolean;
  visibility: 'public' | 'friends' | 'private' | 'incognito';
  selectedTemplate: any;
  showTemplateSelector: boolean;
  showRestoreDraft: boolean;
  autosaveData: any;
  hasCheckedForDraft: boolean;
  isUploading: boolean;
}

export type PostCreatorAction =
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_SELECTED_FILES'; payload: File[] }
  | { type: 'SET_FILE_PREVIEWS'; payload: string[] }
  | { type: 'SET_POST_TYPE'; payload: 'regular' | 'idea' | 'proyecto' | null }
  | { type: 'SET_CONTENT_STYLE'; payload: { isTextOnly: boolean; backgroundKey: string; textColor: string } }
  // Idea actions
  | { type: 'SET_IDEA_TITLE'; payload: string }
  | { type: 'SET_IDEA_DESCRIPTION'; payload: string }
  | { type: 'SET_IDEA_PARTICIPANTS'; payload: number }
  | { type: 'SET_IDEA_SKILLS'; payload: string[] }
  | { type: 'SET_IDEA_DEADLINE'; payload: string | null }
  | { type: 'SET_IDEA_CONTACT'; payload: string | null }
  // Project actions
  | { type: 'SET_PROYECTO_TITLE'; payload: string }
  | { type: 'SET_PROYECTO_DESCRIPTION'; payload: string }
  | { type: 'SET_PROYECTO_STATUS'; payload: 'idea' | 'in_progress' | 'completed' }
  | { type: 'SET_PROYECTO_SKILLS'; payload: string[] }
  | { type: 'SET_PROYECTO_CONTACT'; payload: string }
  | { type: 'SET_PROYECTO_DEMO'; payload: string }
  | { type: 'SET_PROYECTO_GITHUB'; payload: string }
  | { type: 'SET_PROYECTO_IMPACT'; payload: string }
  | { type: 'SET_PROYECTO_STACK'; payload: string[] }
  | { type: 'SET_PROYECTO_PARTICIPANTS'; payload: number }
  // Group actions
  | { type: 'SET_USER_GROUPS'; payload: Array<{ group_id: string; group_name: string; status?: string }> }
  | { type: 'SET_SELECTED_GROUP_ID'; payload: string }
  | { type: 'SET_LOADING_GROUPS'; payload: boolean }
  // Company actions
  | { type: 'SET_USER_COMPANIES'; payload: Array<{ company_id: string; company_name: string; logo_url?: string | null }> }
  | { type: 'SET_SELECTED_COMPANY_ID'; payload: string }
  | { type: 'SET_LOADING_COMPANIES'; payload: boolean }
  // Other actions
  | { type: 'SET_VISIBILITY'; payload: 'public' | 'friends' | 'private' | 'incognito' }
  | { type: 'SET_TEMPLATE'; payload: any }
  | { type: 'TOGGLE_TEMPLATE_SELECTOR' }
  | { type: 'TOGGLE_RESTORE_DRAFT' }
  | { type: 'SET_AUTOSAVE_DATA'; payload: any }
  | { type: 'SET_CHECKED_DRAFT'; payload: boolean }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'RESET_FORM' };

export const initialPostCreatorState: PostCreatorState = {
  content: '',
  selectedFiles: [],
  filePreviews: [],
  postType: null,
  contentStyle: {
    isTextOnly: true,
    backgroundKey: 'gradient-blue',
    textColor: 'white'
  },
  idea: {
    title: '',
    description: '',
    max_participants: 5,
    required_skills: [],
    deadline: null,
    contact_link: null
  },
  proyecto: {
    title: '',
    description: '',
    status: 'in_progress',
    required_skills: [],
    contact_link: '',
    demo_url: '',
    github_url: '',
    impact: '',
    stack: [],
    max_participants: 5
  },
  userGroups: [],
  selectedGroupId: '',
  isLoadingGroups: false,
  userCompanies: [],
  selectedCompanyId: '',
  isLoadingCompanies: false,
  visibility: 'public',
  selectedTemplate: null,
  showTemplateSelector: false,
  showRestoreDraft: false,
  autosaveData: null,
  hasCheckedForDraft: false,
  isUploading: false
};

export function postCreatorReducer(state: PostCreatorState, action: PostCreatorAction): PostCreatorState {
  switch (action.type) {
    case 'SET_CONTENT':
      return { ...state, content: action.payload };
    case 'SET_SELECTED_FILES':
      return { ...state, selectedFiles: action.payload };
    case 'SET_FILE_PREVIEWS':
      return { ...state, filePreviews: action.payload };
    case 'SET_POST_TYPE':
      return { ...state, postType: action.payload };
    case 'SET_CONTENT_STYLE':
      return { ...state, contentStyle: action.payload };
    
    // Idea actions
    case 'SET_IDEA_TITLE':
      return { ...state, idea: { ...state.idea, title: action.payload } };
    case 'SET_IDEA_DESCRIPTION':
      return { ...state, idea: { ...state.idea, description: action.payload } };
    case 'SET_IDEA_PARTICIPANTS':
      return { ...state, idea: { ...state.idea, max_participants: action.payload } };
    case 'SET_IDEA_SKILLS':
      return { ...state, idea: { ...state.idea, required_skills: action.payload } };
    case 'SET_IDEA_DEADLINE':
      return { ...state, idea: { ...state.idea, deadline: action.payload } };
    case 'SET_IDEA_CONTACT':
      return { ...state, idea: { ...state.idea, contact_link: action.payload } };
    
    // Project actions
    case 'SET_PROYECTO_TITLE':
      return { ...state, proyecto: { ...state.proyecto, title: action.payload } };
    case 'SET_PROYECTO_DESCRIPTION':
      return { ...state, proyecto: { ...state.proyecto, description: action.payload } };
    case 'SET_PROYECTO_STATUS':
      return { ...state, proyecto: { ...state.proyecto, status: action.payload } };
    case 'SET_PROYECTO_SKILLS':
      return { ...state, proyecto: { ...state.proyecto, required_skills: action.payload } };
    case 'SET_PROYECTO_CONTACT':
      return { ...state, proyecto: { ...state.proyecto, contact_link: action.payload } };
    case 'SET_PROYECTO_DEMO':
      return { ...state, proyecto: { ...state.proyecto, demo_url: action.payload } };
    case 'SET_PROYECTO_GITHUB':
      return { ...state, proyecto: { ...state.proyecto, github_url: action.payload } };
    case 'SET_PROYECTO_IMPACT':
      return { ...state, proyecto: { ...state.proyecto, impact: action.payload } };
    case 'SET_PROYECTO_STACK':
      return { ...state, proyecto: { ...state.proyecto, stack: action.payload } };
    case 'SET_PROYECTO_PARTICIPANTS':
      return { ...state, proyecto: { ...state.proyecto, max_participants: action.payload } };
    
    // Group actions
    case 'SET_USER_GROUPS':
      return { ...state, userGroups: action.payload };
    case 'SET_SELECTED_GROUP_ID':
      return { ...state, selectedGroupId: action.payload };
    case 'SET_LOADING_GROUPS':
      return { ...state, isLoadingGroups: action.payload };
    
    // Company actions
    case 'SET_USER_COMPANIES':
      return { ...state, userCompanies: action.payload };
    case 'SET_SELECTED_COMPANY_ID':
      return { ...state, selectedCompanyId: action.payload };
    case 'SET_LOADING_COMPANIES':
      return { ...state, isLoadingCompanies: action.payload };
    
    // Other actions
    case 'SET_VISIBILITY':
      return { ...state, visibility: action.payload };
    case 'SET_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };
    case 'TOGGLE_TEMPLATE_SELECTOR':
      return { ...state, showTemplateSelector: !state.showTemplateSelector };
    case 'TOGGLE_RESTORE_DRAFT':
      return { ...state, showRestoreDraft: !state.showRestoreDraft };
    case 'SET_AUTOSAVE_DATA':
      return { ...state, autosaveData: action.payload };
    case 'SET_CHECKED_DRAFT':
      return { ...state, hasCheckedForDraft: action.payload };
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    
    case 'RESET_FORM':
      return initialPostCreatorState;
    
    default:
      return state;
  }
}
