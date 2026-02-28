import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Play, Volume2, VolumeX } from "lucide-react";
import { Post } from "@/types/post";
import { ReactionButtons } from "@/components/post/ReactionButtons";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ReelsViewerProps {
  posts: Post[];
  onReaction?: (postId: string, type: string) => void;
}

export const ReelsViewer = memo(function ReelsViewer({ posts, onReaction }: ReelsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPost = posts[currentIndex];

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleVideoClick = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  }, [currentIndex, posts.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  }, [currentIndex]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      setIsPlaying(!isPlaying);
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      handlePrevious();
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      handleNext();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentIndex]);

  if (!currentPost) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] text-muted-foreground">
        No hay videos disponibles
      </div>
    );
  }

  const videoUrl = currentPost.media_url;
  const user = currentPost.profiles;

  return (
    <div ref={containerRef} className="relative h-[calc(100vh-8rem)] bg-black overflow-hidden">
      {/* Video */}
      <div className="relative w-full h-full flex items-center justify-center">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full object-contain"
            loop
            playsInline
            onClick={handleVideoClick}
            onEnded={handleNext}
          />
        ) : (
          <div className="text-white text-center">
            <p>Video no disponible</p>
          </div>
        )}

        {/* Play/Pause overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 text-white hover:bg-black/70 h-16 w-16"
              onClick={() => setIsPlaying(true)}
            >
              <Play className="h-8 w-8" />
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="bg-black/50 text-white hover:bg-black/70"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* User info and actions */}
      <div className="absolute bottom-4 left-4 right-4 text-white">
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-12 w-12 border-2 border-white">
            <AvatarImage src={user?.avatar_url} alt={user?.username} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {(user?.username || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">
                {user?.username || 'Usuario'}
              </h3>
              <span className="text-xs text-gray-300">
                {formatDistanceToNow(new Date(currentPost.created_at), {
                  addSuffix: true,
                  locale: es
                })}
              </span>
            </div>
            
            {currentPost.content && (
              <p className="text-sm text-gray-100 mb-2 line-clamp-3">
                {currentPost.content}
              </p>
            )}
          </div>
        </div>

        {/* Reactions */}
        <div className="bg-black/20 rounded-lg p-2 backdrop-blur-sm">
          <ReactionButtons 
            post={currentPost} 
            onReaction={(type) => onReaction?.(currentPost.id, type)}
          />
        </div>
      </div>

      {/* Navigation indicators */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-2">
        {posts.map((_, index) => (
          <button
            key={index}
            className={`w-1 h-8 rounded-full transition-all ${
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
            onClick={() => {
              setCurrentIndex(index);
              setIsPlaying(true);
            }}
          />
        ))}
      </div>

      {/* Swipe areas for mobile */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-0 right-0 h-1/2 pointer-events-auto"
          onClick={handlePrevious}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-auto"
          onClick={handleNext}
        />
      </div>
    </div>
  );
});