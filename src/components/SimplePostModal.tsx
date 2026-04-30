import { useState, useEffect, useRef } from "react";
import { X, Clock, Image, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMediaFile, getMediaType } from "@/lib/api/posts/storage";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SimplePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Visibility = 'public' | 'friends' | 'private';

const visibilityOptions = [
  { value: 'public', label: 'Cualquiera' },
  { value: 'friends', label: 'Amigos' },
  { value: 'private', label: 'Solo yo' },
];

export function SimplePostModal({ open, onOpenChange }: SimplePostModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<{ avatar_url: string | null; username: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('id', user.id)
        .single();
      
      if (data) setProfile(data);
    };
    
    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    // Crear previews para todos los archivos
    const previews: string[] = [];
    selectedFiles.forEach((file) => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        previews.push(URL.createObjectURL(file));
      } else {
        previews.push('');
      }
    });
    setFilePreviews(previews);
    
    // Cleanup function
    return () => {
      previews.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [selectedFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = [...selectedFiles, ...files].slice(0, 10);
      setSelectedFiles(newFiles);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const handleSubmit = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      if (selectedFiles.length > 0) {
        mediaUrl = await uploadMediaFile(selectedFiles[0]);
        mediaType = getMediaType(selectedFiles[0]);
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim() || null,
        visibility,
        media_url: mediaUrl,
        media_type: mediaType,
        post_type: 'regular'
      });

      if (error) throw error;

      toast({ title: "¡Publicado!", description: "Tu publicación se creó correctamente" });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["personalized-feed"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      
      setContent("");
      setSelectedFiles([]);
      setFilePreviews([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo publicar" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const currentVisibility = visibilityOptions.find(v => v.value === visibility);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={() => onOpenChange(false)} className="p-1">
          <X className="h-6 w-6 text-foreground" />
        </button>
        
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
              {profile?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-sm font-medium text-foreground">
                {currentVisibility?.label}
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {visibilityOptions.map((option) => (
                <DropdownMenuItem 
                  key={option.value}
                  onClick={() => setVisibility(option.value as Visibility)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-1">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && selectedFiles.length === 0)}
            className="rounded-full px-4"
          >
            {isSubmitting ? "..." : "Publicar"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Comparte tus ideas..."
          className="w-full h-[calc(100vh-180px)] resize-none bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-base"
        />

        {/* File Previews */}
        {filePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {filePreviews.map((preview, index) => (
              <div key={index} className="relative inline-block">
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-40 rounded-lg" />
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground truncate">{selectedFiles[index]?.name}</span>
                  </div>
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-end gap-4 px-4 py-3 border-t border-border bg-background">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-2"
        >
          <Image className="h-6 w-6 text-muted-foreground" />
        </button>
        <button className="p-2">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
