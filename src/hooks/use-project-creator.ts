import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type ProjectFormData } from '@/types/project';
import { createProject } from '@/lib/api/projects/create-project';

const initialFormData: ProjectFormData = {
  // Step 1: Basic Info
  title: '',
  description: '',
  objectives: '',
  category: '',
  professor: '',
  duration: '',
  is_academic: false,
  
  // Step 2: Technical Details
  technologies: [],
  tags: [],
  status: 'planning',
  github_url: '',
  documentation_url: '',
  demo_url: '',
  is_open_source: false,
  seeking_collaborators: false,
  
  // Step 3: Contact Info
  contact_email: '',
  phone_number: '',
  linkedin_url: '',
  personal_website: '',
  
  // Step 4: Additional Info
  team_members: [],
  challenges: '',
  achievements: '',
  image_url: '',
  additional_links: []
};

export function useProjectCreator() {
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const updateFormData = (updates: Partial<ProjectFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const submitProject = async () => {
    setIsSubmitting(true);
    try {
      await createProject(formData, imageFile || undefined);
      
      // Invalidate projects query to refresh the Projects page
      queryClient.invalidateQueries({ 
        queryKey: ['project-posts'],
        exact: false  // Invalida todos los queries que empiecen con 'project-posts'
      });
      
      resetForm();
      setImageFile(null);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    updateFormData,
    resetForm,
    isSubmitting,
    submitProject,
    imageFile,
    setImageFile
  };
}