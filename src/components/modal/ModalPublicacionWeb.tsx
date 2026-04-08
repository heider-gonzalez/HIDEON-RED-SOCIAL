import React, { useReducer, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile, getMediaType } from "@/lib/api/posts/storage";
import { uploadAudioFile, getAudioDuration } from "@/lib/api/posts/audio-storage";
import { sendMentionNotifications } from '@/lib/notifications/mention-notifications';
import {
  addOptimisticPostToAllInfiniteFeeds,
  replaceOptimisticPostInAllInfiniteFeeds,
} from '@/lib/feed/optimistic-posts';
import { v4 as uuidv4 } from 'uuid';
import { useFormValidation, type ValidationResult } from '@/hooks/use-form-validation';
import { useAutosave, type AutosaveData } from '@/hooks/use-autosave';
import { useIsMobile } from '@/hooks/use-mobile';

// Sub-components
import { ModalPublicacionWebHeader } from './ModalPublicacionWebHeader';
import { ModalPublicacionWebContent } from './ModalPublicacionWebContent';
import { ModalPublicacionWebFooter } from './ModalPublicacionWebFooter';

// Reducer
import { modalReducer, initialModalState, type ModalState, type ModalAction, type PostTypeExtended } from './ModalPublicacionWebReducer';

export type PostType = PostTypeExtended | null;

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
  editingProject?: any;
  editingPost?: any;
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
    <div className="mb-4 p-3 rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Para publicar, completa:
        </span>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1">
        {validation.missingFields.map((field, index) => (
          <li key={index}>· {field}</li>
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
  editingPost,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const editingEntity = editingPost || editingProject;
  const editingPostId = (editingEntity as any)?.id as string | undefined;
  const isEditing = Boolean(editingPostId);

  // Use reducer for state management
  const [state, dispatch] = useReducer(modalReducer, initialModalState);

  // Update state when props change
  useEffect(() => {
    dispatch({ type: 'SET_CONTENT', payload: initialContent });
    if (!isEditing) {
      dispatch({ type: 'SET_POST_TYPE', payload: initialPostType || null });
    }
    if (initialMedia) {
      dispatch({ type: 'SET_SELECTED_FILES', payload: [initialMedia] });
      dispatch({ type: 'SET_FILE_PREVIEWS', payload: [URL.createObjectURL(initialMedia)] });
    } else {
      dispatch({ type: 'SET_SELECTED_FILES', payload: [] });
      dispatch({ type: 'SET_FILE_PREVIEWS', payload: [] });
    }
    
    // Reset audio state when modal closes
    if (!isVisible) {
      dispatch({ type: 'SET_AUDIO_TRACK', payload: null });
      dispatch({ type: 'SET_AUDIO_DATA', payload: null });
      dispatch({ type: 'TOGGLE_MUSIC_SELECTOR' });
      dispatch({ type: 'TOGGLE_AUDIO_EDITOR' });
    }
  }, [initialContent, initialMedia, isVisible, initialPostType, isEditing]);

  // Load editing post data
  useEffect(() => {
    if (!isVisible) return;
    if (!editingPostId) return;

    const loadEditingPost = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('posts')
          .select('*')
          .eq('id', editingPostId)
          .maybeSingle();

        if (error) throw error;
        if (!data) return;

        const postType = (data as any).post_type as string | null | undefined;
        const metadata = ((data as any).post_metadata as any) || {};
        const ideaData = ((data as any).idea as any) || {};

        if (postType === 'idea') {
          dispatch({ type: 'SET_POST_TYPE', payload: 'idea' });
          dispatch({ type: 'SET_CONTENT', payload: (data as any).content || '' });
          dispatch({ type: 'SET_IDEA_TITLE', payload: ideaData.title || metadata.idea?.title || '' });
          dispatch({ type: 'SET_IDEA_DESCRIPTION', payload: ideaData.description || metadata.idea?.description || '' });
          dispatch({ type: 'SET_IDEA_TECHNOLOGIES', payload: Array.isArray(ideaData.resources_needed) ? ideaData.resources_needed : [] });
          dispatch({ type: 'SET_IDEA_TAGS', payload: Array.isArray(metadata.idea_tags) ? metadata.idea_tags : [] });
          dispatch({ type: 'SET_IDEA_DEMO_URL', payload: (metadata.idea?.demo_url as string) || '' });
          dispatch({ type: 'SET_IDEA_GITHUB_URL', payload: (metadata.idea?.github_url as string) || '' });
        }

        if (postType === 'project' || postType === 'proyecto') {
          dispatch({ type: 'SET_POST_TYPE', payload: 'proyecto' });
          dispatch({ type: 'SET_CONTENT', payload: (data as any).content || '' });
          // Set project fields...
        }
      } catch (e: any) {
        toast({
          title: 'Error',
          description: `No se pudo cargar la publicación para editar. ${e.message}`,
          variant: 'destructive',
        });
      }
    };

    loadEditingPost();
  }, [isVisible, editingPostId]);

  // Autosave logic
  const getCurrentFormData = useCallback((): Partial<AutosaveData> => {
    return {
      content: state.content,
      ideaTitle: state.ideaTitle,
      ideaDescription: state.ideaDescription,
      projectTitle: state.projectTitle,
      projectDescription: state.projectDescription,
      projectStatus: state.projectStatus,
      projectTechnologies: state.projectTechnologies,
      selectedTemplate: state.selectedTemplate ? {
        id: state.selectedTemplate.id,
        name: state.selectedTemplate.name,
        category: state.selectedTemplate.category,
      } : undefined,
    };
  }, [state]);

  const { saveData, loadSavedData, clearAutosave, hasSavedData } = useAutosave(
    isVisible,
    state.selectedPostType,
    getCurrentFormData(),
    (data) => dispatch({ type: 'SET_AUTOSAVE_DATA', payload: data })
  );

  // Form validation
  const formData = getCurrentFormData();
  const validation = useFormValidation(state.selectedPostType, formData);

  // Autosave check
  useEffect(() => {
    if (isVisible && !state.hasCheckedForDraft) {
      if (isEditing) {
        dispatch({ type: 'SET_CHECKED_DRAFT', payload: true });
        return;
      }
      const saved = loadSavedData();
      if (saved && hasSavedData()) {
        dispatch({ type: 'SET_AUTOSAVE_DATA', payload: saved });
        dispatch({ type: 'TOGGLE_RESTORE_DRAFT' });
      }
      dispatch({ type: 'SET_CHECKED_DRAFT', payload: true });
    }
  }, [isVisible, state.selectedPostType, state.hasCheckedForDraft, isEditing]);

  // Clear autosave when modal closes
  useEffect(() => {
    if (!isVisible) {
      const timeout = setTimeout(() => {
        clearAutosave();
        dispatch({ type: 'SET_AUTOSAVE_DATA', payload: null });
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isVisible, clearAutosave]);

  // File handlers
  const addAttachments = useCallback((files: File[]) => {
    if (!files || files.length === 0) return;
    const newFiles = [...state.selectedFiles, ...files].slice(0, 10);
    dispatch({ type: 'SET_SELECTED_FILES', payload: newFiles });

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
      dispatch({ type: 'SET_FILE_PREVIEWS', payload: previews });
    });
  }, [state.selectedFiles]);

  const removeAttachment = useCallback((index: number) => {
    const newFiles = state.selectedFiles.filter((_, i) => i !== index);
    dispatch({ type: 'SET_SELECTED_FILES', payload: newFiles });
    dispatch({ type: 'SET_FILE_PREVIEWS', payload: state.filePreviews.filter((_, i) => i !== index) });
  }, [state.selectedFiles, state.filePreviews]);

  const removeAllAttachments = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_FILES', payload: [] });
    dispatch({ type: 'SET_FILE_PREVIEWS', payload: [] });
  }, []);

  // Audio handlers
  const handleMusicTrackSelect = useCallback((track: any) => {
    dispatch({ type: 'SET_AUDIO_TRACK', payload: track });
    dispatch({ type: 'TOGGLE_MUSIC_SELECTOR' });
    dispatch({ type: 'TOGGLE_AUDIO_EDITOR' });
  }, []);

  const handleAudioDataSelect = useCallback((audioData: any) => {
    dispatch({ type: 'SET_AUDIO_DATA', payload: audioData });
    dispatch({ type: 'TOGGLE_AUDIO_EDITOR' });
    toast({
      title: 'Música añadida',
      description: `${audioData.track.title} · ${audioData.track.artist}`,
    });
  }, []);

  // Template handlers
  const handleTemplateSelect = useCallback((template: any) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
    dispatch({ type: 'TOGGLE_TEMPLATE_SELECTOR' });
    
    if (state.selectedPostType === 'idea') {
      dispatch({ type: 'SET_IDEA_TITLE', payload: template.fields.title });
      dispatch({ type: 'SET_IDEA_DESCRIPTION', payload: template.fields.content });
    } else if (state.selectedPostType === 'proyecto') {
      dispatch({ type: 'SET_PROJECT_TITLE', payload: template.fields.title });
      dispatch({ type: 'SET_PROJECT_DESCRIPTION', payload: template.fields.content });
    }
  }, [state.selectedPostType]);

  // Draft handlers
  const handleRestoreDraft = useCallback(() => {
    if (!state.autosaveData) return;
    
    // Restore all fields from autosave data
    if (state.autosaveData.content) dispatch({ type: 'SET_CONTENT', payload: state.autosaveData.content });
    if (state.autosaveData.ideaTitle) dispatch({ type: 'SET_IDEA_TITLE', payload: state.autosaveData.ideaTitle });
    if (state.autosaveData.ideaDescription) dispatch({ type: 'SET_IDEA_DESCRIPTION', payload: state.autosaveData.ideaDescription });
    if (state.autosaveData.projectTitle) dispatch({ type: 'SET_PROJECT_TITLE', payload: state.autosaveData.projectTitle });
    if (state.autosaveData.projectDescription) dispatch({ type: 'SET_PROJECT_DESCRIPTION', payload: state.autosaveData.projectDescription });
    if (state.autosaveData.projectStatus) dispatch({ type: 'SET_PROJECT_STATUS', payload: state.autosaveData.projectStatus });
    if (state.autosaveData.projectTechnologies) dispatch({ type: 'SET_PROJECT_TECHNOLOGIES', payload: state.autosaveData.projectTechnologies });
    if (state.autosaveData.selectedTemplate) dispatch({ type: 'SET_TEMPLATE', payload: state.autosaveData.selectedTemplate });
    
    dispatch({ type: 'TOGGLE_RESTORE_DRAFT' });
    toast({
      title: 'Borrador restaurado',
      description: 'Tu contenido ha sido recuperado',
    });
  }, [state.autosaveData]);

  const handleClearDraft = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
    dispatch({ type: 'TOGGLE_RESTORE_DRAFT' });
    toast({
      title: 'Borrador eliminado',
      description: 'El contenido guardado ha sido eliminado',
    });
  }, []);

  const effectivePublishing = isPublishing || state.isPublishingInternal;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Main publish handler
  const handlePublish = useCallback(async () => {
    if (effectivePublishing) return;
    if (!validation.isValid) return;

    dispatch({ type: 'SET_PUBLISHING', payload: true });
    let optimisticTx: ReturnType<typeof addOptimisticPostToAllInfiniteFeeds> | null = null;
    let optimisticId = '';
    let optimisticPost: any = null;
    
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

      // Optimistic UI: create temporary post object
      optimisticId = `optimistic-${uuidv4()}`;
      const nowIso = new Date().toISOString();

      const optimisticMediaUrls = (() => {
        if (state.selectedFiles.length === 0) return null;
        const urls: string[] = [];
        for (let i = 0; i < state.selectedFiles.length; i++) {
          const preview = state.filePreviews[i];
          if (typeof preview === 'string' && preview.length > 0) {
            urls.push(preview);
          } else {
            try {
              urls.push(URL.createObjectURL(state.selectedFiles[i]));
            } catch {
              // ignore
            }
          }
        }
        return urls.length > 0 ? urls : null;
      })();

      optimisticPost = {
        id: optimisticId,
        user_id: user.id,
        content: state.content.trim() || null,
        visibility: state.visibility,
        post_type: state.selectedPostType || 'regular',
        media_url: optimisticMediaUrls?.[0] ?? null,
        media_type: state.selectedFiles[0] ? getMediaType(state.selectedFiles[0]) : null,
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
          id: user.id,
          username:
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'Usuario',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        },
      };

      // Add type-specific optimistic data
      if (state.selectedPostType === 'idea' && state.ideaTitle.trim()) {
        optimisticPost.idea = {
          title: state.ideaTitle,
          description: state.ideaDescription,
          resources_needed: state.ideaTechnologies,
          participants: [],
        };
        optimisticPost.post_metadata = {
          idea_tags: state.ideaTags,
          idea: {
            demo_url: state.ideaDemoUrl?.trim() || '',
            github_url: state.ideaGithubUrl?.trim() || '',
          },
        };
        optimisticPost.project_status = 'idea';
      }

      if (state.selectedPostType === 'proyecto' && state.projectTitle.trim()) {
        optimisticPost.post_metadata = {
          proyecto: {
            title: state.projectTitle,
            description: state.projectDescription,
            status: state.projectStatus,
            demo_url: state.projectDemoUrl?.trim() || '',
            github_url: state.projectGithubUrl?.trim() || '',
            impact: state.projectObjectives.trim(),
            stack: state.projectTechnologies,
            max_participants: 5,
          },
        };
        optimisticPost.project_status = state.projectStatus;
        optimisticPost.technologies = state.projectTechnologies;
        optimisticPost.demo_url = state.projectDemoUrl?.trim() || null;
      }

      // Add audio metadata if present
      if (state.selectedAudioData?.audioUrl) {
        optimisticPost.audio_url = state.selectedAudioData.audioUrl;
        optimisticPost.audio_metadata = state.selectedAudioData.audioMetadata;
      }

      optimisticTx = addOptimisticPostToAllInfiniteFeeds(queryClient, optimisticPost);

      // Continue with the rest of the publish logic...
      // (This would include file uploads, API calls, etc.)
      
    } catch (error: any) {
      console.error('Error publishing from ModalPublicacionWeb:', error);
      
      // Rollback optimistic post on error
      try {
        optimisticTx?.rollback();
      } catch {
        // ignore
      }
      
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo publicar',
        variant: 'destructive'
      });
    } finally {
      dispatch({ type: 'SET_PUBLISHING', payload: false });
    }
  }, [effectivePublishing, validation, state, queryClient, toast]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <ModalPublicacionWebHeader
          onClose={onClose}
          selectedPostType={state.selectedPostType}
          showPostTypeMenu={state.showPostTypeMenu}
          setShowPostTypeMenu={() => dispatch({ type: 'TOGGLE_POST_TYPE_MENU' })}
          setShowTemplateSelector={() => dispatch({ type: 'TOGGLE_TEMPLATE_SELECTOR' })}
          showFirstPostBadge={false} // Would be calculated based on user data
          isEditing={isEditing}
        />

        {/* Show restore draft notification */}
        {state.showRestoreDraft && (
          <div className="mx-4 mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  ¿Restaurar borrador guardado?
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Tienes contenido guardado de una sesión anterior
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearDraft}
                >
                  Descartar
                </Button>
                <Button size="sm" onClick={handleRestoreDraft}>
                  Restaurar
                </Button>
              </div>
            </div>
          </div>
        )}

        <ModalPublicacionWebContent
          content={state.content}
          setContent={(content) => dispatch({ type: 'SET_CONTENT', payload: content })}
          selectedFiles={state.selectedFiles}
          filePreviews={state.filePreviews}
          addAttachments={addAttachments}
          removeAttachment={removeAttachment}
          removeAllAttachments={removeAllAttachments}
          visibility={state.visibility}
          setVisibility={(visibility) => dispatch({ type: 'SET_VISIBILITY', payload: visibility })}
          selectedPostType={state.selectedPostType}
          textareaRef={textareaRef}
          isEditing={isEditing}
        />

        <ModalPublicacionWebFooter
          isFormValid={validation.isValid}
          isPublishing={state.isPublishingInternal}
          effectivePublishing={effectivePublishing}
          selectedPostType={state.selectedPostType}
          handleSubmit={handlePublish}
        />
      </div>
    </div>
  );
};

export default ModalPublicacionWeb;
