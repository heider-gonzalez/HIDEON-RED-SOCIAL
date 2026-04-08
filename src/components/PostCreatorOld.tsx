import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mobileToasts } from "@/components/ui/mobile-toast";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentInput } from "@/components/media/AttachmentInput";
import { AttachmentPreview } from "@/components/media/AttachmentPreview";
import { MusicSelector } from "@/components/media/MusicSelector";
import { InstagramAudioEditor } from "@/components/media/InstagramAudioEditor";
import { VisibilitySelector } from "./post/VisibilitySelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Removed poll and marketplace creators
import { PostCreatorHeader } from "./post/PostCreatorHeader";
import { PostContentInput } from "./post/PostContentInput";
import { TextBackgroundPalette, ContentStyle, backgroundPresets } from "./post/TextBackgroundPalette";
import { EventCreatorForm } from "./post/EventCreatorForm";
import { uploadMediaFile, getMediaType } from "@/lib/api/posts/storage";
import { v4 as uuidv4 } from "uuid";
import { useDraft } from "@/hooks/use-draft";
import { useAutoResize } from "@/hooks/use-auto-resize";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateIdea } from "@/hooks/ideas/use-create-idea";
import {
  addOptimisticPostToAllInfiniteFeeds,
  replaceOptimisticPostInAllInfiniteFeeds,
} from "@/lib/feed/optimistic-posts";

export interface Idea {
  title: string;
  description: string;
  required_skills: string[];
  max_participants: number;
  deadline?: string;
  contact_link?: string;
}

export interface Proyecto {
  title: string;
  description: string;
  required_skills: string[];
  status: 'planificacion' | 'desarrollo' | 'finalizado';
  contact_link?: string;
  demo_url?: string;
  github_url?: string;
  impact?: string;
  stack?: string[];
  max_participants: number;
}

export interface EventForm {
  title: string;
  description: string;
  subtitle?: string;
  start_date: string;
  end_date?: string;
  location: string;
  location_type: 'presencial' | 'virtual' | 'híbrido';
  max_attendees?: number;
  category: 'conference' | 'seminar' | 'workshop' | 'hackathon' | 'webinar' | 'networking' | 'career_fair';
  registration_required?: boolean;
  registration_deadline?: string;
  contact_info?: string;
  gradient_color?: string;
  banner_file?: File | null;
}

type PostType = 'regular' | 'idea' | 'proyecto';
type Visibility = 'public' | 'friends' | 'private' | 'incognito';

interface PostCreatorProps {
  onPostCreated?: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  openWithMedia?: boolean;
  initialContent?: string;
  selectedFile?: File | null;
  initialPostType?: string;
}

 async function sendIdeaPublishedAutoMessage(recipientUserId: string) {
   try {
     if (!recipientUserId) return;
     const { error } = await (supabase.rpc as any)('send_idea_published_dm', {
       recipient_user_id: recipientUserId,
     });
     if (error) {
       console.error('Error sending idea auto message via RPC:', error);
     }
   } catch (error) {
     console.error('Error sending idea auto message:', error);
   }
 }

export const PostCreator = React.memo(function PostCreator({ 
  onPostCreated,
  textareaRef: externalTextareaRef,
  openWithMedia = false,
  initialContent = "",
  selectedFile: initialFile = null
  , initialPostType
}: PostCreatorProps = {}) {
  const [content, setContent] = useState(initialContent);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [postType, setPostType] = useState<PostType>("regular");
  const [selectedFiles, setSelectedFiles] = useState<File[]>(initialFile ? [initialFile] : []);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [contentStyle, setContentStyle] = useState<ContentStyle>({
    backgroundKey: 'none',
    textColor: 'text-foreground',
    isTextOnly: false
  });
  const [idea, setIdea] = useState<Idea>({
    title: "",
    description: "",
    required_skills: [],
    max_participants: 5,
    contact_link: ""
  });
  const [tempSkills, setTempSkills] = useState(""); // Temporary state for skills input
  const [proyecto, setProyecto] = useState<Proyecto>({
    title: "",
    description: "",
    required_skills: [],
    status: 'planificacion',
    contact_link: "",
    demo_url: "",
    github_url: "",
    impact: "",
    stack: [],
    max_participants: 5
  });
  const [evento, setEvento] = useState<EventForm>({
    title: "",
    description: "",
    subtitle: "",
    start_date: "",
    location: "",
    location_type: 'presencial',
    category: 'conference',
    gradient_color: 'gradient-1',
    banner_file: null
  });

  // Audio selection state
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showAudioEditor, setShowAudioEditor] = useState(false);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<any>(null);
  const [selectedAudioData, setSelectedAudioData] = useState<any>(null);

  const [userGroups, setUserGroups] = useState<
    Array<{ group_id: string; group_name: string; status?: string }>
  >([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const [userCompanies, setUserCompanies] = useState<
    Array<{ company_id: string; company_name: string; logo_url?: string | null }>
  >([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createIdeaMutation = useCreateIdea();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const finalTextareaRef = externalTextareaRef || textareaRef;
  const { clearDraft } = useDraft(content, setContent);

  // Auto-resize hook for textarea
  const autoResizeRef = useAutoResize<HTMLTextAreaElement>(content);

  // Set initial content when component mounts - derived from props
  const initialContentValue = initialContent && !content ? initialContent : content;
  const initialFilesValue = initialFile && selectedFiles.length === 0 ? [initialFile] : selectedFiles;
  const initialPostTypeValue = initialPostType ? 
    (initialPostType === 'media' || initialPostType === 'document' || initialPostType === 'poll' || initialPostType === 'services' || initialPostType === 'event' || initialPostType === 'celebrate' 
      ? 'regular' 
      : initialPostType === 'job' 
        ? 'proyecto' 
        : postType) 
    : postType;

  useEffect(() => {
    if (initialContentValue !== content) setContent(initialContentValue);
    if (initialFilesValue !== selectedFiles) setSelectedFiles(initialFilesValue);
    if (initialPostTypeValue !== postType) setPostType(initialPostTypeValue);
  }, [initialContentValue, initialFilesValue, initialPostTypeValue]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !isUploading) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, selectedFiles, postType, idea, evento, isUploading]);

  useEffect(() => {
    const loadUserGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUserGroups([]);
          return;
        }

        const { data, error } = await (supabase.rpc as any)('get_user_groups', {
          user_id_param: user.id,
        });
        if (error) throw error;

        const activeGroups = (data || []).filter((g: any) => g.status === 'active');
        setUserGroups(activeGroups);
      } catch (e) {
        console.error('Error loading user groups:', e);
        setUserGroups([]);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    loadUserGroups();
  }, []);

  useEffect(() => {
    const loadUserCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUserCompanies([]);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('company_members')
          .select('role, companies:companies(id, name, slug, logo_url)')
          .eq('user_id', user.id)
          .in('role', ['admin', 'editor']);
        if (error) throw error;

        const mapped = (data || [])
          .map((row: any) => {
            const c = row?.companies;
            if (!c?.id || !c?.name) return null;
            return {
              company_id: String(c.id),
              company_name: String(c.name),
              logo_url: c.logo_url ?? null,
            };
          })
          .filter(Boolean) as Array<{ company_id: string; company_name: string; logo_url?: string | null }>;

        const byId: Record<string, { company_id: string; company_name: string; logo_url?: string | null }> = {};
        mapped.forEach((c) => {
          byId[c.company_id] = c;
        });
        setUserCompanies(Object.values(byId).sort((a, b) => a.company_name.localeCompare(b.company_name)));
      } catch (e) {
        console.error('Error loading user companies:', e);
        setUserCompanies([]);
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    loadUserCompanies();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Combinar con archivos existentes (máximo 10 archivos)
      const newFiles = [...selectedFiles, ...files].slice(0, 10);
      setSelectedFiles(newFiles);
      
      // Crear previews para todos los archivos nuevos
      const newPreviews: Promise<string>[] = newFiles.map((file) => {
        return new Promise((resolve) => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(file);
          } else {
            // Para videos y otros, usar URL.createObjectURL
            resolve(URL.createObjectURL(file));
          }
        });
      });
      
      Promise.all(newPreviews).then((previews) => {
        setFilePreviews(previews);
      });
      
      console.log('Files selected: count', newFiles.length);
    }
    // Resetear el input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
  };

  const addAttachments = (files: File[]) => {
    if (!files || files.length === 0) return;
    const newFiles = [...selectedFiles, ...files].slice(0, 10);
    setSelectedFiles(newFiles);

    const newPreviews: Promise<string>[] = newFiles.map((file) => {
      return new Promise((resolve) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
          return;
        }
        resolve(URL.createObjectURL(file));
      });
    });

    Promise.all(newPreviews).then((previews) => {
      setFilePreviews(previews);
    });
  };

  const removeAttachment = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMusicTrackSelect = (track: any, bestMoment?: any) => {
    setSelectedAudioTrack(track);
    setShowMusicSelector(false);
    setShowAudioEditor(true);
  };

  const handleAudioDataSelect = (audioData: any) => {
    setSelectedAudioData(audioData);
    setShowAudioEditor(false);
  };

  const removeAudio = () => {
    setSelectedAudioTrack(null);
    setSelectedAudioData(null);
  };

  const removeAllAttachments = () => {
    setSelectedFiles([]);
    setFilePreviews([]);
  };

  const handleSubmit = async () => {
    let optimisticTx: ReturnType<typeof addOptimisticPostToAllInfiniteFeeds> | null = null;
    let optimisticId = '';
    let optimisticPost: any = null;
    try {
      // Pre-submission validation
      if (!isFormValid) {
        console.error('Form validation failed before submission');
        mobileToasts.error("Por favor completa todos los campos requeridos.");
        return;
      }
      
      // Enhanced authentication with comprehensive token cleanup
      
      // First, try to get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        console.error('❌ Authentication failed:', { sessionError, hasSession: !!session });
        
        // Comprehensive auth cleanup
        try {
          const keysToRemove = [
            'supabase.auth.token',
            'supabase.auth.refresh-token',
            'sb-wgbbaxvuuinubkgffpiq-auth-token',
            'sb-wgbbaxvuuinubkgffpiq-auth-token-code-verifier'
          ];
          
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
          });
          
          await supabase.auth.signOut();
          // ignore
        } catch (cleanupError) {
          console.error('❌ Failed to cleanup auth:', cleanupError);
        }
        
        mobileToasts.error("Error de autenticación. Por favor inicia sesión nuevamente.");
        return;
      }
      
      // User authenticated

      if (!content.trim() && selectedFiles.length === 0 && postType === 'regular') {
        mobileToasts.validationError("Contenido o archivo");
        return;
      }

      if (postType === 'proyecto' && (!proyecto.title.trim() || !proyecto.description.trim())) {
        mobileToasts.validationError("Completa los campos obligatorios del proyecto (título y descripción)");
        return;
      }

      optimisticId = `optimistic-${uuidv4()}`;
      const nowIso = new Date().toISOString();

      const optimisticMediaUrls = (() => {
        if (selectedFiles.length === 0) return null;
        const urls: string[] = [];
        for (let i = 0; i < selectedFiles.length; i++) {
          const preview = filePreviews[i];
          if (typeof preview === 'string' && preview.length > 0) {
            urls.push(preview);
          } else {
            try {
              urls.push(URL.createObjectURL(selectedFiles[i]));
            } catch {
              // ignore
            }
          }
        }
        return urls.length > 0 ? urls : null;
      })();

      optimisticPost = {
        id: optimisticId,
        user_id: session.user.id,
        content: content.trim() || null,
        visibility: visibility === 'incognito' ? 'private' : visibility,
        post_type: postType,
        media_url: optimisticMediaUrls?.[0] ?? null,
        media_type: selectedFiles[0] ? getMediaType(selectedFiles[0]) : null,
        media_urls: optimisticMediaUrls,
        created_at: nowIso,
        updated_at: nowIso,
        reactions: [],
        reactions_count: 0,
        comments_count: 0,
        shares_count: 0,
        views_count: 0,
        userHasReacted: false,
        profiles: {
          id: session.user.id,
          username:
            session.user.user_metadata?.name ||
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0] ||
            'Usuario',
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        },
      };

      if (postType === 'idea' && idea.title.trim()) {
        optimisticPost.idea = {
          title: idea.title,
          description: idea.description,
          required_skills: idea.required_skills,
          max_participants: idea.max_participants,
          deadline: idea.deadline || null,
          contact_link: idea.contact_link || null,
        };
        optimisticPost.project_status = 'idea';
      }

      if (postType === 'proyecto' && proyecto.title.trim()) {
        optimisticPost.post_metadata = {
          ...optimisticPost.post_metadata,
          proyecto: {
            title: proyecto.title,
            description: proyecto.description,
            required_skills: proyecto.required_skills,
            status: proyecto.status,
            contact_link: proyecto.contact_link || '',
            demo_url: proyecto.demo_url || '',
            github_url: proyecto.github_url || '',
            impact: proyecto.impact || '',
            stack: Array.isArray(proyecto.stack) ? proyecto.stack : [],
            max_participants: proyecto.max_participants,
          },
        };
      }

      optimisticTx = addOptimisticPostToAllInfiniteFeeds(queryClient, optimisticPost);

      setIsUploading(true);
      

      // Upload multiple files if present
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      if (selectedFiles.length > 0) {
        // Uploading files
        
        try {
          // Subir todos los archivos en paralelo
          const uploadPromises = selectedFiles.map(async (file) => {
            const url = await uploadMediaFile(file);
            const type = getMediaType(file);
            return { url, type };
          });

          const uploadResults = await Promise.all(uploadPromises);
          
          uploadResults.forEach(({ url, type }) => {
            if (url) {
              mediaUrls.push(url);
              mediaTypes.push(type || 'image');
            }
          });
          
          // Files uploaded
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          mobileToasts.error("Error al subir los archivos");
          setIsUploading(false);
          return;
        }
      }

      // Para compatibilidad con código existente, usar el primer archivo como media_url
      const mediaUrl = mediaUrls.length > 0 ? mediaUrls[0] : null;
      const mediaType = mediaTypes.length > 0 ? mediaTypes[0] : null;

      

      let visibilityValue: "public" | "friends" | "private" = visibility as "public" | "friends" | "private";
      if (visibility === 'incognito') {
        visibilityValue = 'private';
      }

      // Create post data
      const postData: any = {
        user_id: session.user.id,
        content: content.trim() || null,
        visibility: visibilityValue,
        media_url: mediaUrl, // Primera URL para compatibilidad
        media_type: mediaType, // Primer tipo para compatibilidad
        media_urls: mediaUrls.length > 0 ? mediaUrls : null, // Array de URLs para múltiples archivos
        post_type: postType
      };

      if (selectedAudioData?.audioUrl) {
        postData.audio_url = selectedAudioData.audioUrl;
        postData.audio_metadata = {
          source: 'music_library',
          track_id: selectedAudioData?.track?.id,
          title: selectedAudioData?.track?.title,
          artist: selectedAudioData?.track?.artist,
          album: selectedAudioData?.track?.album || null,
          cover_art_url: selectedAudioData?.track?.cover_art_url || null,
          duration: selectedAudioData?.track?.duration,
          startTime: selectedAudioData?.startTime,
          endTime: selectedAudioData?.endTime,
        };
      }

      if (selectedGroupId) {
        postData.group_id = selectedGroupId;
      }

      if (selectedCompanyId) {
        postData.company_id = selectedCompanyId;
      }

      // Add type-specific data
      
      if (postType === 'idea' && idea.title.trim()) {
        postData.idea = {
          title: idea.title,
          description: idea.description,
          required_skills: idea.required_skills,
          max_participants: idea.max_participants,
          deadline: idea.deadline || null,
          contact_link: idea.contact_link || null
        };
        postData.project_status = 'idea'; // Mark as idea initially
      }

      // Creating post
      
      // Handle proyectos - store metadata in post_metadata
      if (postType === 'proyecto' && proyecto.title.trim()) {
        postData.post_metadata = {
          ...postData.post_metadata,
          proyecto: {
            title: proyecto.title,
            description: proyecto.description,
            required_skills: proyecto.required_skills,
            status: proyecto.status,
            contact_link: proyecto.contact_link || '',
            demo_url: proyecto.demo_url || '',
            github_url: proyecto.github_url || '',
            impact: proyecto.impact || '',
            stack: Array.isArray(proyecto.stack) ? proyecto.stack : [],
            max_participants: proyecto.max_participants
          }
        };
      }
      
      if (postType === "idea") {
        const newPost = (await createIdeaMutation.mutateAsync({ postData })) as any;
        // Post created successfully

      try {
        if (newPost && typeof newPost === 'object' && newPost?.id) {
          const mergedPost: any = {
            ...newPost,
            profiles: (newPost as any)?.profiles || optimisticPost?.profiles,
            reactions: (newPost as any)?.reactions || [],
            reactions_count: typeof (newPost as any)?.reactions_count === 'number' ? (newPost as any).reactions_count : 0,
            comments_count: typeof (newPost as any)?.comments_count === 'number' ? (newPost as any).comments_count : 0,
            shares_count: typeof (newPost as any)?.shares_count === 'number' ? (newPost as any).shares_count : 0,
            views_count: typeof (newPost as any)?.views_count === 'number' ? (newPost as any).views_count : 0,
            userHasReacted: !!((newPost as any)?.userHasReacted),
            user_reaction: (newPost as any)?.user_reaction ?? null,
            media_urls: (newPost as any)?.media_urls ?? optimisticPost?.media_urls ?? null,
          };
          replaceOptimisticPostInAllInfiniteFeeds(queryClient, optimisticId, mergedPost);
        }
      } catch {
        // ignore
      }

        sendIdeaPublishedAutoMessage(session.user.id);

        queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["personalized-feed"] });
        queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
        queryClient.invalidateQueries({ queryKey: ["project-posts"] });

        try {
          window.dispatchEvent(new Event('hsocial:home_refresh'));
        } catch {
          // ignore
        }

        mobileToasts.postCreated();
        onPostCreated?.();
        clearDraft();

        setContent("");
        setVisibility("public");
        setPostType("regular");
        setSelectedFiles([]);
        setSelectedGroupId('');
        setSelectedCompanyId('');
        setContentStyle({
          backgroundKey: 'none',
          textColor: 'text-foreground',
          isTextOnly: false
        });
        setIdea({
          title: "",
          description: "",
          required_skills: [],
          max_participants: 5,
          contact_link: ""
        });
        setTempSkills("");
        setEvento({
          title: "",
          description: "",
          subtitle: "",
          start_date: "",
          location: "",
          location_type: 'presencial',
          category: 'conference',
          gradient_color: 'gradient-1',
          banner_file: null
        });

        return;
      }

      // Insert regular post
      const { data: newPost, error: postError } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();

      if (postError) {
        console.error('Post creation error:', postError);
        throw postError;
      }

      console.log('Post created successfully:', newPost);

      try {
        if (newPost && typeof newPost === 'object' && (newPost as any)?.id) {
          const mergedPost: any = {
            ...(newPost as any),
            profiles: (newPost as any)?.profiles || optimisticPost?.profiles,
            reactions: (newPost as any)?.reactions || [],
            reactions_count: typeof (newPost as any)?.reactions_count === 'number' ? (newPost as any).reactions_count : 0,
            comments_count: typeof (newPost as any)?.comments_count === 'number' ? (newPost as any).comments_count : 0,
            shares_count: typeof (newPost as any)?.shares_count === 'number' ? (newPost as any).shares_count : 0,
            views_count: typeof (newPost as any)?.views_count === 'number' ? (newPost as any).views_count : 0,
            userHasReacted: !!((newPost as any)?.userHasReacted),
            user_reaction: (newPost as any)?.user_reaction ?? null,
            media_urls: (newPost as any)?.media_urls ?? optimisticPost?.media_urls ?? null,
          };
          replaceOptimisticPostInAllInfiniteFeeds(queryClient, optimisticId, mergedPost);
        }
      } catch {
        // ignore
      }

      // At this point postType is narrowed to non-idea (idea branch returned above)
      
      // Invalidate queries to update feed immediately
      queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["personalized-feed"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["project-posts"] });

      // Some infinite queries won't refetch immediately on invalidate; force a refetch
      queryClient.refetchQueries({ queryKey: ["posts"], exact: false });

      try {
        window.dispatchEvent(new Event('hsocial:home_refresh'));
      } catch {
        // ignore
      }

      mobileToasts.postCreated();

      // Call onPostCreated callback if provided
      onPostCreated?.();

      // Clear draft after successful post
      clearDraft();

      // Reset form
      setContent("");
      setVisibility("public");
      setPostType("regular");
      setSelectedFiles([]);
      setSelectedGroupId('');
      setSelectedCompanyId('');
      setContentStyle({
        backgroundKey: 'none',
        textColor: 'text-foreground',
        isTextOnly: false
      });
      setIdea({
        title: "",
        description: "",
        required_skills: [],
        max_participants: 5,
        contact_link: ""
      });
      setTempSkills("");
      setEvento({
        title: "",
        description: "",
        subtitle: "",
        start_date: "",
        location: "",
        location_type: 'presencial',
        category: 'conference',
        gradient_color: 'gradient-1',
        banner_file: null
      });
    } catch (error) {
      console.error("❌ Error creating post:", error);
      
      // Enhanced error messages with specific handling
      console.error("❌ Error creating post:", { 
        error, 
        postType, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      });
      
      let errorMessage = "Error desconocido al crear la publicación";
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('auth') || errorMsg.includes('jwt') || errorMsg.includes('session')) {
          errorMessage = "Error de autenticación. Por favor inicia sesión nuevamente.";
          // Comprehensive auth cleanup
          try {
            const keysToRemove = [
              'supabase.auth.token',
              'supabase.auth.refresh-token',
              'sb-wgbbaxvuuinubkgffpiq-auth-token',
              'sb-wgbbaxvuuinubkgffpiq-auth-token-code-verifier'
            ];
            keysToRemove.forEach(key => localStorage.removeItem(key));
            await supabase.auth.signOut();
          } catch (cleanupError) {
            console.error('❌ Auth cleanup failed:', cleanupError);
          }
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
          errorMessage = "Error de conexión. Verifica tu internet e intenta nuevamente.";
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
          errorMessage = "Demasiadas publicaciones. Espera un momento antes de intentar nuevamente.";
        } else if (errorMsg.includes('violates check constraint')) {
          errorMessage = "Datos del evento no válidos. Revisa los campos obligatorios.";
        } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
          errorMessage = "No tienes permisos para realizar esta acción.";
        } else {
          errorMessage = error.message;
        }
      }
      
      mobileToasts.error(errorMessage);

      try {
        // Best-effort rollback optimistic post
        optimisticTx?.rollback();
      } catch {
        // ignore
      }
    } finally {
      setIsUploading(false);
    }
  };

  const isFormValid = useMemo(() => {
    try {
      // Validating form for postType
      
      if (postType === 'regular') {
        // For text-only posts with backgrounds, limit content length
        if (contentStyle.isTextOnly && content.length > 280) {
          // Regular post validation failed: text too long for background
          return false;
        }
        const isValid = !!(content.trim() || selectedFiles.length > 0);
        // Regular post validation
        return isValid;
      } else if (postType === 'idea') {
        const validation = {
          hasTitle: idea.title.trim().length >= 5,
          hasDescription: idea.description.trim().length >= 10,
          validParticipants: idea.max_participants > 0 && idea.max_participants <= 50
        };
        const isValid = validation.hasTitle && validation.hasDescription && validation.validParticipants;
        // Idea validation
        return isValid;
      } else if (postType === 'proyecto') {
        const validationProyecto = {
          hasTitle: proyecto.title.trim().length >= 5,
          hasDescription: proyecto.description.trim().length >= 10,
          validParticipants: proyecto.max_participants > 0 && proyecto.max_participants <= 50
        };
        const isValidProyecto = validationProyecto.hasTitle && validationProyecto.hasDescription && validationProyecto.validParticipants;
        // Proyecto validation
        return isValidProyecto;
      }
      
      // Unknown postType
      return false;
    } catch (error) {
      console.error('Form validation error:', error);
      return false;
    }
  }, [postType, contentStyle.isTextOnly, content.length, selectedFiles.length, idea.title, idea.description, idea.max_participants, proyecto.title, proyecto.description, proyecto.max_participants]);

  
  return (
    <Card className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-full overflow-hidden">
      <PostCreatorHeader 
        postType={postType} 
        setPostType={setPostType}
      />
      
      {postType === 'regular' && (
        <PostContentInput
          content={content}
          setContent={setContent}
          textareaRef={finalTextareaRef}
          contentStyle={contentStyle}
          onPasteFiles={addAttachments}
        />
      )}

      {postType === 'regular' && selectedFiles.length === 0 && (
        <TextBackgroundPalette
          selectedBackground={contentStyle.backgroundKey}
          onBackgroundChange={setContentStyle}
          disabled={selectedFiles.length > 0}
        />
      )}

      {/* Preview de múltiples archivos */}
      {postType === 'regular' && selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''} seleccionado{selectedFiles.length > 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeAllAttachments}
              className="text-xs h-6"
            >
              Eliminar todos
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedFiles.map((file, index) => (
              <div key={`${file.name}-${file.size}-${file.lastModified || index}`} className="relative">
                {file.type.startsWith('image/') ? (
                  <img
                    src={filePreviews[index] || URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md"
                    onLoad={(e) => {
                      // Cleanup object URL after load
                      const url = filePreviews[index] || (e.target as HTMLImageElement).src;
                      if (url.startsWith('blob:')) {
                        // URL.createObjectURL ya está siendo usado, no necesitamos cleanup aquí
                      }
                    }}
                  />
                ) : file.type.startsWith('video/') ? (
                  <div className="relative w-full h-24 bg-black rounded-md flex items-center justify-center">
                    <video
                      src={filePreviews[index] || URL.createObjectURL(file)}
                      className="w-full h-full object-cover rounded-md"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-1">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-24 bg-muted rounded-md flex items-center justify-center">
                    <span className="text-xs text-center px-2">{file.name}</span>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 rounded-full"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Music Selector Modal */}
      {showMusicSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <MusicSelector
              onTrackSelect={handleMusicTrackSelect}
              onClose={() => setShowMusicSelector(false)}
            />
          </div>
        </div>
      )}

      {/* Audio Editor Modal */}
      {showAudioEditor && selectedAudioTrack && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <InstagramAudioEditor
              track={selectedAudioTrack}
              bestMoment={selectedAudioTrack.bestMoment}
              videoDuration={30}
              onAudioSelect={handleAudioDataSelect}
              onClose={() => setShowAudioEditor(false)}
            />
          </div>
        </div>
      )}

      {/* Footer with Actions */}
      {postType === 'regular' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Música de fondo</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMusicSelector(true)}
              className="text-xs"
            >
              {selectedAudioData ? 'Cambiar música' : 'Agregar música'}
            </Button>
          </div>
          
          {selectedAudioData && (
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center">
                    <Music className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{selectedAudioData.track.title}</div>
                    <div className="text-xs text-gray-500">{selectedAudioData.track.artist}</div>
                    <div className="text-xs text-purple-600">
                      {Math.floor(selectedAudioData.duration)}s seleccionados
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeAudio}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón para agregar más archivos */}
      {postType === 'regular' && selectedFiles.length > 0 && selectedFiles.length < 10 && (
        <div>
          <AttachmentInput
            type="image"
            onFileSelect={handleFileSelect}
            accept="image/*,video/*"
            showLabel={true}
            label={`Agregar más (${selectedFiles.length}/10)`}
          />
        </div>
      )}

      {/* Poll creator removed for performance */}

      {postType === 'idea' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="idea-title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Título de la idea
            </label>
            <Textarea
              id="idea-title"
              placeholder="Ej: App para conectar estudiantes"
              value={idea.title}
              onChange={(e) => setIdea({ ...idea, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="idea-description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Descripción
            </label>
            <Textarea
              id="idea-description"
              placeholder={`Problema:\nDescribe qué problema has identificado y por qué es importante.\n\nPara quién:\n¿A quién afecta este problema? (estudiantes, empresas, comunidades, etc.)\n\nIdea / solución inicial:\n¿Qué propones hacer para resolverlo? No tiene que estar perfecta.\n\nQué buscas ahora:\n¿Equipo, feedback, validación, alguien con habilidades específicas?`}
              value={idea.description}
              onChange={(e) => setIdea({ ...idea, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="idea-skills" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Habilidades requeridas
            </label>
            <Textarea
              id="idea-skills"
              placeholder="Ej: React, Node.js, Diseño UI"
              value={tempSkills}
              onChange={(e) => setTempSkills(e.target.value)}
              onBlur={(e) => {
                // Process skills only when leaving the field
                const skills = e.target.value
                  .split(',')
                  .map(s => s.trim())
                  .filter(s => s.length > 0);
                setIdea({ ...idea, required_skills: skills });
              }}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="idea-contact" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Enlace de contacto (opcional)
            </label>
            <input
              type="url"
              id="idea-contact"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="https://wa.me/1234567890 o https://t.me/usuario"
              value={idea.contact_link || ""}
              onChange={(e) => setIdea({ ...idea, contact_link: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Comparte un enlace de WhatsApp o Telegram para contacto directo
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="idea-participants" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Máximo participantes
            </label>
            <input
              type="number"
              id="idea-participants"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="5"
              value={idea.max_participants}
              onChange={(e) => setIdea({ ...idea, max_participants: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="idea-deadline" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Fecha límite (opcional)
            </label>
            <input
              type="datetime-local"
              id="idea-deadline"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={idea.deadline || ""}
              onChange={(e) => setIdea({ ...idea, deadline: e.target.value })}
            />
          </div>
        </div>
      )}

      {postType === 'proyecto' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="proyecto-title" className="text-sm font-medium">Título del proyecto</label>
            <input
              type="text"
              id="proyecto-title"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ej: App para conectar empresas"
              value={proyecto.title}
              onChange={(e) => setProyecto({ ...proyecto, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="proyecto-description" className="text-sm font-medium">Descripción</label>
            <Textarea
              id="proyecto-description"
              placeholder="Describe tu proyecto en detalle"
              value={proyecto.description}
              onChange={(e) => setProyecto({ ...proyecto, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="proyecto-stack" className="text-sm font-medium">Stack tecnologías usadas</label>
            <input
              type="text"
              id="proyecto-stack"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ej: Next.js, Supabase, Tailwind"
              value={(proyecto.stack || []).join(', ')}
              onChange={(e) =>
                setProyecto({
                  ...proyecto,
                  stack: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
            <p className="text-xs text-muted-foreground">Esto se muestra como chips en la tarjeta del proyecto.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="proyecto-skills" className="text-sm font-medium">Habilidades requeridas</label>
            <input
              type="text"
              id="proyecto-skills"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ej: React, Node.js, Diseño UI"
              value={proyecto.required_skills.join(', ')}
              onChange={(e) => setProyecto({ ...proyecto, required_skills: e.target.value.split(',').map(s => s.trim()) })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="proyecto-status" className="text-sm font-medium">Estado del proyecto</label>
            <select
              id="proyecto-status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={proyecto.status}
              onChange={(e) => setProyecto({ ...proyecto, status: e.target.value as any })}
            >
              <option value="planificacion">En planificación</option>
              <option value="desarrollo">En desarrollo</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="proyecto-demo" className="text-sm font-medium">Demo (URL opcional)</label>
              <input
                type="url"
                id="proyecto-demo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="https://demo.tuapp.com"
                value={proyecto.demo_url || ""}
                onChange={(e) => setProyecto({ ...proyecto, demo_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="proyecto-github" className="text-sm font-medium">GitHub (URL opcional)</label>
              <input
                type="url"
                id="proyecto-github"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="https://github.com/usuario/repo"
                value={proyecto.github_url || ""}
                onChange={(e) => setProyecto({ ...proyecto, github_url: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="proyecto-impact" className="text-sm font-medium">Impacto (métrica corta)</label>
            <input
              type="text"
              id="proyecto-impact"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ej: 1,200 usuarios · +25% conversion · -40% tiempo"
              value={proyecto.impact || ""}
              onChange={(e) => setProyecto({ ...proyecto, impact: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="proyecto-contact" className="text-sm font-medium">Enlace de contacto (opcional)</label>
            <input
              type="text"
              id="proyecto-contact"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="https://wa.me/1234567890 o https://t.me/usuario"
              value={proyecto.contact_link || ""}
              onChange={(e) => setProyecto({ ...proyecto, contact_link: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="proyecto-participants" className="text-sm font-medium">Máximo participantes</label>
            <input
              type="number"
              id="proyecto-participants"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={proyecto.max_participants}
              onChange={(e) => setProyecto({ ...proyecto, max_participants: parseInt(e.target.value) })}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <VisibilitySelector 
          visibility={visibility}
          setVisibility={setVisibility}
        />

        <div className="w-full sm:w-auto sm:min-w-[220px]">
          <Select
            value={selectedCompanyId || 'profile'}
            onValueChange={(value) => {
              const next = value === 'profile' ? '' : value;
              setSelectedCompanyId(next);
              if (next) setSelectedGroupId('');
            }}
            disabled={isLoadingCompanies}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Mi perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profile">Mi perfil</SelectItem>
              {userCompanies.map((c) => (
                <SelectItem key={c.company_id} value={c.company_id}>
                  {c.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto sm:min-w-[220px]">
          <Select
            value={selectedGroupId || 'profile'}
            onValueChange={(value) => setSelectedGroupId(value === 'profile' ? '' : value)}
            disabled={isLoadingGroups || userGroups.length === 0 || Boolean(selectedCompanyId)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Mi perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profile">Mi perfil</SelectItem>
              {userGroups.map((g) => (
                <SelectItem key={g.group_id} value={g.group_id}>
                  {g.group_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid || isUploading}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 text-base sm:text-sm font-medium hover-scale touch-manipulation"
            size="lg"
            onMouseEnter={() => {
              // Debug validation on hover
              if (!isFormValid) {
                // Button disabled - validation failed
              }
            }}
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Publicando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Publicar
                <span className="hidden sm:inline text-xs opacity-70">Ctrl+Enter</span>
              </div>
            )}
          </Button>
      </div>
    </Card>
  );
});
