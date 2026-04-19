import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mobileToasts } from "@/components/ui/mobile-toast";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentInput } from "./AttachmentInput";
import { AttachmentPreview } from "./AttachmentPreview";
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

export function PostCreator({ 
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const finalTextareaRef = externalTextareaRef || textareaRef;
  const { clearDraft } = useDraft(content, setContent);

  // Auto-resize hook for textarea
  const autoResizeRef = useAutoResize<HTMLTextAreaElement>(content);

  // Set initial content when component mounts
  useEffect(() => {
    if (initialContent && !content) {
      setContent(initialContent);
    }
    if (initialFile && selectedFiles.length === 0) {
      setSelectedFiles([initialFile]);
    }
    // If an initial post type was provided (from mobile options), try to set it
    if (initialPostType) {
      // map incoming keys to supported postType values where possible
      if (initialPostType === 'media' || initialPostType === 'document' || initialPostType === 'poll' || initialPostType === 'services') {
        setPostType('regular');
      } else if (initialPostType === 'event') {
        setPostType('regular');
        // Event uses EventCreatorForm inside PostCreator when a special UI is implemented
      } else if (initialPostType === 'job') {
        setPostType('proyecto');
      } else if (initialPostType === 'celebrate') {
        setPostType('regular');
      }
    }
  }, [initialContent, initialFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid() && !isUploading) {
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

        const { data, error } = await supabase.rpc('get_user_groups', {
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
      
      console.log('Files selected:', newFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    }
    // Resetear el input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAllAttachments = () => {
    setSelectedFiles([]);
    setFilePreviews([]);
  };

  const handleSubmit = async () => {
    try {
      console.log('🚀 Starting post creation...', { postType, isFormValid: isFormValid() });
      
      // Pre-submission validation
      if (!isFormValid()) {
        console.error('❌ Form validation failed before submission');
        mobileToasts.error("Por favor completa todos los campos requeridos.");
        return;
      }
      
      // Enhanced authentication with comprehensive token cleanup
      console.log('🔐 Verifying authentication...');
      
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
          console.log('🧹 Auth tokens cleaned');
        } catch (cleanupError) {
          console.error('❌ Failed to cleanup auth:', cleanupError);
        }
        
        mobileToasts.error("Error de autenticación. Por favor inicia sesión nuevamente.");
        return;
      }
      
      console.log('✅ User authenticated:', { userId: session.user.id, email: session.user.email });

      if (!content.trim() && selectedFiles.length === 0 && postType === 'regular') {
        mobileToasts.validationError("Contenido o archivo");
        return;
      }

      if (postType === 'proyecto' && (!proyecto.title.trim() || !proyecto.description.trim())) {
        mobileToasts.validationError("Completa los campos obligatorios del proyecto (título y descripción)");
        return;
      }

      setIsUploading(true);
      

      // Upload multiple files if present
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      if (selectedFiles.length > 0) {
        console.log(`Uploading ${selectedFiles.length} file(s)...`);
        
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
          
          console.log(`Files uploaded successfully: ${mediaUrls.length} files`);
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

      console.log("Creating post with data:", postData);
      
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
            max_participants: proyecto.max_participants
          }
        };
      }
      
      // Insert regular post or idea post
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
      
      // Invalidate queries to update feed immediately
      queryClient.invalidateQueries({ queryKey: ["posts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["personalized-feed"] });

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
    } finally {
      setIsUploading(false);
    }
  };

  const isFormValid = () => {
    try {
      console.log('🔍 Validating form for postType:', postType);
      
      if (postType === 'regular') {
        // For text-only posts with backgrounds, limit content length
        if (contentStyle.isTextOnly && content.length > 280) {
          console.log('❌ Regular post validation failed: text too long for background');
          return false;
        }
        const isValid = Boolean(content.trim() || selectedFiles.length > 0);
        console.log('✅ Regular post validation:', { isValid, hasContent: !!content.trim(), hasFiles: selectedFiles.length });
        return isValid;
      } else if (postType === 'idea') {
        const validation = {
          hasTitle: idea.title.trim().length >= 5,
          hasDescription: idea.description.trim().length >= 10,
          validParticipants: idea.max_participants > 0 && idea.max_participants <= 50
        };
        const isValid = validation.hasTitle && validation.hasDescription && validation.validParticipants;
        console.log('💡 Idea validation:', { ...validation, isValid });
        return isValid;
      } else if (postType === 'proyecto') {
        const validationProyecto = {
          hasTitle: proyecto.title.trim().length >= 5,
          hasDescription: proyecto.description.trim().length >= 10,
          validParticipants: proyecto.max_participants > 0 && proyecto.max_participants <= 50
        };
        const isValidProyecto = validationProyecto.hasTitle && validationProyecto.hasDescription && validationProyecto.validParticipants;
        console.log('📁 Proyecto validation:', { ...validationProyecto, isValidProyecto });
        return isValidProyecto;
      }
      
      console.log('❌ Unknown postType:', postType);
      return false;
    } catch (error) {
      console.error('❌ Form validation error:', error);
      return false;
    }
  };

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
              <div key={index} className="relative">
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
              placeholder="Describe tu idea en detalle"
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
            <label className="text-sm font-medium">Título del proyecto</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ej: App para conectar empresas"
              value={proyecto.title}
              onChange={(e) => setProyecto({ ...proyecto, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              placeholder="Describe tu proyecto en detalle"
              value={proyecto.description}
              onChange={(e) => setProyecto({ ...proyecto, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Habilidades requeridas</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ej: React, Node.js, Diseño UI"
              value={proyecto.required_skills.join(', ')}
              onChange={(e) => setProyecto({ ...proyecto, required_skills: e.target.value.split(',').map(s => s.trim()) })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado del proyecto</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={proyecto.status}
              onChange={(e) => setProyecto({ ...proyecto, status: e.target.value as any })}
            >
              <option value="planificacion">En planificación</option>
              <option value="desarrollo">En desarrollo</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Enlace de contacto (opcional)</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="https://wa.me/1234567890 o https://t.me/usuario"
              value={proyecto.contact_link || ""}
              onChange={(e) => setProyecto({ ...proyecto, contact_link: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Máximo participantes</label>
            <input
              type="number"
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
            disabled={!isFormValid() || isUploading}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 text-base sm:text-sm font-medium hover-scale touch-manipulation"
            size="lg"
            onMouseEnter={() => {
              // Debug validation on hover
              if (!isFormValid()) {
                console.log('🔍 Button disabled - validation failed:', {
                  postType,
                  formValid: isFormValid(),
                  uploading: isUploading
                });
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
}
