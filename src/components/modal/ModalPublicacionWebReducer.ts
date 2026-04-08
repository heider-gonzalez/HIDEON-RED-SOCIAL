export type PostTypeExtended = 'idea' | 'proyecto' | 'encuesta' | 'evento' | 'empleo' | 'servicios' | 'regular';

export interface ModalState {
  content: string;
  selectedFiles: File[];
  filePreviews: string[];
  selectedPostType: PostTypeExtended | null;
  visibility: 'public' | 'friends' | 'private';
  showPostTypeMenu: boolean;
  showTemplateSelector: boolean;
  showMusicSelector: boolean;
  showAudioEditor: boolean;
  selectedAudioTrack: any;
  selectedAudioData: any;
  institutionName: string;
  otherInstitutionName: string;
  selectedTemplate: any;
  showRestoreDraft: boolean;
  autosaveData: any;
  hasCheckedForDraft: boolean;
  isPublishingInternal: boolean;
  pullDistance: number;
  isPullRefreshing: boolean;
  newPostsCount: number;
  
  // Idea fields
  ideaTitle: string;
  ideaDescription: string;
  ideaTechnologies: string[];
  ideaTechInput: string;
  ideaTags: string[];
  ideaTagInput: string;
  ideaGithubUrl: string;
  ideaDemoUrl: string;
  
  // Project fields
  projectTitle: string;
  projectDescription: string;
  projectStatus: 'idea' | 'in_progress' | 'completed';
  projectTechnologies: string[];
  projectHashtags: string[];
  projectObjectives: string;
  projectTeamMembers: string[];
  projectGithubUrl: string;
  projectDemoUrl: string;
  techInput: string;
  hashtagInput: string;
  teamMemberInput: string;
  
  // Poll fields
  pollQuestion: string;
  pollOptions: string[];
  
  // Event fields
  eventTitle: string;
  eventDescription: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocationType: 'presencial' | 'virtual' | 'híbrido';
  eventLocation: string;
  eventMeetingLink: string;
  eventCategory: 'conference' | 'seminar' | 'workshop' | 'hackathon' | 'webinar' | 'networking' | 'career_fair';
  eventMaxAttendees: number;
  
  // Service fields
  serviceCategory: string;
}

export type ModalAction =
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_SELECTED_FILES'; payload: File[] }
  | { type: 'SET_FILE_PREVIEWS'; payload: string[] }
  | { type: 'SET_POST_TYPE'; payload: PostTypeExtended | null }
  | { type: 'SET_VISIBILITY'; payload: 'public' | 'friends' | 'private' }
  | { type: 'TOGGLE_POST_TYPE_MENU' }
  | { type: 'TOGGLE_TEMPLATE_SELECTOR' }
  | { type: 'TOGGLE_MUSIC_SELECTOR' }
  | { type: 'TOGGLE_AUDIO_EDITOR' }
  | { type: 'SET_AUDIO_TRACK'; payload: any }
  | { type: 'SET_AUDIO_DATA'; payload: any }
  | { type: 'SET_INSTITUTION_NAME'; payload: string }
  | { type: 'SET_OTHER_INSTITUTION_NAME'; payload: string }
  | { type: 'SET_TEMPLATE'; payload: any }
  | { type: 'TOGGLE_RESTORE_DRAFT' }
  | { type: 'SET_AUTOSAVE_DATA'; payload: any }
  | { type: 'SET_CHECKED_DRAFT'; payload: boolean }
  | { type: 'SET_PUBLISHING'; payload: boolean }
  | { type: 'SET_PULL_DISTANCE'; payload: number }
  | { type: 'SET_PULL_REFRESHING'; payload: boolean }
  | { type: 'SET_NEW_POSTS_COUNT'; payload: number }
  | { type: 'RESET_FORM' }
  // Idea actions
  | { type: 'SET_IDEA_TITLE'; payload: string }
  | { type: 'SET_IDEA_DESCRIPTION'; payload: string }
  | { type: 'SET_IDEA_TECHNOLOGIES'; payload: string[] }
  | { type: 'SET_IDEA_TECH_INPUT'; payload: string }
  | { type: 'SET_IDEA_TAGS'; payload: string[] }
  | { type: 'SET_IDEA_TAG_INPUT'; payload: string }
  | { type: 'SET_IDEA_GITHUB_URL'; payload: string }
  | { type: 'SET_IDEA_DEMO_URL'; payload: string }
  // Project actions
  | { type: 'SET_PROJECT_TITLE'; payload: string }
  | { type: 'SET_PROJECT_DESCRIPTION'; payload: string }
  | { type: 'SET_PROJECT_STATUS'; payload: 'idea' | 'in_progress' | 'completed' }
  | { type: 'SET_PROJECT_TECHNOLOGIES'; payload: string[] }
  | { type: 'SET_PROJECT_HASHTAGS'; payload: string[] }
  | { type: 'SET_PROJECT_OBJECTIVES'; payload: string }
  | { type: 'SET_PROJECT_TEAM_MEMBERS'; payload: string[] }
  | { type: 'SET_PROJECT_GITHUB_URL'; payload: string }
  | { type: 'SET_PROJECT_DEMO_URL'; payload: string }
  | { type: 'SET_TECH_INPUT'; payload: string }
  | { type: 'SET_HASHTAG_INPUT'; payload: string }
  | { type: 'SET_TEAM_MEMBER_INPUT'; payload: string }
  // Poll actions
  | { type: 'SET_POLL_QUESTION'; payload: string }
  | { type: 'SET_POLL_OPTIONS'; payload: string[] }
  // Event actions
  | { type: 'SET_EVENT_TITLE'; payload: string }
  | { type: 'SET_EVENT_DESCRIPTION'; payload: string }
  | { type: 'SET_EVENT_START_DATE'; payload: string }
  | { type: 'SET_EVENT_END_DATE'; payload: string }
  | { type: 'SET_EVENT_LOCATION_TYPE'; payload: 'presencial' | 'virtual' | 'híbrido' }
  | { type: 'SET_EVENT_LOCATION'; payload: string }
  | { type: 'SET_EVENT_MEETING_LINK'; payload: string }
  | { type: 'SET_EVENT_CATEGORY'; payload: 'conference' | 'seminar' | 'workshop' | 'hackathon' | 'webinar' | 'networking' | 'career_fair' }
  | { type: 'SET_EVENT_MAX_ATTENDEES'; payload: number }
  // Service actions
  | { type: 'SET_SERVICE_CATEGORY'; payload: string };

export const initialModalState: ModalState = {
  content: '',
  selectedFiles: [],
  filePreviews: [],
  selectedPostType: null,
  visibility: 'public',
  showPostTypeMenu: false,
  showTemplateSelector: false,
  showMusicSelector: false,
  showAudioEditor: false,
  selectedAudioTrack: null,
  selectedAudioData: null,
  institutionName: '',
  otherInstitutionName: '',
  selectedTemplate: null,
  showRestoreDraft: false,
  autosaveData: null,
  hasCheckedForDraft: false,
  isPublishingInternal: false,
  pullDistance: 0,
  isPullRefreshing: false,
  newPostsCount: 0,
  
  // Idea fields
  ideaTitle: '',
  ideaDescription: '',
  ideaTechnologies: [],
  ideaTechInput: '',
  ideaTags: [],
  ideaTagInput: '',
  ideaGithubUrl: '',
  ideaDemoUrl: '',
  
  // Project fields
  projectTitle: '',
  projectDescription: '',
  projectStatus: 'in_progress',
  projectTechnologies: [],
  projectHashtags: [],
  projectObjectives: '',
  projectTeamMembers: [],
  projectGithubUrl: '',
  projectDemoUrl: '',
  techInput: '',
  hashtagInput: '',
  teamMemberInput: '',
  
  // Poll fields
  pollQuestion: '',
  pollOptions: ['', ''],
  
  // Event fields
  eventTitle: '',
  eventDescription: '',
  eventStartDate: '',
  eventEndDate: '',
  eventLocationType: 'presencial',
  eventLocation: '',
  eventMeetingLink: '',
  eventCategory: 'conference',
  eventMaxAttendees: 100,
  
  // Service fields
  serviceCategory: '',
};

export function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'SET_CONTENT':
      return { ...state, content: action.payload };
    case 'SET_SELECTED_FILES':
      return { ...state, selectedFiles: action.payload };
    case 'SET_FILE_PREVIEWS':
      return { ...state, filePreviews: action.payload };
    case 'SET_POST_TYPE':
      return { ...state, selectedPostType: action.payload };
    case 'SET_VISIBILITY':
      return { ...state, visibility: action.payload };
    case 'TOGGLE_POST_TYPE_MENU':
      return { ...state, showPostTypeMenu: !state.showPostTypeMenu };
    case 'TOGGLE_TEMPLATE_SELECTOR':
      return { ...state, showTemplateSelector: !state.showTemplateSelector };
    case 'TOGGLE_MUSIC_SELECTOR':
      return { ...state, showMusicSelector: !state.showMusicSelector };
    case 'TOGGLE_AUDIO_EDITOR':
      return { ...state, showAudioEditor: !state.showAudioEditor };
    case 'SET_AUDIO_TRACK':
      return { ...state, selectedAudioTrack: action.payload };
    case 'SET_AUDIO_DATA':
      return { ...state, selectedAudioData: action.payload };
    case 'SET_INSTITUTION_NAME':
      return { ...state, institutionName: action.payload };
    case 'SET_OTHER_INSTITUTION_NAME':
      return { ...state, otherInstitutionName: action.payload };
    case 'SET_TEMPLATE':
      return { ...state, selectedTemplate: action.payload };
    case 'TOGGLE_RESTORE_DRAFT':
      return { ...state, showRestoreDraft: !state.showRestoreDraft };
    case 'SET_AUTOSAVE_DATA':
      return { ...state, autosaveData: action.payload };
    case 'SET_CHECKED_DRAFT':
      return { ...state, hasCheckedForDraft: action.payload };
    case 'SET_PUBLISHING':
      return { ...state, isPublishingInternal: action.payload };
    case 'SET_PULL_DISTANCE':
      return { ...state, pullDistance: action.payload };
    case 'SET_PULL_REFRESHING':
      return { ...state, isPullRefreshing: action.payload };
    case 'SET_NEW_POSTS_COUNT':
      return { ...state, newPostsCount: action.payload };
    
    // Idea actions
    case 'SET_IDEA_TITLE':
      return { ...state, ideaTitle: action.payload };
    case 'SET_IDEA_DESCRIPTION':
      return { ...state, ideaDescription: action.payload };
    case 'SET_IDEA_TECHNOLOGIES':
      return { ...state, ideaTechnologies: action.payload };
    case 'SET_IDEA_TECH_INPUT':
      return { ...state, ideaTechInput: action.payload };
    case 'SET_IDEA_TAGS':
      return { ...state, ideaTags: action.payload };
    case 'SET_IDEA_TAG_INPUT':
      return { ...state, ideaTagInput: action.payload };
    case 'SET_IDEA_GITHUB_URL':
      return { ...state, ideaGithubUrl: action.payload };
    case 'SET_IDEA_DEMO_URL':
      return { ...state, ideaDemoUrl: action.payload };
    
    // Project actions
    case 'SET_PROJECT_TITLE':
      return { ...state, projectTitle: action.payload };
    case 'SET_PROJECT_DESCRIPTION':
      return { ...state, projectDescription: action.payload };
    case 'SET_PROJECT_STATUS':
      return { ...state, projectStatus: action.payload };
    case 'SET_PROJECT_TECHNOLOGIES':
      return { ...state, projectTechnologies: action.payload };
    case 'SET_PROJECT_HASHTAGS':
      return { ...state, projectHashtags: action.payload };
    case 'SET_PROJECT_OBJECTIVES':
      return { ...state, projectObjectives: action.payload };
    case 'SET_PROJECT_TEAM_MEMBERS':
      return { ...state, projectTeamMembers: action.payload };
    case 'SET_PROJECT_GITHUB_URL':
      return { ...state, projectGithubUrl: action.payload };
    case 'SET_PROJECT_DEMO_URL':
      return { ...state, projectDemoUrl: action.payload };
    case 'SET_TECH_INPUT':
      return { ...state, techInput: action.payload };
    case 'SET_HASHTAG_INPUT':
      return { ...state, hashtagInput: action.payload };
    case 'SET_TEAM_MEMBER_INPUT':
      return { ...state, teamMemberInput: action.payload };
    
    // Poll actions
    case 'SET_POLL_QUESTION':
      return { ...state, pollQuestion: action.payload };
    case 'SET_POLL_OPTIONS':
      return { ...state, pollOptions: action.payload };
    
    // Event actions
    case 'SET_EVENT_TITLE':
      return { ...state, eventTitle: action.payload };
    case 'SET_EVENT_DESCRIPTION':
      return { ...state, eventDescription: action.payload };
    case 'SET_EVENT_START_DATE':
      return { ...state, eventStartDate: action.payload };
    case 'SET_EVENT_END_DATE':
      return { ...state, eventEndDate: action.payload };
    case 'SET_EVENT_LOCATION_TYPE':
      return { ...state, eventLocationType: action.payload };
    case 'SET_EVENT_LOCATION':
      return { ...state, eventLocation: action.payload };
    case 'SET_EVENT_MEETING_LINK':
      return { ...state, eventMeetingLink: action.payload };
    case 'SET_EVENT_CATEGORY':
      return { ...state, eventCategory: action.payload };
    case 'SET_EVENT_MAX_ATTENDEES':
      return { ...state, eventMaxAttendees: action.payload };
    
    // Service actions
    case 'SET_SERVICE_CATEGORY':
      return { ...state, serviceCategory: action.payload };
    
    case 'RESET_FORM':
      return initialModalState;
    
    default:
      return state;
  }
}
