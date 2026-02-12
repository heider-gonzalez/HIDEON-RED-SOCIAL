import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Image as ImageIcon, Clock, ChevronDown, Plus, Lightbulb, Briefcase, BarChart2, Calendar, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile, getMediaType } from "@/lib/api/posts/storage";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FirstPostBadge } from '@/components/badges/FirstPostBadge';

export type PostType = 'idea' | 'proyecto' | 'encuesta' | 'evento' | 'empleo' | 'servicios' | null;

interface ModalPublicacionWebProps {
  isVisible: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onPublish?: (content: string, postType: PostType, mediaFile: File | null) => void;
  userAvatar?: string;
  isPublishing?: boolean;
  initialPostType?: PostType;
  initialContent?: string;
  initialMedia?: File | null;
  initialMediaType?: string | null;
  editingProject?: any; // For editing existing projects
}

 async function sendIdeaPublishedAutoMessage(recipientUserId: string) {
   try {
     if (!recipientUserId) return;
     const { error } = await (supabase as any).rpc('send_idea_published_dm', {
       recipient_user_id: recipientUserId,
     });
     if (error) {
       console.error('Error sending idea auto message via RPC:', error);
     }
   } catch (error) {
     console.error('Error sending idea auto message:', error);
   }
 }

const ModalPublicacionWeb: React.FC<ModalPublicacionWebProps> = ({
  isVisible,
  isOpen,
  onClose,
  onPublish,
  userAvatar,
  isPublishing = false,
  initialPostType,
  initialContent = '',
  initialMedia = null,
  initialMediaType = null,
  editingProject,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [userGroups, setUserGroups] = useState<
    Array<{
      group_id: string;
      group_name: string;
      status?: string;
    }>
  >([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  const [userCompanies, setUserCompanies] = useState<
    Array<{ company_id: string; company_name: string; logo_url?: string | null }>
  >([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  const [content, setContent] = useState(initialContent);
  const [selectedFiles, setSelectedFiles] = useState<File[]>(initialMedia ? [initialMedia] : []);
  const [filePreviews, setFilePreviews] = useState<string[]>(initialMedia ? [URL.createObjectURL(initialMedia)] : []);
  
  // 🎵 Audio support for Instagram-style music posts
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string>('');
  const [audioMetadata, setAudioMetadata] = useState<{
    name: string;
    duration: number;
    size: number;
    type: string;
  } | null>(null);
  const [showPostTypeMenu, setShowPostTypeMenu] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState<PostType>(null);
  const [privacy, setPrivacy] = useState('Público');
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const privacyMenuRef = useRef<HTMLDivElement>(null);
  const [isPublishingInternal, setIsPublishingInternal] = useState(false);

  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState<'idea' | 'in_progress' | 'completed'>('in_progress');
  const [projectTechnologies, setProjectTechnologies] = useState<string[]>([]);
  const [projectObjectives, setProjectObjectives] = useState('');
  const [projectTeamMembers, setProjectTeamMembers] = useState<string[]>([]);
  const [projectGithubUrl, setProjectGithubUrl] = useState('');
  const [teamMemberInput, setTeamMemberInput] = useState('');
  const [projectDemoUrl, setProjectDemoUrl] = useState('');

  // Populate form fields when editing a project
  useEffect(() => {
    if (editingProject) {
      setProjectTitle(editingProject.title || '');
      setProjectDescription(editingProject.description || '');
      setProjectStatus(
        editingProject.status === 'development' ? 'in_progress' : 
        editingProject.status === 'completed' ? 'completed' : 'idea'
      );
      setProjectTechnologies(editingProject.technologies || []);
      setProjectObjectives(editingProject.objectives || '');
      setProjectTeamMembers(editingProject.team_members || []);
      setProjectGithubUrl(editingProject.github_url || '');
      setProjectDemoUrl(editingProject.additional_links?.[0] || '');
      setContent(editingProject.description || '');
      setSelectedPostType('proyecto');
    }
  }, [editingProject]);
  const [techInput, setTechInput] = useState('');

  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventLocationType, setEventLocationType] = useState<'presencial' | 'virtual' | 'híbrido'>('presencial');
  const [showFirstPostBadge, setShowFirstPostBadge] = useState(false);
  const [eventLocation, setEventLocation] = useState('');
  const [eventMeetingLink, setEventMeetingLink] = useState('');
  const [eventCategory, setEventCategory] = useState<'conference' | 'seminar' | 'workshop' | 'hackathon' | 'webinar' | 'networking' | 'career_fair'>('conference');
  const [eventMaxAttendees, setEventMaxAttendees] = useState(100);

  const [serviceCategory, setServiceCategory] = useState('');

  const serviceCategoryOptions = useMemo(
    () => [
      'Asesoramiento',
      'Tutorías',
      'Buscar ayudante',
      'Diseño',
      'Programación',
      'Edición de video',
      'Otros'
    ],
    []
  );

  useEffect(() => {
    setContent(initialContent);
    if (initialMedia) {
      setSelectedFiles([initialMedia]);
      setFilePreviews([URL.createObjectURL(initialMedia)]);
    } else {
      setSelectedFiles([]);
      setFilePreviews([]);
    }
    
    // 🎵 Reset audio state when modal closes
    if (!isVisible) {
      setSelectedAudioFile(null);
      setAudioPreview('');
      setAudioMetadata(null);
    }
  }, [initialContent, initialMedia, isVisible]);

  // 🎵 Audio file processing function
  const handleAudioFileSelect = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de audio válido (MP3, WAV, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error", 
        description: "El archivo de audio es demasiado grande. Máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));

    // Get audio metadata
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      setAudioMetadata({
        name: file.name,
        duration: audio.duration,
        size: file.size,
        type: file.type,
      });
    });
    audio.src = URL.createObjectURL(file);

    toast({
      title: "Audio añadido",
      description: `${file.name} listo para usar como música de fondo`,
    });
  };

  // 🎵 Remove audio file
  const removeAudioFile = () => {
    setSelectedAudioFile(null);
    setAudioPreview('');
    setAudioMetadata(null);
  };

  useEffect(() => {
    if (!isVisible) return;

    const loadUserGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUserGroups([]);
          return;
        }

        const { data, error } = await (supabase as any).rpc('get_user_groups', {
          user_id_param: user.id,
        });
        if (error) throw error;

        const activeGroups = (data || []).filter((g: any) => g.status === 'active');
        setUserGroups(activeGroups);
      } catch (error) {
        console.error('Error loading user groups:', error);
        setUserGroups([]);
      } finally {
        setIsLoadingGroups(false);
      }
    };

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
      } catch (error) {
        console.error('Error loading user companies:', error);
        setUserCompanies([]);
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    loadUserGroups();
    loadUserCompanies();
  }, [isVisible]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPostTypeMenu(false);
      }
      if (privacyMenuRef.current && !privacyMenuRef.current.contains(event.target as Node)) {
        setShowPrivacyMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const effectivePublishing = isPublishing || isPublishingInternal;

  const visibilityValue = useMemo(() => {
    if (privacy === 'Amigos') return 'friends' as const;
    if (privacy === 'Solo yo') return 'private' as const;
    return 'public' as const;
  }, [privacy]);

  const isFormValid = useMemo(() => {
    if (selectedPostType === 'idea') {
      return ideaTitle.trim().length >= 3 && ideaDescription.trim().length >= 10;
    }
    if (selectedPostType === 'proyecto') {
      return projectTitle.trim().length >= 3 && projectDescription.trim().length >= 10;
    }
    if (selectedPostType === 'encuesta') {
      const cleanOptions = pollOptions.map(o => o.trim()).filter(Boolean);
      return pollQuestion.trim().length >= 5 && cleanOptions.length >= 2;
    }
    if (selectedPostType === 'evento') {
      const hasBasic = eventTitle.trim().length >= 3 && eventDescription.trim().length >= 10;
      const hasDates = Boolean(eventStartDate);
      const hasLocation = eventLocationType === 'virtual'
        ? eventMeetingLink.trim().length > 0
        : eventLocation.trim().length > 0;
      return hasBasic && hasDates && hasLocation;
    }
    if (selectedPostType === 'empleo') {
      return content.trim().length >= 10;
    }
    if (selectedPostType === 'servicios') {
      return Boolean(serviceCategory.trim()) && Boolean(content.trim() || selectedFiles.length > 0);
    }
    return Boolean(content.trim() || selectedFiles.length > 0);
  }, [content, selectedFiles.length, selectedPostType, ideaTitle, ideaDescription, projectTitle, projectDescription, projectStatus, projectTechnologies, projectObjectives, projectTeamMembers, projectGithubUrl, projectDemoUrl, pollQuestion, pollOptions, eventTitle, eventDescription, eventStartDate, eventLocationType, eventMeetingLink, eventLocation, serviceCategory]);

  const handlePublish = async () => {
    if (effectivePublishing) return;
    if (!isFormValid) return;

    setIsPublishingInternal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'Debes iniciar sesión para publicar',
          variant: 'destructive'
        });
        return;
      }

      const mediaUrls: string[] = [];

      if (selectedFiles.length > 0) {
        for (const f of selectedFiles) {
          const url = await uploadMediaFile(f);
          if (url) mediaUrls.push(url);
        }
      }

      const detectedTypes = selectedFiles
        .map((f) => getMediaType(f))
        .filter(Boolean) as Array<'image' | 'video' | 'audio'>;
      const uniqueTypes = Array.from(new Set(detectedTypes));
      const mediaType: 'image' | 'video' | 'audio' | null = uniqueTypes.length === 1 ? uniqueTypes[0] : null;

      const mediaUrl: string | null = mediaUrls.length > 0 ? mediaUrls[0] : null;

      const generateOptionId = () => {
        try {
          return crypto.randomUUID();
        } catch {
          return `opt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        }
      };

      if (selectedPostType === 'evento') {
        const isVirtual = eventLocationType === 'virtual';
        const location = isVirtual ? 'Virtual' : eventLocation;
        const meetingLink = isVirtual ? eventMeetingLink : '';
        const endDate = eventEndDate || eventStartDate;

        const { error } = await (supabase as any).rpc('create_academic_event_atomic', {
          user_id_param: user.id,
          post_content: content.trim() || '',
          post_visibility: visibilityValue,
          event_title: eventTitle.trim(),
          event_description: eventDescription.trim(),
          start_date: eventStartDate,
          end_date: endDate,
          location,
          is_virtual: isVirtual,
          meeting_link: meetingLink,
          max_attendees: Number.isFinite(eventMaxAttendees) ? eventMaxAttendees : 100,
          event_type: eventCategory,
          company_id_param: selectedCompanyId || null,
        });

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['posts'] });
        queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
        queryClient.invalidateQueries({ queryKey: ['feed-posts'] });

        onPublish?.(content, selectedPostType, selectedFiles[0] || null);
        toast({ title: 'Publicado', description: 'Tu evento se creó correctamente' });
        onClose();
        return;
      }

      const postData: any = {
        user_id: user.id,
        content: content.trim() || null,
        visibility: visibilityValue,
        media_url: mediaUrl,
        media_type: mediaType,
      };

      if (selectedGroupId) {
        postData.group_id = selectedGroupId;
      }

      if (selectedCompanyId) {
        postData.company_id = selectedCompanyId;
      }

      if (mediaUrls.length > 0) {
        postData.media_urls = mediaUrls;
      }

      if (selectedPostType === 'idea') {
        postData.post_type = 'idea';
        postData.idea = {
          title: ideaTitle.trim(),
          description: ideaDescription.trim(),
          participants: [],
        };
        postData.project_status = 'idea';
      } else if (selectedPostType === 'proyecto') {
        postData.post_type = 'project';
        postData.idea = {
          title: projectTitle.trim(),
          description: projectDescription.trim(),
          category: 'Otro',
          resources_needed: projectTechnologies,
          expected_impact: projectObjectives.trim(),
          demo_url: projectDemoUrl.trim() || null,
          github_url: projectGithubUrl.trim() || null,
          team_members: projectTeamMembers,
          participants: [],
        };
        postData.project_status = projectStatus;
        postData.technologies = projectTechnologies;
        postData.demo_url = projectDemoUrl.trim() || null;
      } else if (selectedPostType === 'encuesta') {
        postData.post_type = 'poll';
        const cleanOptions = pollOptions.map(o => o.trim()).filter(Boolean);
        postData.poll = {
          question: pollQuestion.trim(),
          options: cleanOptions.map((opt) => ({
            id: generateOptionId(),
            content: opt,
            votes: 0,
          })),
          total_votes: 0,
          user_vote: null,
        };
      } else if (selectedPostType === 'empleo') {
        postData.post_type = 'employment';
      } else if (selectedPostType === 'servicios') {
        postData.post_type = 'services';
        postData.service_category = serviceCategory.trim();
      } else {
        postData.post_type = 'regular';
      }

      let result;
      if (editingProject) {
        // Update existing project
        const { data: updatedPost, error: updateError } = await (supabase as any)
          .from('posts')
          .update(postData)
          .eq('id', editingProject.id)
          .select('id')
          .maybeSingle();
        
        if (updateError) throw updateError;
        result = { data: updatedPost, error: null };
      } else {
        // Insert new project
        result = await (supabase as any)
          .from('posts')
          .insert(postData)
          .select('id')
          .maybeSingle();
      }

      let insertedPostId = (result.data as any)?.id as string | undefined;

      if (result.error) {
        // Ignore conflict errors (duplicate key) but log for debugging
        if (result.error.code === '23505' || result.error.message?.includes('duplicate key')) {
          console.warn('Post insert conflict (likely duplicate), ignoring:', result.error);
          // Try to fetch existing post by user+content to continue flow
          const { data: existingPost } = await (supabase as any)
            .from('posts')
            .select('id')
            .eq('user_id', user.id)
            .eq('content', postData.content)
            .maybeSingle();
          if (existingPost?.id) {
            // Use existing post ID for downstream logic
            insertedPostId = (existingPost as any).id;
          } else {
            // If we can't find the post, still throw to surface the error
            throw result.error;
          }
        } else {
          throw result.error;
        }
      }

      // Variable reinforcement: award points for meaningful contributions
      try {
        let eventType: string | null = null;
        if (selectedPostType === 'idea') eventType = 'publish_idea';
        if (selectedPostType === 'proyecto') eventType = 'publish_project';

        if (eventType && insertedPostId) {
          await (supabase as any).rpc('eng_award_points', {
            p_event_type: eventType,
            p_entity_type: 'post',
            p_entity_id: insertedPostId,
          });

          const { data: surprise } = await (supabase as any).rpc('eng_try_surprise', {
            p_source_event: eventType,
            p_entity_type: 'post',
            p_entity_id: insertedPostId,
          });

          if (surprise?.awarded && Number(surprise.awarded) > 0) {
            toast({
              title: '¡Sorpresa! 🎁',
              description: `Ganaste +${surprise.awarded} puntos extra por tu aporte.`,
            });
          }
        }
      } catch (e) {
        // ignore gamification errors
      }

      // First post badge is now handled by database trigger (idempotent)
      // No need to handle it here to avoid duplicate key conflicts

      if (selectedPostType === 'idea') {
        sendIdeaPublishedAutoMessage(user.id);
      }

      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts', undefined, undefined, undefined, 'infinite'] });

      onPublish?.(content, selectedPostType, selectedFiles[0] || null);
      toast({ 
        title: editingProject ? 'Proyecto actualizado' : 'Publicado', 
        description: editingProject ? 'Tu proyecto se actualizó correctamente' : 'Tu publicación se creó correctamente' 
      });
      onClose();
    } catch (error: any) {
      console.error('Error publishing from ModalPublicacionWeb:', error);
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo publicar',
        variant: 'destructive'
      });
    } finally {
      setIsPublishingInternal(false);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
    const maxSize = 20 * 1024 * 1024;

    const accepted = files.filter((file) => {
      if (!validTypes.includes(file.type)) return false;
      if (file.size > maxSize) return false;
      return true;
    });

    if (accepted.length === 0) {
      e.target.value = '';
      toast({
        title: 'Archivo no permitido',
        description: 'Solo se aceptan imágenes/videos (máx 20MB).',
        variant: 'destructive'
      });
      return;
    }

    const nextFiles = [...selectedFiles, ...accepted].slice(0, 10);
    setSelectedFiles(nextFiles);

    const previewPromises = nextFiles.map((file) => {
      return new Promise<string>((resolve) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        } else {
          resolve(URL.createObjectURL(file));
        }
      });
    });

    Promise.all(previewPromises).then((previews) => setFilePreviews(previews));

    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    const toRemove = filePreviews[index];
    if (toRemove && toRemove.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(toRemove);
      } catch {
        // ignore
      }
    }

    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAllAttachments = () => {
    filePreviews.forEach((p) => {
      if (p.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(p);
        } catch {
          // ignore
        }
      }
    });

    setSelectedFiles([]);
    setFilePreviews([]);
  };

  const handlePostTypeSelect = (type: PostType) => {
    setSelectedPostType(type);
    if (type !== 'servicios') {
      setServiceCategory('');
    }
    setShowPostTypeMenu(false);
  };

  const handlePrivacySelect = (privacyOption: string) => {
    setPrivacy(privacyOption);
    setShowPrivacyMenu(false);
  };

  if (!isVisible && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black bg-opacity-50 ${(!isVisible && !isOpen) ? 'hidden' : ''} sm:px-4`}>
      <div className="bg-white dark:bg-gray-800 shadow-xl w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:max-w-2xl overflow-hidden sm:overflow-visible flex flex-col">
        <form
          className="flex flex-col h-full min-h-0"
          onSubmit={(e) => {
            e.preventDefault();
            handlePublish();
          }}
        >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <button
              onClick={onClose}
              type="button"
              className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-200" />
            </button>

            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>

            <div className="relative" ref={privacyMenuRef}>
              <button
                onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
                className="flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              >
                <span className="text-blue-500">
                  {privacy === 'Público' ? (
                    <span className="flex items-center">
                      <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a5 5 0 00-5 5v2a2 5 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                      </svg>
                    </span>
                  ) : privacy === 'Amigos' ? (
                    <span className="flex items-center">
                      <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </span>
                <span className="mx-1">{privacy}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showPrivacyMenu && (
                <div className="absolute left-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 z-50">
                  <button
                    onClick={() => handlePrivacySelect('Público')}
                    className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="mr-2 h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a5 5 0 00-5 5v2a2 5 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                    </svg>
                    Público
                  </button>
                  <button
                    onClick={() => handlePrivacySelect('Amigos')}
                    className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="mr-2 h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Amigos
                  </button>
                  <button
                    onClick={() => handlePrivacySelect('Solo yo')}
                    className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="mr-2 h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Solo yo
                  </button>
                </div>
              )}
            </div>

            {/* Company selector */}
            <div className="min-w-[180px] max-w-full">
              <Select
                value={selectedCompanyId || 'profile'}
                onValueChange={(value) => {
                  const next = value === 'profile' ? '' : value;
                  setSelectedCompanyId(next);
                  if (next) setSelectedGroupId('');
                }}
                disabled={isLoadingCompanies || selectedPostType === 'evento'}
              >
                <SelectTrigger className="h-9 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">
                  <SelectValue placeholder="Mi perfil / Empresa" />
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

            {/* Group selector */}
            <div className="min-w-[180px] max-w-full">
              <Select
                value={selectedGroupId || 'profile'}
                onValueChange={(value) => setSelectedGroupId(value === 'profile' ? '' : value)}
                disabled={isLoadingGroups || userGroups.length === 0 || Boolean(selectedCompanyId)}
              >
                <SelectTrigger className="h-9 rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profile">Sin grupo</SelectItem>
                  {userGroups.map((g) => (
                    <SelectItem key={g.group_id} value={g.group_id}>
                      {g.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
              <Clock className="h-5 w-5" />
            </button>

            <Button
              type="submit"
              disabled={!isFormValid || effectivePublishing}
              className={cn(
                'ml-2 bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-600',
                !isFormValid && 'cursor-not-allowed bg-blue-300 hover:bg-blue-300',
                effectivePublishing && 'opacity-70 cursor-not-allowed'
              )}
            >
              {effectivePublishing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {editingProject ? 'Actualizando...' : 'Publicando...'}
                </span>
              ) : (editingProject ? 'Actualizar' : 'Publicar')}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {selectedPostType === 'idea' && (
            <div className="space-y-3 mb-4">
              <input
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                placeholder="Título de la idea"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
              <textarea
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value)}
                placeholder={`Problema:\nDescribe qué problema has identificado y por qué es importante.\n\nPara quién:\n¿A quién afecta este problema? (estudiantes, empresas, comunidades, etc.)\n\nIdea / solución inicial:\n¿Qué propones hacer para resolverlo? No tiene que estar perfecta.\n\nQué buscas ahora:\n¿Equipo, feedback, validación, alguien con habilidades específicas?`}
                rows={4}
                className="w-full resize-none rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          )}

          {selectedPostType === 'empleo' && (
            <div className="space-y-3 mb-4">
              <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-gray-700/30 px-3 py-2 text-sm text-gray-700 dark:text-gray-100">
                Tipo: <span className="font-semibold">Empleo</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe la oferta (cargo, requisitos, modalidad, contacto...)"
                rows={5}
                className="w-full resize-none rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          )}

          {selectedPostType === 'servicios' && (
            <div className="space-y-3 mb-4">
              <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-gray-700/30 px-3 py-2 text-sm text-gray-700 dark:text-gray-100">
                Tipo: <span className="font-semibold">Servicios</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-100">Categoría del servicio</label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Selecciona una categoría</option>
                  {serviceCategoryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe el servicio, precio (opcional), y cómo contactarte"
                rows={5}
                className="w-full resize-none rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          )}

          {selectedPostType === 'proyecto' && (
            <div className="space-y-3 mb-4">
              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Título del proyecto"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
              
              {/* Selector de estado del proyecto */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Estado del proyecto:
                </label>
                <Select value={projectStatus} onValueChange={(value: 'idea' | 'in_progress' | 'completed') => setProjectStatus(value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="in_progress">En desarrollo</SelectItem>
                    <SelectItem value="completed">Terminado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Campo Objetivos del proyecto */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Objetivos del proyecto:
                </label>
                <textarea
                  value={projectObjectives}
                  onChange={(e) => setProjectObjectives(e.target.value)}
                  placeholder="¿Cuáles son los objetivos principales de este proyecto? ¿Qué impacto esperas lograr?"
                  rows={3}
                  className="w-full resize-none rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              
              {/* Campo Tecnologías */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tecnologías utilizadas:
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {projectTechnologies.map((tech, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => {
                          setProjectTechnologies(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && techInput.trim()) {
                        e.preventDefault();
                        if (projectTechnologies.length < 8 && !projectTechnologies.includes(techInput.trim())) {
                          setProjectTechnologies(prev => [...prev, techInput.trim()]);
                          setTechInput('');
                        }
                      }
                    }}
                    placeholder="Ej: React, Node.js, Python..."
                    className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      if (techInput.trim() && projectTechnologies.length < 8 && !projectTechnologies.includes(techInput.trim())) {
                        setProjectTechnologies(prev => [...prev, techInput.trim()]);
                        setTechInput('');
                      }
                    }}
                    disabled={!techInput.trim() || projectTechnologies.length >= 8}
                  >
                    Agregar
                  </Button>
                </div>
                {projectTechnologies.length >= 8 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Máximo 8 tecnologías
                  </p>
                )}
              </div>
              
              {/* Campo Miembros del equipo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Miembros del equipo (opcional):
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {projectTeamMembers.map((member, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm"
                    >
                      {member}
                      <button
                        type="button"
                        onClick={() => {
                          setProjectTeamMembers(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="ml-1 text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={teamMemberInput}
                    onChange={(e) => setTeamMemberInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && teamMemberInput.trim()) {
                        e.preventDefault();
                        if (projectTeamMembers.length < 5 && !projectTeamMembers.includes(teamMemberInput.trim())) {
                          setProjectTeamMembers(prev => [...prev, teamMemberInput.trim()]);
                          setTeamMemberInput('');
                        }
                      }
                    }}
                    placeholder="Ej: Ana García, Carlos Rodríguez..."
                    className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() => {
                      if (teamMemberInput.trim() && projectTeamMembers.length < 5 && !projectTeamMembers.includes(teamMemberInput.trim())) {
                        setProjectTeamMembers(prev => [...prev, teamMemberInput.trim()]);
                        setTeamMemberInput('');
                      }
                    }}
                    disabled={!teamMemberInput.trim() || projectTeamMembers.length >= 5}
                  >
                    Agregar
                  </Button>
                </div>
                {projectTeamMembers.length >= 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Máximo 5 miembros
                  </p>
                )}
              </div>
              
              {/* Campo URL GitHub */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  URL de GitHub (opcional):
                </label>
                <input
                  type="url"
                  value={projectGithubUrl}
                  onChange={(e) => setProjectGithubUrl(e.target.value)}
                  placeholder="https://github.com/usuario/proyecto"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>
              
              {/* Campo URL Demo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Link de demo/preview (opcional):
                </label>
                <input
                  type="url"
                  value={projectDemoUrl}
                  onChange={(e) => setProjectDemoUrl(e.target.value)}
                  placeholder="https://mi-proyecto-demo.com"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>
              
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder={`Describe tu proyecto de forma clara y concisa:

• Objetivo principal
• Estado actual
• Qué buscas (colaboradores, feedback, etc.)`}
                rows={4}
                className="w-full resize-none rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          )}

          {selectedPostType === 'encuesta' && (
            <div className="space-y-3 mb-4">
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Pregunta de la encuesta"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[idx] = e.target.value;
                      setPollOptions(next);
                    }}
                    placeholder={`Opción ${idx + 1}`}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8"
                  onClick={() => setPollOptions((prev) => [...prev, ''])}
                >
                  Agregar opción
                </Button>
                {pollOptions.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8"
                    onClick={() => setPollOptions((prev) => prev.slice(0, -1))}
                  >
                    Quitar última
                  </Button>
                )}
              </div>
            </div>
          )}

          {selectedPostType === 'evento' && (
            <div className="space-y-3 mb-4">
              <input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Título del evento"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
              <textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Descripción del evento"
                rows={3}
                className="w-full resize-none rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                />
                <input
                  type="datetime-local"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={eventLocationType}
                  onChange={(e) => setEventLocationType(e.target.value as any)}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                >
                  <option value="presencial">Presencial</option>
                  <option value="virtual">Virtual</option>
                  <option value="híbrido">Híbrido</option>
                </select>
                <select
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value as any)}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                >
                  <option value="conference">Conferencia</option>
                  <option value="seminar">Seminario</option>
                  <option value="workshop">Taller</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="webinar">Webinar</option>
                  <option value="networking">Networking</option>
                  <option value="career_fair">Feria de empleo</option>
                </select>
              </div>
              {eventLocationType === 'virtual' ? (
                <input
                  value={eventMeetingLink}
                  onChange={(e) => setEventMeetingLink(e.target.value)}
                  placeholder="Link de reunión"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                />
              ) : (
                <input
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Ubicación"
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                />
              )}
              <input
                type="number"
                value={eventMaxAttendees}
                onChange={(e) => setEventMaxAttendees(Number(e.target.value || 0))}
                placeholder="Máximo asistentes"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          )}

          {selectedPostType === null && (
            <textarea
              className="w-full resize-none border-none p-0 text-gray-900 placeholder-gray-500 focus:ring-0 dark:text-gray-100 dark:placeholder-gray-400 sm:text-sm"
              rows={10}
              placeholder="Comparte tus ideas..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
          )}

          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''} seleccionado{selectedFiles.length > 1 ? 's' : ''}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeAllAttachments}
                  className="text-xs h-7"
                >
                  Eliminar todos
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={filePreviews[index] || ''}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                    ) : (
                      <div className="relative w-full h-24 bg-black rounded-md overflow-hidden">
                        <video
                          src={filePreviews[index] || ''}
                          className="w-full h-full object-cover"
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
                    )}

                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🎵 Audio File Section */}
          {selectedAudioFile && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  🎵 Música de fondo
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeAudioFile}
                  className="text-xs h-7"
                >
                  Eliminar audio
                </Button>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedAudioFile.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {audioMetadata ? 
                        `${Math.floor(audioMetadata.duration / 60)}:${(audioMetadata.duration % 60).toString().padStart(2, '0')} • ${(audioMetadata.size / 1024 / 1024).toFixed(1)} MB` 
                        : 'Procesando...'
                      }
                    </div>
                  </div>
                </div>
                
                {audioPreview && (
                  <div className="mt-3">
                    <audio 
                      controls 
                      className="w-full h-8"
                      src={audioPreview}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center border-t px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4">
          <label className={cn(
            "cursor-pointer rounded-full p-2 text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          )}>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*,video/*" 
              multiple
              onChange={handleMediaSelect}
              disabled={false}
            />
            <ImageIcon className="h-5 w-5" />
          </label>
          
          {/* 🎵 Audio Upload Button */}
          <label className={cn(
            "cursor-pointer rounded-full p-2 text-purple-500 hover:bg-gray-100 dark:hover:bg-gray-700 ml-1"
          )}>
            <input 
              type="file" 
              className="hidden" 
              accept="audio/*" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleAudioFileSelect(file);
                }
                e.target.value = '';
              }}
              disabled={false}
            />
            <Music className="h-5 w-5" />
          </label>
          
          <div className="flex-1"></div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => {
                setShowPostTypeMenu(!showPostTypeMenu);
              }}
              className={cn(
                "flex items-center rounded-full p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700"
              )}
            >
              <Plus className="h-5 w-5" />
            </button>
            
            {showPostTypeMenu && (
              <div className="absolute bottom-12 right-0 z-[9999] w-56 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800">
                <button
                  onClick={() => handlePostTypeSelect('idea')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Lightbulb className="mr-3 h-5 w-5 text-blue-500" />
                  Publicar una idea
                </button>
                
                <button
                  onClick={() => handlePostTypeSelect('proyecto')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Briefcase className="mr-3 h-5 w-5 text-blue-500" />
                  Publicar un proyecto
                </button>
                
                <button
                  onClick={() => handlePostTypeSelect('encuesta')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <BarChart2 className="mr-3 h-5 w-5 text-blue-500" />
                  Publicar una encuesta
                </button>
                
                <button
                  onClick={() => handlePostTypeSelect('evento')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Calendar className="mr-3 h-5 w-5 text-blue-500" />
                  Publicar un evento
                </button>

                <button
                  onClick={() => handlePostTypeSelect('empleo')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Briefcase className="mr-3 h-5 w-5 text-blue-500" />
                  Publicar empleo
                </button>

                <button
                  onClick={() => handlePostTypeSelect('servicios')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Briefcase className="mr-3 h-5 w-5 text-blue-500" />
                  Publicar servicios
                </button>
              </div>
            )}
          </div>
        </div>
        </form>
      </div>
      
      {/* First Post Badge Modal */}
      <FirstPostBadge 
        isOpen={showFirstPostBadge}
        onClose={() => setShowFirstPostBadge(false)}
      />
    </div>
  );
};

export default ModalPublicacionWeb;
