import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/types/project';

type FetchProjectsParams = {
  selectedStatus: string;
  institutionName: string;
};

export async function fetchProjectPosts({ selectedStatus, institutionName }: FetchProjectsParams) {
  let projectsQuery = supabase
    .from('posts')
    .select(
      `
          id,
          user_id,
          created_at,
          updated_at,
          content,
          post_type,
          project_status,
          media_url,
          media_urls,
          idea,
          post_metadata,
          project_showcases,
          video_url,
          profiles!posts_user_id_fkey (
            id,
            username,
            avatar_url,
            institution_name
          )
        `
    )
    .eq('post_type', 'proyecto')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(50);

  if (selectedStatus !== 'all') {
    projectsQuery = projectsQuery.eq('project_status', selectedStatus);
  }

  if (institutionName) {
    projectsQuery = projectsQuery.eq('profiles.institution_name', institutionName);
  }

  const result = await projectsQuery;
  if (result.error) throw result.error;

  const posts = result.data || [];
  
  // Simplified: return posts without extra queries for reactions/comments/views
  // These can be loaded on-demand or via separate hooks
  return posts.map((post: any) => ({
    ...post,
    reactions: [],
    comments_count: 0,
    views_count: 0,
  }));
}

function extractUrlsFromText(text: unknown) {
  const raw = String(text || '');
  const matches = raw.match(/https?:\/\/[^\s)\]]+/gim) || [];
  const uniq = Array.from(new Set(matches.map((m) => m.trim())));
  const github = uniq.find((u) => /github\.com\//i.test(u)) || '';
  const demo = uniq.find((u) => u !== github) || '';
  return { github, demo };
}

function normalizeUrl(value: unknown) {
  return String(value || '').trim();
}

export function mapProjectPostsToProjects(projectPosts: any[], currentUserId?: string | null): Project[] {
  if (!projectPosts || projectPosts.length === 0) return [];

  return projectPosts.map((post: any) => {
    const idea = post.idea || {};
    const proyectoMeta = (post as any)?.post_metadata?.proyecto || {};

    const userReaction =
      post.reactions?.find((reaction: any) => reaction.user_id === currentUserId)?.reaction_type || null;

    const reactionCount = post.reactions?.length || 0;

    const projectShowcase = post.project_showcases && post.project_showcases[0];
    const parsedFromContent = extractUrlsFromText(post?.content);
    const parsedFromContact = extractUrlsFromText(
      normalizeUrl(proyectoMeta?.contact_link) || normalizeUrl((idea as any)?.contact_link)
    );

    const videoUrl =
      projectShowcase?.video_url ||
      post.video_url ||
      normalizeUrl(proyectoMeta?.demo_url) ||
      parsedFromContact.demo ||
      parsedFromContent.demo;

    const demoUrl =
      normalizeUrl(projectShowcase?.demo_url) ||
      normalizeUrl(idea?.demo_url) ||
      normalizeUrl(proyectoMeta?.demo_url) ||
      parsedFromContact.demo ||
      parsedFromContent.demo ||
      '';

    const githubUrl =
      normalizeUrl(projectShowcase?.github_url) ||
      normalizeUrl((idea as any)?.github_url) ||
      normalizeUrl(proyectoMeta?.github_url) ||
      parsedFromContact.github ||
      parsedFromContent.github ||
      '';

    return {
      id: post.id,
      title: idea.title || 'Sin título',
      description: idea.description || post.content || '',
      short_description: idea.description?.substring(0, 150) || '',
      objectives: idea.expected_impact || '',
      status:
        post.project_status === 'in_progress'
          ? 'development'
          : post.project_status === 'completed'
            ? 'completed'
            : 'planning',
      category: idea.category || 'Otro',
      technologies: idea.resources_needed || [],
      tags: [],
      is_open_source: false,
      seeking_collaborators: post.project_status === 'in_progress',
      author_id: post.user_id,
      author: post.profiles
        ? {
            id: post.profiles.id,
            username: post.profiles.username || 'Usuario',
            avatar_url: post.profiles.avatar_url,
          }
        : undefined,
      team_members: [],
      contact_email: '',
      additional_links: [],
      likes_count: reactionCount,
      comments_count: post.comments_count || 0,
      views_count: post.views_count || 0,
      image_url: post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : undefined,
      media_urls: post.media_urls || [],
      video_url: videoUrl,
      demo_url: demoUrl || undefined,
      github_url: githubUrl || undefined,
      created_at: post.created_at,
      updated_at: post.updated_at,
      user_reaction: userReaction,
      reactions: post.reactions || [],
    };
  });
}

type FilterProjectsParams = {
  projects: Project[];
  searchQuery: string;
  selectedCategory: string;
};

export function filterProjects({ projects, searchQuery, selectedCategory }: FilterProjectsParams): Project[] {
  const q = searchQuery.toLowerCase();
  return (projects || []).filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(q) ||
      project.description.toLowerCase().includes(q) ||
      project.technologies.some((tech) => tech.toLowerCase().includes(q));

    const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });
}
