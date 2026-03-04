import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Image as ImageIcon, Clock, ChevronDown, Plus, Lightbulb, Briefcase, BarChart2, Calendar, Music, Edit, FileText, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AudioPlayer } from '@/components/media/AudioPlayer';
import { AudioWaveform } from '@/components/media/AudioWaveform';
import { MusicSelector } from '@/components/media/MusicSelector';
import { InstagramAudioEditor } from '@/components/media/InstagramAudioEditor';
import type { MusicTrack } from '@/lib/api/music/music-library';
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
import { uploadAudioFile, getAudioDuration } from "@/lib/api/posts/audio-storage";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FirstPostBadge } from '@/components/badges/FirstPostBadge';
import { InstitutionCombobox } from '@/components/filters/InstitutionCombobox';
import { institutionsBarranquilla } from '@/data/institutions-barranquilla';
import { ideaTemplates, projectTemplates, getTemplatesByCategory, type Template } from '@/data/templates';
import { useAutosave, type AutosaveData } from '@/hooks/use-autosave';
import { useFormValidation, type ValidationResult } from '@/hooks/use-form-validation';
import { PostContentInput } from '@/components/post/PostContentInput';
import { sendMentionNotifications } from '@/lib/notifications/mention-notifications';

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

const ValidationSummary = ({ validation }: { validation: ValidationResult }) => {
  if (validation.isValid) return null;

  return (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-yellow-800">
          ⚠️ Completa los campos requeridos:
        </span>
      </div>
      <ul className="text-xs text-yellow-700 space-y-1">
        {validation.missingFields.map((field, index) => (
          <li key={index}>• {field}</li>
        ))}
      </ul>
    </div>
  );
};

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
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
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

  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showAudioEditor, setShowAudioEditor] = useState(false);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<MusicTrack | null>(null);
  const [selectedAudioData, setSelectedAudioData] = useState<null | {
    track: MusicTrack;
    startTime: number;
    endTime: number;
    audioUrl: string;
    duration: number;
  }>(null);
  
  // 🎵 Audio clip selection state
  const [audioClipStart, setAudioClipStart] = useState(0);
  const [audioClipEnd, setAudioClipEnd] = useState(30);
  const [showWaveformEditor, setShowWaveformEditor] = useState(false);
  const [showPostTypeMenu, setShowPostTypeMenu] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState<PostType>(null);
  const [privacy, setPrivacy] = useState('Público');
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const privacyMenuRef = useRef<HTMLDivElement>(null);
  const [isPublishingInternal, setIsPublishingInternal] = useState(false);

  const [institutionName, setInstitutionName] = useState('');
  const [otherInstitutionName, setOtherInstitutionName] = useState('');
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // Autosave state
  const [showRestoreDraft, setShowRestoreDraft] = useState(false);
  const [autosaveData, setAutosaveData] = useState<AutosaveData | null>(null);
  const [hasCheckedForDraft, setHasCheckedForDraft] = useState(false);

  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaTechnologies, setIdeaTechnologies] = useState<string[]>([]);
  const [ideaTechInput, setIdeaTechInput] = useState('');
  const [ideaTags, setIdeaTags] = useState<string[]>([]);
  const [ideaTagInput, setIdeaTagInput] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState<'idea' | 'in_progress' | 'completed'>('in_progress');
  const [projectTechnologies, setProjectTechnologies] = useState<string[]>([]);
  const [projectObjectives, setProjectObjectives] = useState('');
  const [projectTeamMembers, setProjectTeamMembers] = useState<string[]>([]);
  const [projectGithubUrl, setProjectGithubUrl] = useState('');
  const [projectDemoUrl, setProjectDemoUrl] = useState('');
  const [techInput, setTechInput] = useState('');
  const [teamMemberInput, setTeamMemberInput] = useState('');
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
      setSelectedAudioTrack(null);
      setSelectedAudioData(null);
      setShowWaveformEditor(false);
      setShowMusicSelector(false);
      setShowAudioEditor(false);
    }
  }, [initialContent, initialMedia, isVisible]);

  useEffect(() => {
    if (!isVisible && !isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVisible, isOpen, onClose]);

  useEffect(() => {
    const loadInstitution = async () => {
      if (!isVisible) return;
      if (institutionName.trim()) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        const { data } = await supabase
          .from('profiles')
          .select('institution_name')
          .eq('id', user.id)
          .maybeSingle();

        const inst = (data as any)?.institution_name;
        if (typeof inst === 'string' && inst.trim()) {
          const normalized = inst.trim();
          const isInList = institutionsBarranquilla.some((o) => o.name === normalized);
          if (isInList) {
            setInstitutionName(normalized);
            setOtherInstitutionName('');
          } else {
            setInstitutionName('Otra (No listada)');
            setOtherInstitutionName(normalized);
          }
        }
      } catch {
        // ignore
      }
    };

    void loadInstitution();
  }, [isVisible, institutionName]);

  const handleMusicTrackSelect = (track: MusicTrack) => {
    setSelectedAudioFile(null);
    setAudioPreview('');
    setAudioMetadata(null);
    setSelectedAudioTrack(track);
    setShowMusicSelector(false);
    setShowAudioEditor(true);
  };

  const handleAudioDataSelect = (audioData: {
    track: MusicTrack;
    startTime: number;
    endTime: number;
    audioUrl: string;
    duration: number;
  }) => {
    setSelectedAudioData(audioData);
    setSelectedAudioTrack(audioData.track);
    setAudioClipStart(audioData.startTime);
    setAudioClipEnd(audioData.endTime);
    setShowAudioEditor(false);

    toast({
      title: 'Música añadida',
      description: `${audioData.track.title} • ${audioData.track.artist}`,
    });
  };

  // Template handlers
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    
    // Apply template to form fields
    if (selectedPostType === 'idea') {
      setIdeaTitle(template.fields.title);
      setIdeaDescription(template.fields.content);
    } else if (selectedPostType === 'proyecto') {
      setProjectTitle(template.fields.title);
      setProjectDescription(template.fields.content);
    }
  };

  const handleClearTemplate = () => {
    setSelectedTemplate(null);
    if (selectedPostType === 'idea') {
      setIdeaTitle('');
      setIdeaDescription('');
    } else if (selectedPostType === 'proyecto') {
      setProjectTitle('');
      setProjectDescription('');
    }
  };

  const getAvailableTemplates = () => {
    if (selectedPostType === 'idea') return ideaTemplates;
    if (selectedPostType === 'proyecto') return projectTemplates;
    return [];
  };

  // Autosave handlers
  const handleRestoreDraft = () => {
    if (!autosaveData) return;
    
    // Restore all fields from autosave data
    if (autosaveData.content) setContent(autosaveData.content);
    if (autosaveData.ideaTitle) setIdeaTitle(autosaveData.ideaTitle);
    if (autosaveData.ideaDescription) setIdeaDescription(autosaveData.ideaDescription);
    if (autosaveData.projectTitle) setProjectTitle(autosaveData.projectTitle);
    if (autosaveData.projectDescription) setProjectDescription(autosaveData.projectDescription);
    if (autosaveData.projectStatus) setProjectStatus(autosaveData.projectStatus);
    if (autosaveData.projectTechnologies) setProjectTechnologies(autosaveData.projectTechnologies);
    if (autosaveData.projectObjectives) setProjectObjectives(autosaveData.projectObjectives);
    if (autosaveData.projectTeamMembers) setProjectTeamMembers(autosaveData.projectTeamMembers);
    if (autosaveData.projectGithubUrl) setProjectGithubUrl(autosaveData.projectGithubUrl);
    if (autosaveData.projectDemoUrl) setProjectDemoUrl(autosaveData.projectDemoUrl);
    if (autosaveData.pollQuestion) setPollQuestion(autosaveData.pollQuestion);
    if (autosaveData.pollOptions) setPollOptions(autosaveData.pollOptions);
    if (autosaveData.eventTitle) setEventTitle(autosaveData.eventTitle);
    if (autosaveData.eventDescription) setEventDescription(autosaveData.eventDescription);
    if (autosaveData.eventStartDate) setEventStartDate(autosaveData.eventStartDate);
    if (autosaveData.eventEndDate) setEventEndDate(autosaveData.eventEndDate);
    if (autosaveData.eventLocationType) setEventLocationType(autosaveData.eventLocationType);
    if (autosaveData.eventLocation) setEventLocation(autosaveData.eventLocation);
    if (autosaveData.eventMeetingLink) setEventMeetingLink(autosaveData.eventMeetingLink);
    if (autosaveData.eventCategory) setEventCategory(autosaveData.eventCategory as 'conference' | 'seminar' | 'workshop' | 'hackathon' | 'webinar' | 'networking' | 'career_fair');
    if (autosaveData.eventMaxAttendees) setEventMaxAttendees(autosaveData.eventMaxAttendees);
    if (autosaveData.serviceCategory) setServiceCategory(autosaveData.serviceCategory);
    if (autosaveData.institutionName) setInstitutionName(autosaveData.institutionName);
    if (autosaveData.otherInstitutionName) setOtherInstitutionName(autosaveData.otherInstitutionName);
    
    // Restore template if available
    if (autosaveData.selectedTemplate) {
      const template = [...ideaTemplates, ...projectTemplates].find(
        t => t.id === autosaveData.selectedTemplate?.id
      );
      if (template) setSelectedTemplate(template);
    }
    
    setShowRestoreDraft(false);
    toast({
      title: 'Borrador restaurado',
      description: 'Tu contenido ha sido recuperado',
    });
  };

  const handleClearDraft = () => {
    // Clear all form fields
    setContent('');
    setIdeaTitle('');
    setIdeaDescription('');
    setIdeaTechnologies([]);
    setIdeaTechInput('');
    setIdeaTags([]);
    setIdeaTagInput('');
    setProjectTitle('');
    setProjectDescription('');
    setProjectStatus('in_progress');
    setProjectTechnologies([]);
    setProjectObjectives('');
    setProjectTeamMembers([]);
    setProjectGithubUrl('');
    setProjectDemoUrl('');
    setPollQuestion('');
    setPollOptions(['', '']);
    setEventTitle('');
    setEventDescription('');
    setEventStartDate('');
    setEventEndDate('');
    setEventLocationType('presencial');
    setEventLocation('');
    setEventMeetingLink('');
    setEventCategory('conference');
    setEventMaxAttendees(100);
    setServiceCategory('');
    setInstitutionName('');
    setOtherInstitutionName('');
    setSelectedTemplate(null);
    
    setShowRestoreDraft(false);
    toast({
      title: 'Borrador eliminado',
      description: 'El contenido guardado ha sido eliminado',
    });
  };

  // Get current form data for autosave
  const getCurrentFormData = (): Partial<AutosaveData> => {
    return {
      content,
      ideaTitle,
      ideaDescription,
      projectTitle,
      projectDescription,
      projectStatus,
      projectTechnologies,
      projectObjectives,
      projectTeamMembers,
      projectGithubUrl,
      projectDemoUrl,
      pollQuestion,
      pollOptions,
      eventTitle,
      eventDescription,
      eventStartDate,
      eventEndDate,
      eventLocationType,
      eventLocation,
      eventMeetingLink,
      eventCategory,
      eventMaxAttendees,
      serviceCategory,
      institutionName,
      otherInstitutionName,
      selectedTemplate: selectedTemplate ? {
        id: selectedTemplate.id,
        name: selectedTemplate.name,
        category: selectedTemplate.category,
      } : undefined,
    };
  };

  // Form validation
  const formData = getCurrentFormData();
  const validation = useFormValidation(selectedPostType, formData);

  // Validation status helper
  const getFieldValidationStatus = (fieldName: string) => {
    return validation.fieldStatus[fieldName] || 'empty';
  };

  const getFieldErrors = (fieldName: string) => {
    return validation.fieldErrors[fieldName] || [];
  };

  const isFieldValid = (fieldName: string) => {
    return getFieldValidationStatus(fieldName) === 'valid';
  };

  const isFieldError = (fieldName: string) => {
    return getFieldValidationStatus(fieldName) === 'error';
  };

  // Autosave hook
  const { saveData, loadSavedData, clearAutosave, hasSavedData } = useAutosave(
    isVisible,
    selectedPostType,
    getCurrentFormData(),
    (data) => setAutosaveData(data)
  );

  // Check for saved data when modal opens (only once per modal session)
  useEffect(() => {
    if (isVisible && !hasCheckedForDraft) {
      const saved = loadSavedData();
      if (saved && hasSavedData()) {
        setAutosaveData(saved);
        setShowRestoreDraft(true);
      }
      setHasCheckedForDraft(true);
    }
  }, [isVisible, selectedPostType, hasCheckedForDraft]);

  // Reset draft check when modal closes
  useEffect(() => {
    if (!isVisible) {
      setHasCheckedForDraft(false);
    }
  }, [isVisible]);

  // Clear autosave when modal closes and content is published
  useEffect(() => {
    if (!isVisible) {
      const timeout = setTimeout(() => {
        clearAutosave();
        setAutosaveData(null);
      }, 1000); // Wait 1 second before clearing
      return () => clearTimeout(timeout);
    }
  }, [isVisible, clearAutosave]);

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
    setSelectedAudioTrack(null);
    setSelectedAudioData(null);
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

  const blockedWords = useMemo(
    () => [
      'puta',
      'puto',
      'mierda',
      'marica',
      'gonorrea',
      'hijueputa',
    ],
    []
  );

  const validateQuality = (text: string) => {
    const normalized = String(text || '').trim();
    if (!normalized) return { ok: true as const };

    if (normalized.length > 5000) {
      return { ok: false as const, message: 'Tu publicación supera el límite de 5,000 caracteres.' };
    }

    const lower = normalized.toLowerCase();
    if (blockedWords.some((w) => lower.includes(w))) {
      return { ok: false as const, message: 'Tu publicación contiene lenguaje no permitido.' };
    }

    // repetitive tokens (e.g. uwu uwu uwu ...)
    const tokens = lower.split(/\s+/).filter(Boolean);
    if (tokens.length >= 8) {
      const freq = new Map<string, number>();
      for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
      const top = Math.max(...Array.from(freq.values()));
      if (top >= Math.max(6, Math.ceil(tokens.length * 0.7))) {
        return { ok: false as const, message: 'Tu publicación parece demasiado repetitiva.' };
      }
    }

    // repeated character sequences
    if (/(.)\1{14,}/.test(lower)) {
      return { ok: false as const, message: 'Tu publicación contiene repetición excesiva de caracteres.' };
    }

    // repeated short pattern sequences (e.g. uwuuwuuwu)
    if (/([a-z0-9]{2,6})\1{5,}/i.test(lower)) {
      return { ok: false as const, message: 'Tu publicación contiene repetición excesiva.' };
    }

    return { ok: true as const };
  };

  const visibilityValue = useMemo(() => {
    if (privacy === 'Amigos') return 'friends' as const;
    if (privacy === 'Solo yo') return 'private' as const;
    return 'public' as const;
  }, [privacy]);

  const isFormValid = validation.isValid;

  // Update form validation when post type changes
  useEffect(() => {
    // This will trigger re-validation when post type changes
  }, [selectedPostType, validation.isValid]);

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

      const finalInstitutionName = (institutionName === 'Otra (No listada)'
        ? otherInstitutionName.trim()
        : institutionName.trim());

      if ((selectedPostType === 'idea' || selectedPostType === 'proyecto') && finalInstitutionName) {
        try {
          await (supabase as any)
            .from('profiles')
            .update({ institution_name: finalInstitutionName } as any)
            .eq('id', user.id);
        } catch {
          // ignore
        }
      }

      const mediaUrls: string[] = [];
      let audioUrl: string | null = null;
      let audioMetadata: any = null;

      // Upload media files (images/videos)
      if (selectedFiles.length > 0) {
        for (const f of selectedFiles) {
          const url = await uploadMediaFile(f);
          if (url) mediaUrls.push(url);
        }
      }

      if (selectedAudioData) {
        audioUrl = selectedAudioData.audioUrl;
        audioMetadata = {
          source: 'music_library',
          track_id: selectedAudioData.track.id,
          title: selectedAudioData.track.title,
          artist: selectedAudioData.track.artist,
          album: selectedAudioData.track.album || null,
          cover_art_url: selectedAudioData.track.cover_art_url || null,
          duration: selectedAudioData.track.duration,
          startTime: selectedAudioData.startTime,
          endTime: selectedAudioData.endTime,
        };
      } else if (selectedAudioFile) {
        // Upload audio file if selected
        try {
          const duration = await getAudioDuration(selectedAudioFile);
          const audioResult = await uploadAudioFile(selectedAudioFile, user.id, {
            name: selectedAudioFile.name,
            duration: duration,
            size: selectedAudioFile.size,
            type: selectedAudioFile.type,
            startTime: audioClipStart,
            endTime: audioClipEnd,
          });
          
          audioUrl = audioResult.url;
          audioMetadata = audioResult.metadata;
          
          console.log('✅ Audio uploaded successfully:', {
            url: audioUrl,
            metadata: audioMetadata
          });
          
          toast({
            title: 'Audio subido',
            description: 'Música de fondo añadida correctamente',
          });
        } catch (error) {
          console.error('❌ Audio upload failed:', error);
          toast({
            title: 'Error al subir audio',
            description: 'No se pudo subir el archivo de audio',
            variant: 'destructive'
          });
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

      // 🎵 Add audio data if uploaded
      if (audioUrl) {
        postData.audio_url = audioUrl;
        postData.audio_metadata = audioMetadata;
      }

      if (selectedPostType === 'idea') {
        postData.post_type = 'idea';
        postData.idea = {
          title: ideaTitle.trim(),
          description: ideaDescription.trim(),
          resources_needed: ideaTechnologies,
          participants: [],
        };
        postData.post_metadata = {
          ...(postData.post_metadata || {}),
          idea_tags: ideaTags,
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
      const effectiveText = [
        content,
        selectedPostType === 'idea' ? ideaDescription : '',
        selectedPostType === 'proyecto' ? projectDescription : '',
        selectedPostType === 'evento' ? eventDescription : '',
      ]
        .filter(Boolean)
        .join('\n');

      const quality = validateQuality(effectiveText);
      if (!quality.ok) {
        toast({
          title: 'Contenido no permitido',
          description: quality.message,
          variant: 'destructive'
        });
        return;
      }

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

      if (insertedPostId) {
        await sendMentionNotifications(content, user.id, 'post', insertedPostId);
      }

      // Track analytics events for idea/project creation
      if (insertedPostId) {
        try {
          if (selectedPostType === 'idea') {
            await (supabase as any).rpc('track_analytics_event', {
              event_name: 'idea_created',
              entity_type: 'post',
              entity_id: insertedPostId,
              user_id: user.id,
              metadata: {}
            });
          } else if (selectedPostType === 'proyecto') {
            await (supabase as any).rpc('track_analytics_event', {
              event_name: 'project_created',
              entity_type: 'post',
              entity_id: insertedPostId,
              user_id: user.id,
              metadata: {}
            });
          }
        } catch (e) {
          // ignore analytics errors
        }
      }

      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['personalized-feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts', undefined, undefined, undefined, 'infinite'] });

      onPublish?.(content, selectedPostType, selectedFiles[0] || null);
      toast({ 
        title: editingProject ? 'Proyecto actualizado' : 'Publicado', 
        description: editingProject ? 'Tu proyecto se actualizó correctamente' : 'Tu publicación se creó correctamente' 
      });
      
      // Clear autosave after successful publish
      clearAutosave();
      setAutosaveData(null);
      
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

  // Show restore draft dialog
  if (showRestoreDraft && autosaveData) {
    const timeAgo = new Date(autosaveData.savedAt).toLocaleString('es', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Borrador encontrado</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Se encontró un borrador guardado a las {timeAgo}. ¿Quieres restaurarlo?
          </p>
          <div className="flex gap-3">
            <Button onClick={handleClearDraft} variant="outline" className="flex-1">
              Eliminar
            </Button>
            <Button onClick={handleRestoreDraft} className="flex-1">
              Restaurar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black bg-opacity-50 ${(!isVisible && !isOpen) ? 'hidden' : ''} sm:px-4`}>
      <div className="bg-background text-foreground shadow-xl w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:max-w-2xl overflow-hidden sm:overflow-visible flex flex-col">
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
                <span className="text-primary">
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
                    <svg className="mr-2 h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a5 5 0 00-5 5v2a2 5 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                    </svg>
                    Público
                  </button>
                  <button
                    onClick={() => handlePrivacySelect('Amigos')}
                    className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="mr-2 h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Amigos
                  </button>
                  <button
                    onClick={() => handlePrivacySelect('Solo yo')}
                    className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="mr-2 h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
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

            {(selectedPostType === 'idea' || selectedPostType === 'proyecto') && (
              <div className="min-w-[220px] max-w-full">
                <InstitutionCombobox
                  value={institutionName}
                  onChange={(val) => {
                    setInstitutionName(val);
                    if (val !== 'Otra (No listada)') setOtherInstitutionName('');
                  }}
                  allLabel="Selecciona institución"
                  includeAllOption={false}
                  className="h-9 rounded-full"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
              <Clock className="h-5 w-5" />
            </button>

            <Button
              type="submit"
              disabled={!isFormValid || effectivePublishing}
              className={cn(
                'ml-2 bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90',
                !isFormValid && 'cursor-not-allowed bg-primary/50 hover:bg-primary/50',
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

        {/* Validation Summary */}
        <ValidationSummary validation={validation} />

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {(selectedPostType === 'idea' || selectedPostType === 'proyecto') && institutionName === 'Otra (No listada)' && (
            <div className="mb-4 space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Escribe el nombre de tu institución
              </label>
              <input
                value={otherInstitutionName}
                onChange={(e) => setOtherInstitutionName(e.target.value)}
                placeholder="Ej: Universidad Nacional"
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Template selector for ideas and projects */}
          {(selectedPostType === 'idea' || selectedPostType === 'proyecto') && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Plantilla (opcional)
                </label>
                {selectedTemplate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearTemplate}
                    className="text-xs h-6 px-2"
                  >
                    Limpiar plantilla
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant={selectedTemplate ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                  className="justify-start h-8 px-3 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {selectedTemplate ? selectedTemplate.name : 'Elegir plantilla'}
                </Button>
                {selectedTemplate && (
                  <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    {selectedTemplate.category}
                  </div>
                )}
              </div>
              
              {showTemplateSelector && (
                <div className="border rounded-lg p-3 bg-muted/20 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {getAvailableTemplates().map((template) => (
                      <Button
                        key={template.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTemplateSelect(template)}
                        className="w-full justify-start h-auto p-2 text-left"
                      >
                        <div className="text-xs font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedPostType === 'idea' && (
            <div className="space-y-3 mb-4">
              <div className="relative">
                <input
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  placeholder={selectedTemplate ? selectedTemplate.fields.title : "Título de la idea"}
                  className={`w-full rounded-md border px-3 py-2 text-sm pr-10 ${
                    isFieldError('ideaTitle') 
                      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500' 
                      : isFieldValid('ideaTitle')
                      ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                      : 'border-gray-200 dark:border-gray-700 bg-transparent'
                  }`}
                />
                {isFieldError('ideaTitle') && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <X className="h-4 w-4 text-red-500" />
                  </div>
                )}
                {isFieldValid('ideaTitle') && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              {getFieldErrors('ideaTitle').map((error, index) => (
                <p key={index} className="text-xs text-red-600 mt-1">{error}</p>
              ))}
              
              <div className="relative">
                <textarea
                  value={ideaDescription}
                  onChange={(e) => setIdeaDescription(e.target.value)}
                  placeholder={selectedTemplate ? selectedTemplate.fields.content : `Problema:
Describe qué problema has identificado y por qué es importante.

Para quién:
¿A quién afecta este problema? (estudiantes, empresas, comunidades, etc.)

Idea / solución inicial:
¿Qué propones hacer para resolverlo? No tiene que estar perfecta.

Qué buscas ahora:
¿Equipo, feedback, validación, alguien con habilidades específicas?`}
                  rows={4}
                  className={`w-full resize-none rounded-md border px-3 py-2 text-sm pr-10 ${
                    isFieldError('ideaDescription') 
                      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500' 
                      : isFieldValid('ideaDescription')
                      ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500'
                      : 'border-gray-200 dark:border-gray-700 bg-transparent'
                  }`}
                />
                {isFieldError('ideaDescription') && (
                  <div className="absolute right-3 top-3">
                    <X className="h-4 w-4 text-red-500" />
                  </div>
                )}
                {isFieldValid('ideaDescription') && (
                  <div className="absolute right-3 top-3">
                    <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              {getFieldErrors('ideaDescription').map((error, index) => (
                <p key={index} className="text-xs text-red-600 mt-1">{error}</p>
              ))}
              
              <div className="text-xs text-gray-500">
                {ideaDescription.length}/2000 caracteres
              </div>

              <div className="space-y-2">
                <label htmlFor="idea-technologies" className="text-sm font-medium text-gray-700 dark:text-gray-100">Tecnologías</label>
                <div className="flex gap-2">
                  <input
                    id="idea-technologies"
                    value={ideaTechInput}
                    onChange={(e) => setIdeaTechInput(e.target.value)}
                    placeholder="Ej: React, Node, MongoDB"
                    className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const value = ideaTechInput.trim().replace(/^#+/, '');
                      if (!value) return;
                      const exists = ideaTechnologies.some((t) => t.toLowerCase() === value.toLowerCase());
                      if (exists) {
                        setIdeaTechInput('');
                        return;
                      }
                      setIdeaTechnologies((prev) => [...prev, value].slice(0, 8));
                      setIdeaTechInput('');
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={() => {
                      const value = ideaTechInput.trim().replace(/^#+/, '');
                      if (!value) return;
                      const exists = ideaTechnologies.some((t) => t.toLowerCase() === value.toLowerCase());
                      if (exists) {
                        setIdeaTechInput('');
                        return;
                      }
                      setIdeaTechnologies((prev) => [...prev, value].slice(0, 8));
                      setIdeaTechInput('');
                    }}
                  >
                    Agregar
                  </Button>
                </div>

                {ideaTechnologies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ideaTechnologies.map((tech) => (
                      <div
                        key={tech}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-muted/30 px-3 py-1 text-xs"
                      >
                        <span>{tech}</span>
                        <button
                          type="button"
                          onClick={() => setIdeaTechnologies((prev) => prev.filter((t) => t !== tech))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="idea-tags" className="text-sm font-medium text-gray-700 dark:text-gray-100"># Hashtags (opcional)</label>
                <div className="flex gap-2">
                  <input
                    id="idea-tags"
                    value={ideaTagInput}
                    onChange={(e) => setIdeaTagInput(e.target.value)}
                    placeholder="Ej: #educación #empleo"
                    className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const raw = ideaTagInput.trim();
                      const normalized = raw.startsWith('#') ? raw : `#${raw}`;
                      const value = normalized.replace(/\s+/g, '');
                      if (value === '#') return;
                      const exists = ideaTags.some((t) => t.toLowerCase() === value.toLowerCase());
                      if (exists) {
                        setIdeaTagInput('');
                        return;
                      }
                      setIdeaTags((prev) => [...prev, value].slice(0, 8));
                      setIdeaTagInput('');
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    onClick={() => {
                      const raw = ideaTagInput.trim();
                      const normalized = raw.startsWith('#') ? raw : `#${raw}`;
                      const value = normalized.replace(/\s+/g, '');
                      if (value === '#') return;
                      const exists = ideaTags.some((t) => t.toLowerCase() === value.toLowerCase());
                      if (exists) {
                        setIdeaTagInput('');
                        return;
                      }
                      setIdeaTags((prev) => [...prev, value].slice(0, 8));
                      setIdeaTagInput('');
                    }}
                  >
                    Agregar
                  </Button>
                </div>

                {ideaTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ideaTags.map((tag) => (
                      <div
                        key={tag}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-background px-3 py-1 text-xs"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => setIdeaTags((prev) => prev.filter((t) => t !== tag))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedPostType === 'empleo' && (
            <div className="space-y-3 mb-4">
              <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-muted/40 px-3 py-2 text-sm text-foreground">
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
              <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-muted/40 px-3 py-2 text-sm text-foreground">
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
                placeholder={selectedTemplate ? selectedTemplate.fields.title : "Título del proyecto"}
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
              
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder={selectedTemplate ? selectedTemplate.fields.content : `Describe tu proyecto de forma clara y concisa:

• Objetivo principal
• Estado actual
• Qué buscas (colaboradores, feedback, etc.)`}
                rows={4}
                className="w-full resize-none rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
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
            <PostContentInput
              content={content}
              setContent={setContent}
              textareaRef={contentTextareaRef}
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
          {(selectedAudioFile || selectedAudioData) && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  🎵 Música de fondo
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedAudioData && selectedAudioData.track) {
                        setSelectedAudioTrack(selectedAudioData.track);
                        setShowAudioEditor(true);
                        return;
                      }
                      setShowWaveformEditor(!showWaveformEditor);
                    }}
                    className="text-xs h-7"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {selectedAudioData ? 'Editar' : (showWaveformEditor ? 'Ocultar editor' : 'Recortar audio')}
                  </Button>
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
              </div>
              
              {/* Waveform Editor */}
              {showWaveformEditor && selectedAudioFile && (
                <div className="mb-4">
                  <AudioWaveform
                    audioFile={selectedAudioFile}
                    startTime={audioClipStart}
                    endTime={audioClipEnd}
                    onClipSelect={(start, end) => {
                      setAudioClipStart(start);
                      setAudioClipEnd(end);
                    }}
                    maxDuration={60}
                  />
                </div>
              )}
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {selectedAudioData
                        ? `${selectedAudioData.track.title} • ${selectedAudioData.track.artist}`
                        : (selectedAudioFile ? selectedAudioFile.name : '')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedAudioData
                        ? `Clip: ${Math.floor(selectedAudioData.startTime)}s - ${Math.floor(selectedAudioData.endTime)}s (${Math.floor(selectedAudioData.endTime - selectedAudioData.startTime)}s)`
                        : (audioMetadata && selectedAudioFile
                          ? `Clip: ${Math.floor(audioClipStart)}s - ${Math.floor(audioClipEnd)}s (${Math.floor(audioClipEnd - audioClipStart)}s) • ${(selectedAudioFile.size / 1024 / 1024).toFixed(1)} MB`
                          : 'Procesando...')
                      }
                    </div>
                  </div>
                </div>
                
                {(audioPreview || selectedAudioData?.audioUrl) && (
                  <div className="mt-3">
                    <AudioPlayer
                      audioUrl={selectedAudioData?.audioUrl || audioPreview}
                      metadata={selectedAudioData
                        ? {
                            name: selectedAudioData.track.title,
                            duration: selectedAudioData.endTime - selectedAudioData.startTime,
                            size: 0,
                            type: 'audio/mpeg',
                          }
                        : (audioMetadata
                          ? {
                              ...audioMetadata,
                              duration: audioClipEnd - audioClipStart,
                            }
                          : undefined)
                      }
                      autoPlay={false}
                      loop={false}
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
          <button
            type="button"
            onClick={() => setShowMusicSelector(true)}
            className={cn(
              "cursor-pointer rounded-full p-2 text-purple-500 hover:bg-gray-100 dark:hover:bg-gray-700 ml-1"
            )}
          >
            <Music className="h-5 w-5" />
          </button>
          
          <div className="flex-1"></div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => {
                setShowPostTypeMenu(!showPostTypeMenu);
              }}
              className={cn(
                "flex items-center rounded-full p-2 text-primary hover:bg-muted"
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
                  <Lightbulb className="mr-3 h-5 w-5 text-primary" />
                  Publicar una idea
                </button>
                
                <button
                  onClick={() => handlePostTypeSelect('proyecto')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Briefcase className="mr-3 h-5 w-5 text-primary" />
                  Publicar un proyecto
                </button>
                
                <button
                  onClick={() => handlePostTypeSelect('encuesta')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <BarChart2 className="mr-3 h-5 w-5 text-primary" />
                  Publicar una encuesta
                </button>
                
                <button
                  onClick={() => handlePostTypeSelect('evento')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Calendar className="mr-3 h-5 w-5 text-primary" />
                  Publicar un evento
                </button>

                <button
                  onClick={() => handlePostTypeSelect('empleo')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Briefcase className="mr-3 h-5 w-5 text-primary" />
                  Publicar empleo
                </button>

                <button
                  onClick={() => handlePostTypeSelect('servicios')}
                  className="flex w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Briefcase className="mr-3 h-5 w-5 text-primary" />
                  Publicar servicios
                </button>
              </div>
            )}
          </div>
        </div>
        </form>
      </div>

      {showMusicSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background text-foreground rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <MusicSelector
              onTrackSelect={handleMusicTrackSelect}
              onClose={() => setShowMusicSelector(false)}
            />
          </div>
        </div>
      )}

      {showAudioEditor && selectedAudioTrack && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background text-foreground rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <InstagramAudioEditor
              track={selectedAudioTrack}
              videoDuration={30}
              onAudioSelect={handleAudioDataSelect}
              onClose={() => setShowAudioEditor(false)}
            />
          </div>
        </div>
      )}
      
      {/* First Post Badge Modal */}
      <FirstPostBadge 
        isOpen={showFirstPostBadge}
        onClose={() => setShowFirstPostBadge(false)}
      />
    </div>
  );
};

export default ModalPublicacionWeb;
