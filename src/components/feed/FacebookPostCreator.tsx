import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usePostComposer } from '@/providers/PostComposerProvider';
import { useAuth } from '@/providers/AuthProvider';
import { 
  Image as ImageIcon, 
  Lightbulb, 
  Briefcase, 
  Video 
} from 'lucide-react';

export function FacebookPostCreator() {
  const { user } = useAuth();
  const { open } = usePostComposer();
  const userAvatar = (user?.user_metadata as any)?.avatar_url;
  const userName = (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'Usuario';

  const handleOpenPostCreator = () => {
    open();
  };

  const handleOpenWithType = (type: 'idea' | 'project') => {
    open({ initialPostType: type });
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 mb-4 overflow-hidden">
      {/* Top Row: Avatar + Input */}
      <div className="flex items-center gap-3 p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={userAvatar || undefined} alt={userName} />
          <AvatarFallback>
            {userName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={handleOpenPostCreator}
          className="flex-1 text-left px-4 py-2.5 bg-muted/50 hover:bg-muted/70 rounded-full text-sm text-muted-foreground transition-colors"
        >
          ¿Qué tienes en mente, {userName}?
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50 mx-4" />

      {/* Bottom Row: Action Buttons */}
      <div className="flex items-center justify-around p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenPostCreator}
          className="flex-1 flex items-center gap-2 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Video className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium">Video</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenPostCreator}
          className="flex-1 flex items-center gap-2 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <ImageIcon className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">Foto</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleOpenWithType('idea')}
          className="flex-1 flex items-center gap-2 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          <span className="text-sm font-medium">Idea</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleOpenWithType('project')}
          className="flex-1 flex items-center gap-2 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Briefcase className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-medium">Proyecto</span>
        </Button>
      </div>
    </div>
  );
}
