import { Card } from "@/components/ui/card";
import { Comments } from "@/components/post/Comments";
import { ActionsButtons } from "@/components/post/actions/ActionsButtons";
import { PostContent } from "@/components/post/PostContent";
import { PostHeader } from "@/components/post/PostHeader";
import { type Post as PostType } from "@/types/post";
import { SharedPostContent } from "./post/SharedPostContent";
import { usePost } from "@/hooks/use-post";
import { PostWrapper } from "./post/PostWrapper";
import { useState, useEffect } from "react";
import { IdeaContent } from "./post/IdeaContent";
import { ProjectContent } from "./post/ProjectContent";
import { ProyectoPostContent } from "./post/ProyectoPostContent";
import { PostOptionsMenu } from "./post/actions/PostOptionsMenu";
import { EventCard } from "./events/EventCard";
import { EventDetailModal } from "./events/EventDetailModal";
import { ShareModal } from "./post/actions/ShareModal";
import { SendPostModal } from "./post/actions/SendPostModal";
import { usePostReactions } from "@/hooks/posts/use-post-reactions";
import { PostActivitySummary } from "./post/PostActivitySummary";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useNavigate } from "react-router-dom";

interface PostProps {
  post: PostType;
  hideComments?: boolean;
  isHidden?: boolean;
  initialShowComments?: boolean;
}

function ProyectoPostView({ post }: { post: PostType }) {
  const proyecto = (post as any)?.post_metadata?.proyecto;
  if (!proyecto) {
    return (
      <div className="px-0 md:px-4 pb-2">
        <PostContent post={post} postId={post.id} />
      </div>
    );
  }

  return (
    <div className="px-0 md:px-4 pb-2">
      <PostContent post={post} postId={post.id} />
      <ProyectoPostContent profileId={post.user_id} proyecto={proyecto} />
    </div>
  );
}

export function Post({ post, hideComments = false, isHidden = false, initialShowComments = false }: PostProps) {
  // Verificación de seguridad si el post es inválido
  if (!post || !post.id) {
    console.error("Invalid post object:", post);
    return null;
  }

  return <PostInner post={post} hideComments={hideComments} isHidden={isHidden} initialShowComments={initialShowComments} />;
}

function PostInner({ post, hideComments = false, isHidden = false, initialShowComments = false }: PostProps) {
  // Detectar si es un post de demostración (no permite interacciones)
  const isDemoPost = !!post.is_demo || !!post.demo_readonly;

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [resolvedSharedPost, setResolvedSharedPost] = useState<PostType | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isCancelled = false;
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isCancelled) setIsAuthenticated(!!session?.user);
      } catch {
        if (!isCancelled) setIsAuthenticated(false);
      }
    };
    void checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isCancelled) setIsAuthenticated(!!session?.user);
    });
    return () => {
      isCancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showDemoCta = () => {
    toast({
      title: "Contenido automatizado",
      description: "Regístrate para interactuar.",
      action: (
        <ToastAction altText="Regístrate" onClick={() => navigate('/auth')}>
          Regístrate
        </ToastAction>
      ),
    });
  };

  // Hook para manejar reacciones del usuario
  const { userReaction, onReaction } = usePostReactions(post.id);

  // Resumen de reacciones (para contadores)
  const reactionsByType: Record<string, number> = {};
  
  // Priorizar el formato canonical del API (reactions_by_type)
  const postAny = post as any;
  const reactionsByTypeAny = postAny?.reactions_by_type as unknown;
  if (reactionsByTypeAny && typeof reactionsByTypeAny === 'object') {
    Object.assign(reactionsByType, reactionsByTypeAny as Record<string, number>);
  } else if (Array.isArray(post.reactions)) {
    post.reactions.forEach((reaction: any) => {
      const type = reaction.reaction_type || reaction.type || "love";
      reactionsByType[type] = (reactionsByType[type] || 0) + 1;
    });
  } else if ((post.reactions as any)?.by_type) {
    Object.assign(reactionsByType, (post.reactions as any).by_type);
  }

  if (Object.keys(reactionsByType).length === 0 && (post.reactions_count || 0) > 0) {
    reactionsByType.love = post.reactions_count || 0;
  }
  const sharesCount = post.shares_count || 0;

  // Estados para modales
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const {
    showComments,
    comments,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
    newComment,
    commentImage,
    setCommentImage,
    replyTo,
    isCurrentUserAuthor,
    canDeletePost,
    onDeletePost,
    toggleComments,
    handleCommentReaction,
    handleReply,
    handleSubmitComment,
    handleCancelReply,
    handleDeleteComment,
    setNewComment,
    isSubmitting
  } = usePost(post, hideComments, initialShowComments);

  // Determinar si esta es una publicación compartida
  const isSharedPost = !!post.shared_post;
  // Determinar si esta es una publicación de idea
  const isIdeaPost = !!post.idea && post.post_type !== 'project';
  // Determinar si es un evento
  const isEventPost = post.post_type === 'academic_event';
  // Determinar si es un proyecto
  const isProjectPost = post.post_type === 'project';
  const isProyectoPost = post.post_type === 'proyecto';
  // Determinar si la publicación está fijada
  const isPinned = post.is_pinned;

  const shouldBlockInteractions = isDemoPost && !isAuthenticated;

  const onCommentsClick = toggleComments;
  const onShareClick = shouldBlockInteractions ? showDemoCta : () => setShowShareModal(true);
  const onReactionClick = shouldBlockInteractions ? () => showDemoCta() : onReaction;

  useEffect(() => {
    const loadSharedPost = async () => {
      try {
        if (!post.shared_post_id) {
          setResolvedSharedPost(null);
          return;
        }

        if (post.shared_post) {
          setResolvedSharedPost(post.shared_post as any);
          return;
        }

        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:profiles(*),
            comments:comments(count),
            post_shares:post_shares(count),
            reactions:reactions(reaction_type, user_id),
            academic_events:academic_events(*)
          `)
          .eq('id', post.shared_post_id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setResolvedSharedPost(null);
          return;
        }

        setResolvedSharedPost(data as any);
      } catch (e) {
        console.error('Error loading shared_post:', e);
        setResolvedSharedPost(null);
      }
    };

    void loadSharedPost();
  }, [post.shared_post_id, post.shared_post]);

  return (
    <PostWrapper isHidden={isHidden} isIdeaPost={isIdeaPost} isPinned={isPinned}>
      <PostHeader 
        post={post} 
        onDelete={shouldBlockInteractions ? undefined : (canDeletePost ? onDeletePost : undefined)}
        isAuthor={shouldBlockInteractions ? false : isCurrentUserAuthor}
        canDelete={shouldBlockInteractions ? false : canDeletePost}
        isHidden={isHidden}
        content={post.content || ""}
        isIdeaPost={isIdeaPost}
        isDemoPost={isDemoPost}
      />
      
      {isSharedPost ? (
        <SharedPostView post={post} resolvedSharedPost={resolvedSharedPost} />
      ) : isIdeaPost ? (
        <IdeaPostView post={post} />
      ) : isEventPost ? (
        <EventPostView post={post} />
      ) : isProjectPost ? (
        <ProjectPostView post={post} />
      ) : isProyectoPost ? (
        <ProyectoPostView post={post} />
      ) : (
        <StandardPostView post={post} />
      )}
      
      {/* Contadores de reacciones / comentarios / compartidos */}
      <PostActivitySummary
        post={post}
        reactionsByType={reactionsByType}
        commentsCount={post.comments_count || 0}
        sharesCount={sharesCount}
        onCommentsClick={onCommentsClick}
      />

      {/* Botones: reaccionar, comentar, compartir, enviar */}
      <ActionsButtons 
        post={post}
        postId={post.id}
        userReaction={userReaction}
        onReaction={onReactionClick}
        onComment={onCommentsClick}
        onShare={onShareClick}
        commentsExpanded={showComments}
      />
      
      {!hideComments && showComments && (
        <Comments 
          postId={post.id}
          comments={comments}
          onReaction={handleCommentReaction}
          onReply={handleReply}
          onSubmitComment={handleSubmitComment}
          onDeleteComment={handleDeleteComment}
          newComment={newComment}
          onNewCommentChange={setNewComment}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
          showComments={showComments}
          commentImage={commentImage}
          setCommentImage={setCommentImage}
          postAuthorId={post.user_id}
          totalCommentsCount={(post as any).comments_count ?? (post as any).comments?.count}
          isSubmitting={isSubmitting}
          loadMoreRef={loadMoreRef}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        />
      )}

      {/* Share Modal */}
      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        post={post} 
        onSend={() => {
          setShowShareModal(false);
          setShowSendModal(true);
        }}
      />

      {/* Send Modal */}
      <SendPostModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        post={post}
      />
    </PostWrapper>
  );
}

// Componente de ayuda para la vista de publicación compartida
function SharedPostView({ post, resolvedSharedPost }: { post: PostType; resolvedSharedPost: PostType | null }) {
  return (
    <div className="px-0 md:px-4 pb-4">
      {post.content && (
        <p className="text-sm whitespace-pre-wrap break-words mb-4 px-4 md:px-0">{post.content}</p>
      )}
      <div className="border border-border rounded-none md:rounded-lg overflow-hidden">
        {(resolvedSharedPost || post.shared_post) && (
          <SharedPostContent post={(resolvedSharedPost || post.shared_post) as any} />
        )}
      </div>
    </div>
  );
}

// Componente para las publicaciones de tipo Evento
function EventPostView({ post }: { post: PostType }) {
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [event, setEvent] = useState<PostType["event"] | null>(post.event ?? null);
  const [loadingEvent, setLoadingEvent] = useState(false);

  useEffect(() => {
    const loadEvent = async () => {
      if (event) return;
      if (post.post_type !== 'academic_event') return;
      setLoadingEvent(true);
      try {
        const { data, error } = await (supabase as any)
          .from('academic_events')
          .select('id, title, description, start_date, end_date, location, is_virtual, max_attendees, event_type, registration_required, registration_deadline, organizer_contact, banner_url')
          .eq('post_id', post.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setEvent(null);
          return;
        }

        setEvent({
          id: data.id,
          title: data.title,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date,
          location: data.location || 'Por definir',
          location_type: data.is_virtual ? 'virtual' : 'presencial',
          max_attendees: data.max_attendees,
          category: data.event_type,
          registration_required: data.registration_required,
          registration_deadline: data.registration_deadline,
          contact_info: data.organizer_contact,
          banner_url: data.banner_url,
          organizer_id: post.user_id,
        });
      } catch {
        setEvent(null);
      } finally {
        setLoadingEvent(false);
      }
    };

    void loadEvent();
  }, [event, post.id, post.post_type, post.user_id]);
  
  return (
    <div className="px-0 md:px-4 pb-2">
      {post.content && (
        <p className="text-sm whitespace-pre-wrap break-words mb-4 px-4 md:px-0">{post.content}</p>
      )}

      {event ? (
        <EventCard
          title={event.title}
          subtitle={post.profiles?.username || 'Organizador'}
          description={event.description}
          startDate={event.start_date}
          endDate={event.end_date}
          location={event.location}
          isVirtual={event.location_type === 'virtual'}
          maxAttendees={event.max_attendees}
          currentAttendees={0}
          category={event.category}
          gradientColor="gradient-1"
          onClick={() => setShowEventDetail(true)}
        />
      ) : (
        <div className="px-4 md:px-0">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            {loadingEvent ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-40" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No se pudo cargar el evento. Actualiza el feed e inténtalo de nuevo.
              </div>
            )}
          </div>
        </div>
      )}
      
      {showEventDetail && event && (
        <EventDetailModal
          isOpen={showEventDetail}
          onClose={() => setShowEventDetail(false)}
          event={{
            title: event.title,
            subtitle: post.profiles?.username || 'Organizador',
            description: event.description,
            startDate: event.start_date,
            endDate: event.end_date,
            location: event.location,
            isVirtual: event.location_type === 'virtual',
            maxAttendees: event.max_attendees,
            currentAttendees: 0,
            category: event.category,
            organizer: post.profiles?.username || 'Organizador'
          }}
        />
      )}
    </div>
  );
}

// Componente para las publicaciones de tipo Idea
function IdeaPostView({ post }: { post: PostType }) {
  if (!post.idea) return null;
  
  return (
    <div className="px-0 md:px-4 pb-2">
      <PostContent post={post} postId={post.id} />
      <IdeaContent 
        idea={post.idea} 
        postId={post.id}
        postOwnerId={post.user_id}
      />
    </div>
  );
}

// Componente para las publicaciones de tipo Proyecto
function ProjectPostView({ post }: { post: PostType }) {
  // Si no hay idea, mostrar contenido estándar como fallback
  if (!post.idea) {
    console.warn('Post de proyecto sin datos de idea, mostrando fallback', post.id);
    return (
      <div className="px-0 md:px-4 pb-2">
        <PostContent post={post} postId={post.id} />
        <div className="px-0 md:px-4 pb-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="h-5 w-5 text-blue-500" />
              <Badge variant="secondary" className="text-xs font-medium">Proyecto</Badge>
              {post.project_status && (
                <Badge variant="outline" className={
                  post.project_status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  post.project_status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }>
                  {post.project_status === 'completed' ? 'Terminado' : 
                   post.project_status === 'in_progress' ? 'En desarrollo' : 'Idea'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Este proyecto necesita ser actualizado con información completa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const normalizedProjectStatus =
    post.project_status === 'paused' || post.project_status === 'cancelled'
      ? 'in_progress'
      : post.project_status;
  
  return (
    <div className="px-0 md:px-4 pb-2">
      <PostContent post={post} postId={post.id} />
      <ProjectContent 
        idea={post.idea} 
        postId={post.id}
        postOwnerId={post.user_id}
        projectStatus={normalizedProjectStatus as any}
        technologies={post.technologies}
        demoUrl={post.demo_url}
      />
    </div>
  );
}

// Componente de ayuda para la vista de publicación estándar
function StandardPostView({ post }: { post: PostType }) {
  return (
    <>
      <PostContent 
        post={post} 
        postId={post.id}
      />
      
      {post.shared_post && (
        <div className="px-0 md:px-4 pb-4 mt-2">
          <div className="border border-border rounded-none md:rounded-lg overflow-hidden">
            <SharedPostContent post={post.shared_post} />
          </div>
        </div>
      )}
    </>
  );
}
