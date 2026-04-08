import React, { useState, useRef, useEffect, useCallback, useMemo, useReducer } from 'react';
import { useCreateIdea } from '@/hooks/ideas/use-create-idea';
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostCreatorContent } from './PostCreatorContent';
import { postCreatorReducer, initialPostCreatorState, type PostCreatorState, type PostCreatorAction } from './PostCreatorReducer';
import { useDraft } from '@/hooks/use-draft';
import { useAutoResize } from '@/hooks/use-auto-resize';

interface PostCreatorProps {
  initialContent?: string;
  initialFile?: File | null;
  initialPostType?: string;
  externalTextareaRef?: React.RefObject<HTMLTextAreaElement>;
  onClose?: () => void;
}

export function PostCreatorOptimized({ 
  initialContent = '',
  initialFile = null,
  initialPostType,
  externalTextareaRef,
  onClose
}: PostCreatorProps) {
  const [state, dispatch] = useReducer(postCreatorReducer, initialPostCreatorState);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createIdeaMutation = useCreateIdea();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const finalTextareaRef = externalTextareaRef || textareaRef;

  // Auto-resize hook for textarea
  const autoResizeRef = useAutoResize<HTMLTextAreaElement>(state.content);

  // Set initial content when component mounts - derived from props
  const initialContentValue = initialContent && !state.content ? initialContent : state.content;
  const initialFilesValue = initialFile && state.selectedFiles.length === 0 ? [initialFile] : state.selectedFiles;
  const initialPostTypeValue = initialPostType ? 
    (initialPostType === 'media' || initialPostType === 'document' || initialPostType === 'poll' || initialPostType === 'services' || initialPostType === 'event' || initialPostType === 'celebrate' 
      ? 'regular' 
      : initialPostType === 'job' 
        ? 'proyecto' 
        : state.postType) 
    : state.postType;

  useEffect(() => {
    if (initialContentValue !== state.content) dispatch({ type: 'SET_CONTENT', payload: initialContentValue });
    if (initialFilesValue !== state.selectedFiles) dispatch({ type: 'SET_SELECTED_FILES', payload: initialFilesValue });
    if (initialPostTypeValue !== state.postType) dispatch({ type: 'SET_POST_TYPE', payload: initialPostTypeValue });
  }, [initialContentValue, initialFilesValue, initialPostTypeValue]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        // Handle submit logic here
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.content, state.selectedFiles, state.postType, state.idea, state.proyecto, state.isUploading]);

  // Load user groups
  useEffect(() => {
    const loadUserGroups = async () => {
      dispatch({ type: 'SET_LOADING_GROUPS', payload: true });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          dispatch({ type: 'SET_USER_GROUPS', payload: [] });
          return;
        }

        const { data, error } = await (supabase.rpc as any)('get_user_groups', {
          user_id_param: user.id,
        });
        if (error) throw error;

        const activeGroups = (data || []).filter((g: any) => g.status === 'active');
        dispatch({ type: 'SET_USER_GROUPS', payload: activeGroups });
      } catch (e) {
        console.error('Error loading user groups:', e);
        dispatch({ type: 'SET_USER_GROUPS', payload: [] });
      } finally {
        dispatch({ type: 'SET_LOADING_GROUPS', payload: false });
      }
    };

    loadUserGroups();
  }, []);

  // Load user companies
  useEffect(() => {
    const loadUserCompanies = async () => {
      dispatch({ type: 'SET_LOADING_COMPANIES', payload: true });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          dispatch({ type: 'SET_USER_COMPANIES', payload: [] });
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
        dispatch({ type: 'SET_USER_COMPANIES', payload: Object.values(byId).sort((a, b) => a.company_name.localeCompare(b.company_name)) });
      } catch (e) {
        console.error('Error loading user companies:', e);
        dispatch({ type: 'SET_USER_COMPANIES', payload: [] });
      } finally {
        dispatch({ type: 'SET_LOADING_COMPANIES', payload: false });
      }
    };

    loadUserCompanies();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = [...state.selectedFiles, ...files].slice(0, 10);
      dispatch({ type: 'SET_SELECTED_FILES', payload: newFiles });
      
      const previews = files.map(file => URL.createObjectURL(file));
      dispatch({ type: 'SET_FILE_PREVIEWS', payload: [...state.filePreviews, ...previews] });
    }
    e.target.value = '';
  }, [state.selectedFiles, state.filePreviews]);

  const addAttachments = useCallback((files: File[]) => {
    const newFiles = [...state.selectedFiles, ...files].slice(0, 10);
    dispatch({ type: 'SET_SELECTED_FILES', payload: newFiles });
    
    const previews = files.map(file => URL.createObjectURL(file));
    dispatch({ type: 'SET_FILE_PREVIEWS', payload: [...state.filePreviews, ...previews] });
  }, [state.selectedFiles, state.filePreviews]);

  const removeAttachment = useCallback((index: number) => {
    const newFiles = state.selectedFiles.filter((_, i) => i !== index);
    const newPreviews = state.filePreviews.filter((_, i) => i !== index);
    dispatch({ type: 'SET_SELECTED_FILES', payload: newFiles });
    dispatch({ type: 'SET_FILE_PREVIEWS', payload: newPreviews });
  }, [state.selectedFiles, state.filePreviews]);

  const removeAllAttachments = useCallback(() => {
    state.filePreviews.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    dispatch({ type: 'SET_SELECTED_FILES', payload: [] });
    dispatch({ type: 'SET_FILE_PREVIEWS', payload: [] });
  }, [state.filePreviews]);

  const isFormValid = useMemo(() => {
    if (state.postType === 'regular') {
      return state.content.trim().length > 0 || state.selectedFiles.length > 0;
    }
    if (state.postType === 'idea') {
      return state.idea.title.trim().length > 0 && 
             state.idea.description.trim().length > 0 && 
             (state.content.trim().length > 0 || state.selectedFiles.length > 0);
    }
    if (state.postType === 'proyecto') {
      return state.proyecto.title.trim().length > 0 && 
             state.proyecto.description.trim().length > 0 && 
             (state.content.trim().length > 0 || state.selectedFiles.length > 0);
    }
    return false;
  }, [state]);

  return (
    <PostCreatorContent
      state={state}
      dispatch={dispatch}
      textareaRef={finalTextareaRef}
      addAttachments={addAttachments}
      removeAttachment={removeAttachment}
      removeAllAttachments={removeAllAttachments}
    />
  );
}
