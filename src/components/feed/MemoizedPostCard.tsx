import { memo } from 'react';
import { PostCard } from './PostCard';
import type { Post } from './PostFeed';

interface MemoizedPostCardProps {
  post: Post;
  key?: string;
}

/**
 * Versión memoizada de PostCard para evitar re-renders innecesarios
 * Solo se re-renderiza si el post o sus propiedades críticas cambian
 */
export const MemoizedPostCard = memo(({ post, key }: MemoizedPostCardProps) => {
  return <PostCard post={post} />;
}, (prevProps, nextProps) => {
  // Custom comparison function para evitar re-renders innecesarios
  
  // Si el ID del post es diferente, definitivamente re-renderizar
  if (prevProps.post.id !== nextProps.post.id) {
    return false;
  }
  
  // Si el contenido del post cambió, re-renderizar
  if (prevProps.post.content !== nextProps.post.content) {
    return false;
  }
  
  // Si la URL de media cambió, re-renderizar
  if (prevProps.post.media_url !== nextProps.post.media_url) {
    return false;
  }
  
  // Si el conteo de reacciones cambió significativamente, re-renderizar
  if (Math.abs(prevProps.post.reactions_count - nextProps.post.reactions_count) > 0) {
    return false;
  }
  
  // Si el conteo de comentarios cambió significativamente, re-renderizar
  if (Math.abs(prevProps.post.comments_count - nextProps.post.comments_count) > 0) {
    return false;
  }
  
  // Si el usuario reaccionó diferente, re-renderizar
  if (prevProps.post.userHasReacted !== nextProps.post.userHasReacted) {
    return false;
  }
  
  // Si el perfil del autor cambió, re-renderizar
  if (prevProps.post.profiles?.username !== nextProps.post.profiles?.username) {
    return false;
  }
  
  if (prevProps.post.profiles?.avatar_url !== nextProps.post.profiles?.avatar_url) {
    return false;
  }
  
  // Si no hay cambios importantes, no re-renderizar
  return true;
});

MemoizedPostCard.displayName = 'MemoizedPostCard';