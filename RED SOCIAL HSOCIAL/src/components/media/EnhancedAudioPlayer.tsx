// 🎵🎬 Enhanced Audio Player with Video Mixing Support
// Background music for posts with videos
// Volume controls for both audio and video
// Mute/unmute functionality
// Professional mixing interface

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Video } from 'lucide-react';

interface EnhancedAudioPlayerProps {
  audioUrl?: string;
  videoUrl?: string;
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

export function EnhancedAudioPlayer({ 
  audioUrl, 
  videoUrl,
  audioMetadata, 
  className = '',
  autoPlay = false,
  loop = false 
}: EnhancedAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [videoVolume, setVideoVolume] = useState(1);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine which media is primary
  const hasAudio = !!audioUrl;
  const hasVideo = !!videoUrl;
  const isMixed = hasAudio && hasVideo;

  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    
    if (!audio && !video) return;

    const setMediaData = () => {
      const audioDuration = audio?.duration || 0;
      const videoDuration = video?.duration || 0;
      const maxDuration = Math.max(audioDuration, videoDuration);
      setDuration(maxDuration);
      setCurrentTime(audio?.currentTime || video?.currentTime || 0);
    };

    const handleLoading = () => setIsLoading(true);
    const handleLoaded = () => setIsLoading(false);

    // Audio events
    if (audio) {
      audio.addEventListener('loadeddata', setMediaData);
      audio.addEventListener('timeupdate', setMediaData);
      audio.addEventListener('loadstart', handleLoading);
      audio.addEventListener('canplay', handleLoaded);
    }

    // Video events
    if (video) {
      video.addEventListener('loadeddata', setMediaData);
      video.addEventListener('timeupdate', setMediaData);
      video.addEventListener('loadstart', handleLoading);
      video.addEventListener('canplay', handleLoaded);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('loadeddata', setMediaData);
        audio.removeEventListener('timeupdate', setMediaData);
        audio.removeEventListener('loadstart', handleLoading);
        audio.removeEventListener('canplay', handleLoaded);
      }
      if (video) {
        video.removeEventListener('loadeddata', setMediaData);
        video.removeEventListener('timeupdate', setMediaData);
        video.removeEventListener('loadstart', handleLoading);
        video.removeEventListener('canplay', handleLoaded);
      }
    };
  }, [hasAudio, hasVideo]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isAudioMuted ? 0 : audioVolume;
    }
    if (videoRef.current) {
      videoRef.current.volume = isVideoMuted ? 0 : videoVolume;
    }
  }, [audioVolume, videoVolume, isAudioMuted, isVideoMuted]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    const video = videoRef.current;
    
    if (!audio && !video) return;

    if (isPlaying) {
      audio?.pause();
      video?.pause();
    } else {
      // Sync playback
      const promises: Promise<void>[] = [];
      
      if (audio) {
        promises.push(audio.play());
      }
      if (video) {
        promises.push(video.play());
      }
      
      Promise.all(promises).catch(() => {
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
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleAudioVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setAudioVolume(newVolume);
    setIsAudioMuted(newVolume === 0);
  };

  const handleVideoVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVideoVolume(newVolume);
    setIsVideoMuted(newVolume === 0);
  };

  const toggleAudioMute = () => {
    setIsAudioMuted(!isAudioMuted);
  };

  const toggleVideoMute = () => {
    setIsVideoMuted(!isVideoMuted);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const displayName = audioMetadata?.name || 'Audio';
  const displayDuration = audioMetadata?.duration || duration;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Hidden media elements */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          loop={loop}
          preload="metadata"
        />
      )}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          loop={loop}
          preload="metadata"
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {hasAudio && (
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Music className="h-4 w-4 text-purple-600" />
              </div>
            )}
            {hasVideo && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Video className="h-4 w-4 text-blue-600" />
              </div>
            )}
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {isMixed ? 'Video + Música' : (hasAudio ? displayName : 'Video')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(displayDuration)} • {audioMetadata ? `${(audioMetadata.size / 1024 / 1024).toFixed(1)} MB` : ''}
            </div>
          </div>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} />
          )}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-10">
            {formatTime(currentTime)}
          </span>
          
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) ${(currentTime / duration) * 100}%)`
            }}
          />
          
          <span className="text-xs text-gray-500 dark:text-gray-400 w-10">
            {formatTime(displayDuration)}
          </span>
        </div>
      </div>

      {/* Volume Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowVolumeControls(!showVolumeControls)}
          className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {hasAudio && (
            <>
              {isAudioMuted || audioVolume === 0 ? (
                <VolumeX size={16} />
              ) : (
                <Volume2 size={16} />
              )}
              <span className="text-xs">🎵</span>
            </>
          )}
          
          {hasVideo && (
            <>
              {isVideoMuted || videoVolume === 0 ? (
                <VolumeX size={16} />
              ) : (
                <Volume2 size={16} />
              )}
              <span className="text-xs">🎬</span>
            </>
          )}
        </button>

        {/* Expanded Volume Controls */}
        {showVolumeControls && (
          <div className="flex items-center space-x-4">
            {hasAudio && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleAudioMute}
                  className="text-purple-500 hover:text-purple-700"
                >
                  {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isAudioMuted ? 0 : audioVolume}
                  onChange={handleAudioVolumeChange}
                  className="w-20 h-1 bg-purple-200 dark:bg-purple-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) ${(isAudioMuted ? 0 : audioVolume) * 100}%, hsl(var(--muted)) ${(isAudioMuted ? 0 : audioVolume) * 100}%)`
                  }}
                />
                <span className="text-xs text-purple-500 w-8">
                  {Math.round((isAudioMuted ? 0 : audioVolume) * 100)}%
                </span>
              </div>
            )}

            {hasVideo && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleVideoMute}
                  className="text-blue-500 hover:text-blue-700"
                >
                  {isVideoMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isVideoMuted ? 0 : videoVolume}
                  onChange={handleVideoVolumeChange}
                  className="w-20 h-1 bg-blue-200 dark:bg-blue-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) ${(isVideoMuted ? 0 : videoVolume) * 100}%, hsl(var(--muted)) ${(isVideoMuted ? 0 : videoVolume) * 100}%)`
                  }}
                />
                <span className="text-xs text-blue-500 w-8">
                  {Math.round((isVideoMuted ? 0 : videoVolume) * 100)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        💡 {isMixed ? 'Controla volumen de música y video por separado' : 'Usa los controles de volumen para ajustar el audio'}
      </div>
    </div>
  );
}
