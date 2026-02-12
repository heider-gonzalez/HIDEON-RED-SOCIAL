export interface Post {
  id: string;
  content?: string | null;
  user_id: string;
  author_id?: string; // Add author_id as optional since some code uses it
  group_id?: string | null;
  group?: {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string | null;
  } | null;
  company_id?: string | null;
  company?: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
  } | null;
  media_url?: string | null;
  media_urls?: string[] | null; // Array de URLs para múltiples archivos
  media_type?: string | null;
  audio_url?: string | null; // 🎵 Audio file URL for background music
  audio_metadata?: {
    name: string;
    duration: number; // in seconds
    size: number; // in bytes
    type: string; // audio/mp3, audio/wav, etc.
  } | null; // 🎵 Audio metadata for Instagram-style music posts
  service_category?: string | null;
  visibility: 'public' | 'friends' | 'private' | 'incognito';
  created_at: string;
  updated_at: string;
  shared_post_id?: string | null;
  shared_from?: string | null;
  shared_post?: Post | null;
  profiles?: {
    username?: string;
    avatar_url?: string;
    id?: string;
    career?: string | null;
  } | null;
  poll?: Poll | null;
  idea?: Idea | null;
  marketplace?: Marketplace | null;
  event?: Event | null;
  post_type?: string | null;
  post_metadata?: any;
  is_pinned?: boolean | null;
  reactions?: ReactionSummary | any[]; // Allow both formats for flexibility
  reactions_count?: number;
  user_reaction?: string | null;
  comments_count?: number;
  shares_count?: number; // Count of times shared
  userHasReacted?: boolean; // Add missing property
  content_style?: ContentStyle | null; // Add content style for background/text formatting
  project_status?:
    | 'idea'
    | 'in_progress'
    | 'completed'
    | 'paused'
    | 'cancelled'
    | 'Idea'
    | 'En desarrollo'
    | 'Completado'
    | 'Pausado'
    | 'Cancelado'
    | null; // Ideas → Projects flow
  technologies?: string[] | null; // Technologies used in the project
  demo_url?: string | null;

  is_demo?: boolean;
  demo_category?: string | null;
  demo_source?: string | null;
  demo_readonly?: boolean;
}

export interface ContentStyle {
  backgroundKey: string;
  textColor: string;
  isTextOnly: boolean;
}

export interface ReactionSummary {
  count: number;
  by_type: Record<string, number>;
}

export interface Poll {
  question: string;
  options: Array<PollOption>;
  total_votes: number;
  user_vote: string | null;
}

export interface PollOption {
  id: string;
  content: string;
  text?: string; // Add text property for compatibility
  votes: number;
}

export interface Idea {
  id?: string;
  title: string;
  description: string;
  user_id?: string;
  participants: Array<IdeaParticipant>;
  needed_roles?: Array<NeededRole>;
  project_phase?: 'ideation' | 'planning' | 'execution' | 'launch' | 'scaling';
  category?: string;
  estimated_duration?: string;
  expected_impact?: string;
  resources_needed?: Array<string>;
  demo_url?: string | null;
  collaboration_type?: 'remote' | 'hybrid' | 'in-person';
  location_preference?: string;
  contact_link?: string; // WhatsApp, Telegram, or other contact link
}

export interface NeededRole {
  title: string;
  description: string;
  skills_desired?: Array<string>;
  commitment_level: 'low' | 'medium' | 'high';
  is_filled?: boolean;
}

export interface IdeaParticipant {
  user_id: string;
  profession: string;
  joined_at: string;
  username?: string;
  avatar_url?: string;
  career?: string;
}

export interface Marketplace {
  id?: string;
  title: string;
  description: string;
  subject: string;
  price: number;
  document_preview_url?: string;
  document_full_url?: string;
  contact_info?: string;
  seller_id?: string;
}

export interface Event {
  id?: string;
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  location: string;
  location_type: 'presencial' | 'virtual' | 'híbrido';
  max_attendees?: number;
  category: 'conference' | 'seminar' | 'workshop' | 'hackathon' | 'webinar' | 'networking' | 'career_fair';
  banner_url?: string;
  organizer_id?: string;
  registration_required?: boolean;
  registration_deadline?: string;
  contact_info?: string;
}

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  post_id: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  media_url?: string | null;
  media_type?: string | null;
  profiles?: {
    username?: string;
    avatar_url?: string;
    id?: string;
  } | null;
  reactions?: any[];
  user_reaction?: string | null;
  likes_count?: number; // Add missing property
  replies?: Comment[]; // Add missing property for nested comments
  reactions_by_type?: Record<string, number>; // Add reactions summary for comments
}

export interface CreatePostData {
  content?: string;
  media_url?: string;
  media_type?: string;
  visibility?: 'public' | 'friends' | 'private' | 'incognito';
  poll?: Poll;
  idea?: Idea;
}
