/**
 * Type-safe helpers to reduce `as any` usage throughout the codebase
 */

export interface PostWithProfile {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  comments?: Array<{ count: number }>;
  reactions?: Array<{
    id: string;
    post_id: string;
    reaction_type: string;
    user_id: string;
  }>;
  media_url?: string | null;
  media_urls?: string[] | null;
  media_type?: string | null;
  audio_url?: string | null;
  audio_metadata?: any;
  post_type?: string | null;
  project_status?: string | null;
  technologies?: string[] | null;
  demo_url?: string | null;
  idea?: any;
  post_metadata?: any;
  visibility?: 'public' | 'friends' | 'private';
  is_pinned?: boolean;
  shared_post_id?: string | null;
  shared_from?: string | null;
  group_id?: string | null;
  company_id?: string | null;
  poll?: any;
}

export interface GroupData {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
}

export interface CompanyData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface ReactionData {
  post_id: string;
  reaction_type: string;
  user_id?: string;
}

export interface SharedPostData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  comments?: Array<{ count: number }>;
  media_urls?: string[] | null;
}

/**
 * Safely extract data from Supabase response with type checking
 */
export function safeExtractData<T>(response: { data: T | null; error: any }): T {
  if (response.error) {
    throw response.error;
  }
  if (!response.data) {
    throw new Error('No data returned from query');
  }
  return response.data;
}

/**
 * Safely extract optional data from Supabase response
 */
export function safeExtractOptionalData<T>(response: { data: T | null; error: any }): T | null {
  if (response.error) {
    throw response.error;
  }
  return response.data;
}

/**
 * Type-safe array filter for IDs
 */
export function filterValidIds(items: Array<{ id?: string | null }>): string[] {
  return items
    .map(item => item.id)
    .filter((id): id is string => id !== null && id !== undefined && id !== '');
}

/**
 * Type-safe string conversion
 */
export function toString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Type-safe number conversion
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}
