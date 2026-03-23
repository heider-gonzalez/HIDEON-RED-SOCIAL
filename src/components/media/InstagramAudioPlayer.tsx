// 🎵 Instagram-style Audio Player
// Minimalist design like Instagram stories
// Shows album art or music icon
// Play/pause with waveform visualization
// Perfect for posts with background music

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';
import {
  getSoundEnabled,
  setNowPlayingVideoId,
  setSoundEnabled,
  subscribeNowPlayingVideoId,
  subscribeSoundEnabled,
} from '@/lib/media/global-media';
import { getHybridUrl } from '@/lib/hybrid-url';

interface InstagramAudioPlayerProps {
  audioUrl?: string;
  audioMetadata?: {
    name: string;
    duration: number;
    size: number;
    type: string;
  } | null;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
}

export function InstagramAudioPlayer({ 
  audioUrl,
  audioMetadata, 
  className = '',
  autoPlay = false,
  loop = false 
}: InstagramAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [soundEnabled, setSoundEnabledState] = useState(() => getSoundEnabled());
  const [isMuted, setIsMuted] = useState(() => !getSoundEnabled());
  const [isLoading, setIsLoading] = useState(false);
  const [isInView, setIsInView] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceIdRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
      ? (crypto as any).randomUUID()
      : `iap_${Math.random().toString(16).slice(2)}_${Date.now()}`
  );

  useEffect(() => {
    return subscribeSoundEnabled((enabled) => {
      setSoundEnabledState(enabled);
      setIsMuted(!enabled);
    });
  }, []);

  useEffect(() => {
    return subscribeNowPlayingVideoId((id) => {
      if (!id) return;
      const prefix = `${instanceIdRef.current}:`;
      if (id.startsWith(prefix)) return;

      const audio = audioRef.current;
      if (!audio) return;
      try {
        audio.pause();
      } catch {
        // ignore
      }
      setIsPlaying(false);
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        setIsInView(Boolean(e?.isIntersecting));
      },
      { threshold: 0.6 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audioUrl || !audio) return;

    // If not visible or sound disabled, pause
    if (!isInView || !soundEnabled) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
      setIsPlaying(false);
      return;
    }

    // Try to autoplay when visible.
    // Autoplay with sound is often blocked: start muted then unmute after playback starts.
    try {
      audio.muted = true;
    } catch {
      // ignore
    }

    setNowPlayingVideoId(`${instanceIdRef.current}:audio`);
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        try {
          // Only unmute if global sound is enabled
          audio.muted = !soundEnabled;
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // ignore: requires user gesture
      });
  }, [audioUrl, isInView, soundEnabled]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      const audio = audioRef.current;
      if (!audio) return;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
      setIsPlaying(false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const handleLoading = () => setIsLoading(true);
    const handleLoaded = () => setIsLoading(false);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioData);
    audio.addEventListener('loadstart', handleLoading);
    audio.addEventListener('canplay', handleLoaded);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioData);
      audio.removeEventListener('loadstart', handleLoading);
      audio.removeEventListener('canplay', handleLoaded);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      setNowPlayingVideoId(`${instanceIdRef.current}:audio`);
      audio.play().catch(() => {
        // Play was prevented (browser policy)
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    const shouldMute = newVolume === 0;
    setIsMuted(shouldMute);
    if (shouldMute) {
      setSoundEnabled(false);
    } else {
      setSoundEnabled(true);
    }
  };

  const toggleMute = () => {
    setSoundEnabled(!soundEnabled);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const displayName = audioMetadata?.name || 'Música';
  const displayDuration = audioMetadata?.duration || duration;

  return (
    <div
      ref={containerRef}
      className={`bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 ${className}`}
    >
      {/* Hidden audio element - getHybridUrl convierte Supabase→R2 post-migración */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={getHybridUrl(audioUrl) || audioUrl}
          loop={loop}
          preload="metadata"
        />
      )}

      {/* Instagram-style Audio Player */}
      <div className="flex items-center space-x-3">
        {/* Album Art / Music Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Music className="h-6 w-6 text-white" />
        </div>

        {/* Audio Info and Controls */}
        <div className="flex-1 min-w-0">
          {/* Track Name */}
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {displayName}
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(currentTime)}
            </span>
            
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #E91E63 ${(currentTime / duration) * 100}%, #E5E7EB ${(currentTime / duration) * 100}%)`
              }}
            />
            
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(displayDuration)}
            </span>
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={16} className="text-purple-500" />
          ) : (
            <Play size={16} className="text-purple-500 ml-0.5" />
          )}
        </button>

        {/* Volume Control */}
        <div className="flex items-center space-x-1">
          <button
            onClick={toggleMute}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #E91E63 ${(isMuted ? 0 : volume) * 100}%, #E5E7EB ${(isMuted ? 0 : volume) * 100}%)`
            }}
          />
        </div>
      </div>

      {/* Instagram-style Music Indicator */}
      <div className="mt-2 flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {isPlaying ? 'Reproduciendo música' : 'Música de fondo'}
        </span>
      </div>
    </div>
  );
}
