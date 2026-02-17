export interface Project {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  objectives?: string;
  status: 'planning' | 'development' | 'active' | 'completed';
  category: string;
  technologies: string[];
  tags: string[];
  image_url?: string;
  media_urls?: string[];
  github_url?: string;
  demo_url?: string;
  documentation_url?: string;
  is_open_source: boolean;
  seeking_collaborators: boolean;
  is_academic?: boolean;
  author_id: string;
  author?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  team_members: string[];
  contact_email: string;
  phone_number?: string;
  linkedin_url?: string;
  personal_website?: string;
  challenges?: string;
  achievements?: string;
  additional_links: AdditionalLink[];
  professor?: string;
  duration?: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  user_reaction?: string | null;
  reactions?: any[]; 
  created_at: string;
  updated_at: string;
}

export interface AdditionalLink {
  title: string;
  url: string;
}

export interface ProjectFormData {
  // Step 1: Basic Info
  title: string;
  description: string;
  objectives: string;
  category: string;
  professor: string;
  duration: string;
  is_academic: boolean;
  
  // Step 2: Technical Details
  technologies: string[];
  tags: string[];
  status: 'planning' | 'development' | 'active' | 'completed';
  github_url: string;
  documentation_url: string;
  demo_url: string;
  is_open_source: boolean;
  seeking_collaborators: boolean;
  
  // Step 3: Contact Info
  contact_email: string;
  phone_number: string;
  linkedin_url: string;
  personal_website: string;
  
  // Step 4: Additional Info
  team_members: string[];
  challenges: string;
  achievements: string;
  image_url: string;
  additional_links: AdditionalLink[];
}

export const PROJECT_CATEGORIES = [
  'Desarrollo Web',
  'Aplicaciones Móviles',
  'Inteligencia Artificial',
  'Machine Learning',
  'Ciencia de Datos',
  'DevOps',
  'Blockchain',
  'IoT',
  'Realidad Virtual/Aumentada',
  'Videojuegos',
  'Sistemas Embebidos',
  'Ciberseguridad',
  'Investigación',
  'Otro'
] as const;

export const PROJECT_STATUS_CONFIG = {
  planning: {
    label: 'Planificación',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500'
  },
  development: {
    label: 'En desarrollo',
    color: 'bg-blue-500',
    textColor: 'text-blue-500'
  },
  active: {
    label: 'Activo',
    color: 'bg-green-500',
    textColor: 'text-green-500'
  },
  completed: {
    label: 'Completado',
    color: 'bg-gray-500',
    textColor: 'text-gray-500'
  }
} as const;

export const POPULAR_TECHNOLOGIES = [
  'React',
  'Node.js',
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'Spring Boot',
  'Django',
  'Flask',
  'Vue.js',
  'Angular',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Firebase',
  'AWS',
  'Docker',
  'Kubernetes',
  'TensorFlow',
  'PyTorch',
  'Flutter',
  'React Native',
  'Swift',
  'Kotlin',
  'C++',
  'C#',
  '.NET',
  'PHP',
  'Laravel',
  'Ruby on Rails'
] as const;