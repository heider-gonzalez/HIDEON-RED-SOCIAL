import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { PostOptionsMenu } from "./post/actions/PostOptionsMenu";
import { EventCard } from "./events/EventCard";
import { EventDetailModal } from "./events/EventDetailModal";
import { ShareModal } from "./post/actions/ShareModal";
import { SendPostModal } from "./post/actions/SendPostModal";
import { usePostReactions } from "@/hooks/posts/use-post-reactions";
import { PostActivitySummary } from "./post/PostActivitySummary";
import { supabase } from "@/integrations/supabase/client";
import { MentionsText } from "./post/MentionsText";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useNavigate } from "react-router-dom";
import { Briefcase, CircleAlert, ExternalLink, Github, MessageCircle, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { JoinIdeaButton } from "@/components/post/actions/join-idea/JoinIdeaButton";

interface PostProps {
  post: PostType;
  hideComments?: boolean;
  isHidden?: boolean;
  initialShowComments?: boolean;
}

function normalizeProjectStatusLabel(status: any) {
  const raw = String(status || '').toLowerCase();
  if (raw === 'completed' || raw === 'completado') return 'Terminado';
  if (raw === 'in_progress' || raw === 'en desarrollo' || raw === 'en_desarrollo') return 'En desarrollo';
  if (raw === 'paused' || raw === 'pausado') return 'En desarrollo';
  if (raw === 'cancelled' || raw === 'cancelado') return 'En desarrollo';
  if (raw === 'idea' || raw === 'ideation') return 'Idea';
  return '';
}

function normalizeProjectStatusClass(status: any) {
  const raw = String(status || '').toLowerCase();
  if (raw === 'completed' || raw === 'completado') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (raw === 'in_progress' || raw === 'en desarrollo' || raw === 'en_desarrollo') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  if (raw === 'idea' || raw === 'ideation') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}

function getProjectPreviewData(post: PostType) {
  const ideaAny = (post as any)?.idea;
  const idea = ideaAny && typeof ideaAny === 'object' && !Array.isArray(ideaAny) ? ideaAny : null;
  const proyecto = (post as any)?.post_metadata?.proyecto;

  const title = String(idea?.title || proyecto?.title || '').trim();

  const description = String(
    idea?.description ||
      idea?.expected_impact ||
      post.content ||
      proyecto?.description ||
      ''
  ).trim();

  const rawTechnologies: unknown[] = [
    ...((Array.isArray((post as any)?.technologies) ? (post as any).technologies : []) as unknown[]),
    ...((Array.isArray(proyecto?.stack) ? proyecto.stack : []) as unknown[]),
    ...((Array.isArray(proyecto?.required_skills) ? proyecto.required_skills : []) as unknown[]),
  ];

  const techUniq: string[] = [];
  const seen = new Set<string>();
  for (const t of rawTechnologies) {
    const s = String(t || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    techUniq.push(s);
  }

  const statusLabel = normalizeProjectStatusLabel((post as any)?.project_status || proyecto?.status || idea?.project_phase);
  const statusClass = normalizeProjectStatusClass((post as any)?.project_status || proyecto?.status || idea?.project_phase);

  return {
    title,
    description,
    technologies: techUniq,
    statusLabel,
    statusClass,
  };
}

function extractHashtags(text: string) {
  const raw = String(text || '');
  const matches = raw.match(/#[\p{L}0-9_]+/giu) || [];
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const m of matches) {
    const tag = m.trim();
    const key = tag.toLowerCase();
    if (!tag) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(tag);
    if (uniq.length >= 8) break;
  }
  return uniq;
}

function getProyectoMeta(post: PostType) {
  const proyectoAny = (post as any)?.post_metadata?.proyecto;
  const proyecto = proyectoAny && typeof proyectoAny === 'object' && !Array.isArray(proyectoAny) ? proyectoAny : null;
  return proyecto as any;
}

function normalizeActionUrl(url: any) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  return raw;
}

function splitIdeaSections(description: string) {
  const text = String(description || '').trim();
  const lower = text.toLowerCase();
  const idxProblem = lower.indexOf('problema:');
  const idxForWho = lower.indexOf('para quién:');

  if (idxProblem === -1 && idxForWho === -1) {
    return {
      intro: text,
      problem: '',
      forWho: '',
    };
  }

  const introEnd = Math.min(
    idxProblem === -1 ? Number.POSITIVE_INFINITY : idxProblem,
    idxForWho === -1 ? Number.POSITIVE_INFINITY : idxForWho
  );
  const intro = text.slice(0, introEnd).trim();

  let problem = '';
  let forWho = '';

  if (idxProblem !== -1) {
    const start = idxProblem + 'problema:'.length;
    const end = idxForWho !== -1 && idxForWho > idxProblem ? idxForWho : text.length;
    problem = text.slice(start, end).trim();
  }

  if (idxForWho !== -1) {
    const start = idxForWho + 'para quién:'.length;
    forWho = text.slice(start).trim();
  }

  return { intro, problem, forWho };
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

  // Disparar eventos cuando el usuario interactúa con el post
  useEffect(() => {
    // Evento cuando el post entra en vista
    window.dispatchEvent(new CustomEvent('post:view:start', { detail: { postId: post.id } }));
    
    return () => {
      // Evento cuando el post sale de vista
      window.dispatchEvent(new CustomEvent('post:view:end', { detail: { postId: post.id } }));
    };
  }, [post.id]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [resolvedSharedPost, setResolvedSharedPost] = useState<PostType | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
    handleUpdateComment,
    loadReplies,
    setNewComment,
    isSubmitting
  } = usePost(post, hideComments, initialShowComments);

  // Determinar si esta es una publicación compartida
  const isSharedPost = !!post.shared_post;
  // Determinar si esta es una publicación de idea
  const isIdeaPost = post.post_type === 'idea' || (!!post.idea && post.post_type !== 'project');
  // Determinar si es un evento
  const isEventPost = post.post_type === 'academic_event';
  // Determinar si es un proyecto
  const isProjectPost = post.post_type === 'project';
  const isProyectoPost = post.post_type === 'proyecto';
  const isAnyProjectPost = isProjectPost || isProyectoPost;
  // Combinar idea y project para aplicar degradado
  const shouldShowGradient = isIdeaPost || isAnyProjectPost;
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
    <PostWrapper isHidden={isHidden} isIdeaPost={shouldShowGradient} isPinned={isPinned}>
      <PostHeader 
        post={post} 
        onDelete={shouldBlockInteractions ? undefined : (canDeletePost ? onDeletePost : undefined)}
        isAuthor={shouldBlockInteractions ? false : isCurrentUserAuthor}
        canDelete={shouldBlockInteractions ? false : canDeletePost}
        isHidden={isHidden}
        content={post.content || ""}
        isIdeaPost={isIdeaPost}
        isProjectPost={isAnyProjectPost}
        isDemoPost={isDemoPost}
      />
      
      {isSharedPost ? (
        <SharedPostView post={post} resolvedSharedPost={resolvedSharedPost} />
      ) : isIdeaPost ? (
        <IdeaPostView post={post} />
      ) : isEventPost ? (
        <EventPostView post={post} />
      ) : isAnyProjectPost ? (
        <ProjectPostView post={post} isMobile={isMobile} />
      ) : (
        <StandardPostView post={post} />
      )}
      
      {/* Contadores de reacciones / comentarios / compartidos */}
      <PostActivitySummary
        post={post}
        reactionsByType={reactionsByType}
        commentsCount={post.comments_count || 0}
        sharesCount={sharesCount}
        viewsCount={post.views_count || 0}
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
          onUpdateComment={handleUpdateComment}
          onLoadReplies={loadReplies}
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
        <MentionsText content={post.content} className="text-sm whitespace-pre-wrap break-words mb-4 px-4 md:px-0" />
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
        <MentionsText content={post.content} className="text-sm whitespace-pre-wrap break-words mb-4 px-4 md:px-0" />
      )}

      {event ? (
        <EventCard
          title={event.title}
          subtitle={
            <Link to={`/profile/${post.user_id}`} className="hover:underline">
              {post.profiles?.username || 'Organizador'}
            </Link>
          }
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
            subtitle: (
              <Link to={`/profile/${post.user_id}`} className="hover:underline">
                {post.profiles?.username || 'Organizador'}
              </Link>
            ),
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
  return <CollabInlinePostView post={post} kind="idea" />;
}

// Componente para las publicaciones de tipo Proyecto
function ProjectPostView({ post, isMobile: _isMobile }: { post: PostType; isMobile: boolean }) {
  return <CollabInlinePostView post={post} kind="project" />;
}

function CollabInlinePostView({ post, kind }: { post: PostType; kind: 'idea' | 'project' }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const isIdea = kind === 'idea';
  const preview = isIdea
    ? null
    : getProjectPreviewData(post);

  const ideaAny = (post as any)?.idea;
  const idea = isIdea && ideaAny && typeof ideaAny === 'object' && !Array.isArray(ideaAny) ? ideaAny : null;
  const proyecto = getProyectoMeta(post);

  const title = String(isIdea ? idea?.title || '' : preview?.title || '').trim();
  const rawDescription = String(
    isIdea
      ? (idea?.description || post.content || '')
      : (preview?.description || post.content || '')
  ).trim();

  const { intro, problem, forWho } = splitIdeaSections(rawDescription);

  const badgeClass = isIdea
    ? 'bg-emerald-600 text-white hover:bg-emerald-600'
    : 'bg-blue-600 text-white hover:bg-blue-600';

  const badgeLabel = isIdea ? 'Idea' : 'Proyecto';
  const statusLabel = isIdea ? '' : (preview?.statusLabel || '');
  const statusClass = isIdea ? '' : (preview?.statusClass || '');

  const technologies = isIdea
    ? (Array.isArray(idea?.resources_needed) ? idea.resources_needed : [])
        .map((t: any) => String(t || '').trim())
        .filter(Boolean)
    : (preview?.technologies || []);

  const techToShow = technologies.slice(0, 8);

  const storedIdeaTagsRaw = isIdea ? (post as any)?.post_metadata?.idea_tags : null;
  const storedIdeaTags = isIdea && Array.isArray(storedIdeaTagsRaw)
    ? storedIdeaTagsRaw.map((t: any) => String(t || '').trim()).filter(Boolean)
    : [];
  const extractedTags = extractHashtags(rawDescription);
  const tags = Array.from(
    new Map(
      [...storedIdeaTags, ...extractedTags]
        .map((t) => {
          const v = String(t || '').trim();
          const normalized = v ? (v.startsWith('#') ? v : `#${v}`) : '';
          return [normalized.toLowerCase(), normalized] as const;
        })
        .filter(([, v]) => Boolean(v))
    ).values(),
  ).slice(0, 12);

  const proyectoImpact = String(proyecto?.impact || '').trim();
  const proyectoObjectivesRaw = (proyecto as any)?.objectives ?? (proyecto as any)?.objetivos ?? (proyecto as any)?.goals;
  const proyectoBenefitsRaw = (proyecto as any)?.benefits ?? (proyecto as any)?.beneficios;

  const normalizeList = (v: any) => {
    if (Array.isArray(v)) return v.map((x) => String(x || '').trim()).filter(Boolean);
    const s = String(v || '').trim();
    if (!s) return [];
    return s
      .split(/\r?\n|\s*;\s*|\s*\|\s*/g)
      .map((x) => String(x || '').trim())
      .filter(Boolean);
  };

  const proyectoObjectives = normalizeList(proyectoObjectivesRaw).slice(0, 12);
  const proyectoBenefits = normalizeList(proyectoBenefitsRaw).slice(0, 12);

  const demoUrl = normalizeActionUrl(proyecto?.demo_url);
  const githubUrl = normalizeActionUrl(proyecto?.github_url);
  const contactLink = normalizeActionUrl(proyecto?.contact_link);

  const onCollaborate = () => {
    const draft = `Hola, vi tu ${badgeLabel.toLowerCase()} "${title || 'tu publicación'}" y me interesa colaborar. ¿Qué perfil estás buscando?`;
    navigate(`/messages?user=${post.user_id}&draft=${encodeURIComponent(draft)}`);
  };

  return (
    <div className="px-0 md:px-4 pb-2">
      <div className="px-4 md:px-0 pb-3">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {!isIdea && (
                <Badge className={`text-xs font-medium ${badgeClass}`}>{badgeLabel}</Badge>
              )}

              {statusLabel && (
                <Badge variant="outline" className={statusClass}>
                  {statusLabel}
                </Badge>
              )}

              {!isIdea && proyectoImpact && (
                <Badge variant="outline" className="text-xs">
                  Impacto: {proyectoImpact}
                </Badge>
              )}
            </div>

            {title && (
              <div className="text-lg md:text-xl font-bold leading-snug text-foreground">
                {title}
              </div>
            )}

            {/* Texto: sin resumen, con expand/collapse */}
            {rawDescription && (
              <div className="mt-2">
                <div
                  className={
                    !expanded
                      ? "text-[15px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]"
                      : "text-[15px] leading-relaxed whitespace-pre-wrap break-words text-muted-foreground"
                  }
                >
                  {isIdea ? intro : rawDescription}
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-[15px] font-semibold text-foreground hover:underline"
                >
                  {expanded ? 'Ver menos' : 'Ver más'}
                </button>
              </div>
            )}

            {/* Detalles (aparecen al expandir) */}
            {expanded && isIdea && (problem || forWho) && (
              <div className="mt-4 space-y-3">
                {problem && (
                  <div className="rounded-xl border border-red-100/70 dark:border-red-950/40 bg-red-50/70 dark:bg-red-950/15 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-200">
                      <CircleAlert className="h-4 w-4" />
                      Problema:
                    </div>
                    <div className="mt-1 text-sm text-red-900/80 dark:text-red-50/80 whitespace-pre-wrap break-words">{problem}</div>
                  </div>
                )}
                {forWho && (
                  <div className="rounded-xl border border-blue-100/70 dark:border-blue-950/40 bg-blue-50/70 dark:bg-blue-950/15 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-200">
                      <Users className="h-4 w-4" />
                      Para quién:
                    </div>
                    <div className="mt-1 text-sm text-blue-900/80 dark:text-blue-50/80 whitespace-pre-wrap break-words">{forWho}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Media: modal/visor grande se maneja dentro de PostContent/MediaCarousel */}
          <PostContent post={post} postId={post.id} hideText={true} />

          {(techToShow.length > 0 || tags.length > 0) && (
            <div className="p-4 pt-3">
              {techToShow.length > 0 && (
                <>
                  <div className="text-xs tracking-wide text-muted-foreground">TECNOLOGÍAS</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {techToShow.map((t: string) => (
                      <Badge
                        key={t}
                        className={
                          isIdea
                            ? "text-xs rounded-full border border-transparent bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-600 hover:to-emerald-700"
                            : "text-xs bg-primary text-primary-foreground hover:bg-primary"
                        }
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </>
              )}

              {tags.length > 0 && (
                <div className={techToShow.length > 0 ? 'mt-3 flex flex-wrap gap-2' : 'flex flex-wrap gap-2'}>
                  {tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs bg-background">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CTA: no redirecciones forzosas */}
          <div className="p-4 pt-0">
            {isIdea ? (
              post.idea ? (
                <JoinIdeaButton postId={post.id} className="w-full" />
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Idea incompleta
                </Button>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!demoUrl}
                  onClick={() => demoUrl && window.open(demoUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Demo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!githubUrl}
                  onClick={() => githubUrl && window.open(githubUrl, '_blank')}
                >
                  <Github className="h-4 w-4 mr-2" />
                  GitHub
                </Button>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    if (contactLink) window.open(contactLink, '_blank');
                    else onCollaborate();
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {contactLink ? 'Contactar' : 'Colaborar'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
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
