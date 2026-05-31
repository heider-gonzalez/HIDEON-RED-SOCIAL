
import type { Post } from "@/types/post";
import type { PostWithProfile } from "./type-helpers";

export function transformPostsData(posts: PostWithProfile[]): Post[] {
  return posts.map(transformPostData);
}

export function transformPostData(post: PostWithProfile): Post {
  const academicEventRow = Array.isArray(post?.academic_events)
    ? post.academic_events[0]
    : (post?.academic_events ?? null);

  const sharedPostRow = Array.isArray(post?.shared_post)
    ? post.shared_post[0]
    : (post?.shared_post ?? null);

  // Transform post data into the expected format
  return {
    id: post.id,
    content: post.content,
    created_at: post.created_at,
    updated_at: post.updated_at,
    user_id: post.user_id,
    profiles: post.profiles,
    is_demo: post.is_demo,
    demo_category: post.demo_category,
    demo_source: post.demo_source,
    demo_readonly: post.demo_readonly,
    media_url: post.media_url,
    media_urls: post.media_urls,
    media_type: post.media_type,
    audio_url: post.audio_url,
    audio_metadata: post.audio_metadata,
    reactions: post.reactions || [],
    poll: post.poll,
    idea: post.idea,
    post_type: post.post_type,
    post_metadata: post.post_metadata,
    project_showcases: post.project_showcases,
    event: academicEventRow ? {
      id: academicEventRow.id,
      title: academicEventRow.title,
      description: academicEventRow.description,
      start_date: academicEventRow.start_date,
      end_date: academicEventRow.end_date,
      location: academicEventRow.location,
      location_type: academicEventRow.is_virtual ? 'virtual' : 'presencial',
      max_attendees: academicEventRow.max_attendees,
      category: academicEventRow.event_type,
      registration_required: academicEventRow.registration_required,
      registration_deadline: academicEventRow.registration_deadline,
      contact_info: academicEventRow.organizer_contact,
      banner_url: academicEventRow.banner_url,
      organizer_id: post.user_id
    } : undefined,
    comments_count: post.comments?.[0]?.count || 0,
    shares_count: post.post_shares?.[0]?.count || 0,
    views_count: post.views_count || 0,
    shared_post_id: post.shared_post_id,
    shared_from: post.shared_from,
    visibility: post.visibility,
    is_pinned: post.is_pinned,
    // If there's a shared post, transform it too
    shared_post: sharedPostRow ? transformPostData(sharedPostRow as PostWithProfile) : undefined
  };
}

export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
