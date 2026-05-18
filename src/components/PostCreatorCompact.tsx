import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Camera, 
  Smile, 
  Image, 
  FileVideo,
  Music,
  MapPin,
  Calendar,
  Users,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/components/user-menu/hooks/useUserProfile";
import { MoodPicker } from "./post/MoodPicker";
import { DragDropZone } from "./DragDropZone";
import { toast } from "sonner";

interface PostCreatorCompactProps {
  onOpenModal: () => void;
  onOpenWithMedia?: () => void;
  onFileDrop?: (file: File) => void;
  onMoodSelect?: (type: 'mood' | 'activity', item: any) => void;
}

export function PostCreatorCompact({ 
  onOpenModal, 
  onOpenWithMedia, 
  onFileDrop,
  onMoodSelect 
}: PostCreatorCompactProps) {
  const { user } = useAuth();
  const { username, avatarUrl } = useUserProfile();
  
  // Safe React refs for file inputs instead of DOM manipulation
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleMoodSelect = (type: 'mood' | 'activity', item: any) => {
    onMoodSelect?.(type, item);
    onOpenModal();
  };

  const handleMediaUpload = (type: 'photo' | 'video') => {
    // Use React refs instead of document.createElement
    const inputRef = type === 'photo' ? photoInputRef : videoInputRef;
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileDrop?.(files[0]);
      toast.success(`${type === 'photo' ? 'Imagen' : 'Video'} seleccionado correctamente`);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  return (
    <DragDropZone 
      onFileDrop={onFileDrop || (() => {})}
      className="rounded-lg transition-transform hover:scale-[1.01]"
    >
      {/* Hidden file inputs managed by React refs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileChange(e, 'photo')}
        style={{ display: 'none' }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={(e) => handleFileChange(e, 'video')}
        style={{ display: 'none' }}
      />
      
      <Card className="hover:shadow-md transition-shadow animate-fade-in mx-0 border-0 rounded-none shadow-none">
        <CardContent className="px-3 py-2">
          <div className="flex items-center justify-center gap-3 w-full">
          <Avatar className="h-8 w-8 hover-scale">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback>
              {username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div 
            className="flex-1 bg-muted/60 rounded-full px-3 py-2 cursor-pointer hover:bg-muted/80 transition-all duration-200 hover:scale-[1.02] border border-border/30"
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal();
            }}
          >
            <span className="text-foreground/60 text-sm">¿Cuál es tu idea?</span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Media Upload with Dropdown */}
            <div className="relative group">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenWithMedia?.();
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-all duration-200 text-sm font-medium hover-scale group"
                title="Subir contenido multimedia"
                type="button"
              >
                <Camera className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-foreground/70 text-xs">Foto</span>
              </button>
              
              {/* Quick Media Options - Hidden submenu that appears on hover */}
              <div className="hidden group-hover:block absolute top-full left-0 mt-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2 z-[60] w-48">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMediaUpload('photo');
                    }}
                    className="w-full justify-start gap-2 text-xs"
                    type="button"
                  >
                    <Image className="h-3 w-3 text-green-500" />
                    Subir foto
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMediaUpload('video');
                    }}
                    className="w-full justify-start gap-2 text-xs"
                    type="button"
                  >
                    <FileVideo className="h-3 w-3 text-purple-500" />
                    Subir video
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Enhanced Mood Picker - Separated to avoid conflicts */}
            <MoodPicker onSelect={handleMoodSelect}>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-all duration-200 text-sm font-medium hover-scale group"
                title="Añadir estado de ánimo o actividad"
                type="button"
              >
                <Smile className="h-4 w-4 text-yellow-500 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-foreground/70 text-xs">Estado</span>
              </button>
            </MoodPicker>
          </div>
          </div>

          {/* Additional Quick Actions Row (Optional - shows on hover) */}
          <div className="mt-3 pt-3 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden md:block">
            <div className="flex items-center gap-2 text-xs">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onOpenModal}>
                <MapPin className="h-3 w-3 mr-1" />
                Ubicación
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onOpenModal}>
                <Users className="h-3 w-3 mr-1" />
                Etiquetar
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onOpenModal}>
                <Calendar className="h-3 w-3 mr-1" />
                Evento
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onOpenModal}>
                <Zap className="h-3 w-3 mr-1" />
                Encuesta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DragDropZone>
  );
}