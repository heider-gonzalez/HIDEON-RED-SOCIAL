import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  media_url: string | null;
  created_at: string;
}

interface StoriesCarouselProps {
  stories?: Story[];
}

export function StoriesCarousel({ stories = [] }: StoriesCarouselProps) {
  const { user } = useAuth();
  const userAvatar = (user?.user_metadata as any)?.avatar_url;
  const userName = (user?.user_metadata as any)?.full_name || user?.email?.split('@')[0] || 'Usuario';

  // Mock stories for demo - in production, fetch from API
  const mockStories: Story[] = stories.length > 0 ? stories : [];

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border/50 mb-4 overflow-hidden">
      <div className="flex gap-3 p-4 overflow-x-auto scrollbar-hide">
        {/* Create Story Card */}
        <Link
          to="/stories/create"
          className="flex-shrink-0 w-24 flex flex-col items-center gap-2 cursor-pointer group"
        >
          <div className="relative w-20 h-32 rounded-xl bg-muted/30 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-primary/50 transition-colors">
            <div className="absolute -top-2 -right-2 h-8 w-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <Plus className="h-4 w-4 text-primary-foreground" />
            </div>
            <Avatar className="h-12 w-12">
              <AvatarImage src={userAvatar || undefined} />
              <AvatarFallback>
                {userName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="text-xs font-medium text-foreground text-center">
            Crear historia
          </span>
        </Link>

        {/* Story Cards */}
        {mockStories.map((story) => (
          <Link
            key={story.id}
            to={`/stories/${story.id}`}
            className="flex-shrink-0 w-24 flex flex-col items-center gap-2 cursor-pointer group"
          >
            <div className="relative w-20 h-32 rounded-xl overflow-hidden bg-muted">
              {/* Story gradient ring */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-primary/50 via-purple-500/50 to-pink-500/50 p-0.5">
                <div className="w-full h-full rounded-xl overflow-hidden">
                  {story.media_url ? (
                    <img
                      src={story.media_url}
                      alt={story.username}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={story.avatar_url || undefined} />
                        <AvatarFallback>
                          {story.username.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <span className="text-xs font-medium text-foreground text-center truncate w-full">
              {story.username}
            </span>
          </Link>
        ))}

        {/* Empty state placeholder */}
        {mockStories.length === 0 && (
          <div className="flex-shrink-0 w-24 flex flex-col items-center gap-2 opacity-50">
            <div className="w-20 h-32 rounded-xl bg-muted/30" />
            <span className="text-xs text-muted-foreground text-center">
              Sin historias
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
