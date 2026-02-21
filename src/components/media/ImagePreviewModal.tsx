// 📸 Image Preview Modal with Background Music
// Fullscreen image viewer with audio controls

import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';

interface ImagePreviewModalProps {
  image: File;
  audioFile?: File;
  audioMetadata?: {
    name: string;
    duration: number;
    size: number;
    type: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImagePreviewModal({ 
  image, 
  audioFile,
  audioMetadata,
  isOpen,
  onClose 
}: ImagePreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const url = audioFile ? URL.createObjectURL(audioFile) : '';
    audio.src = url;
    
    if (audioFile) {
      audio.addEventListener('ended', () => {
        setIsAudioPlaying(false);
      });
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [audioFile]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isAudioMuted ? 0 : audioVolume;
    }
  }, [audioVolume, isAudioMuted]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => prev + 90);
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(image);
    const a = document.createElement('a');
    a.href = url;
    a.download = image.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleAudioPlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isAudioPlaying) {
      audio.pause();
      setIsAudioPlaying(false);
    } else {
      audio.play();
      setIsAudioPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setAudioVolume(newVolume);
    setIsAudioMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleAudioMute = () => {
    const newMuted = !isAudioMuted;
    setIsAudioMuted(newMuted);
    if (audioRef.current) {
      audioRef.current.volume = newMuted ? 0 : audioVolume;
    }
  };

  const formatTime = (time: number) => {
    if (!audioMetadata?.duration) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
      <div className="relative max-w-6xl max-h-full bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vista Previa
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {image.name}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row">
          {/* Image Section */}
          <div className="flex-1 p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="relative max-w-full max-h-full">
              <img
                ref={imageRef}
                src={URL.createObjectURL(image)}
                alt={image.name}
                className="max-w-full max-h-full object-contain transition-transform duration-300"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`
                }}
              />
            </div>
          </div>

          {/* Audio Section */}
          {audioFile && (
            <div className="w-full lg:w-80 p-4 bg-purple-50 dark:bg-purple-900/20 border-l border-purple-200 dark:border-purple-800">
              <div className="space-y-4">
                {/* Audio Header */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Music className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {audioMetadata?.name || 'Audio'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {audioMetadata ? 
                        `${formatTime(0)} - ${formatTime(audioMetadata.duration)} • ${(audioFile.size / 1024 / 1024).toFixed(1)} MB` 
                        : 'Procesando...'
                      }
                    </div>
                  </div>
                </div>

                {/* Audio Controls */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={toggleAudioPlayPause}
                    className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors"
                  >
                    {isAudioPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowVolumeControls(!showVolumeControls)}
                      className="text-purple-500 hover:text-purple-700"
                    >
                      {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    
                    {showVolumeControls && (
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isAudioMuted ? 0 : audioVolume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, hsl(var(--primary)) ${(isAudioMuted ? 0 : audioVolume) * 100}%, hsl(var(--muted)) ${(isAudioMuted ? 0 : audioVolume) * 100}%)`
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Audio Progress */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>0:00</span>
                    <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: '0%' }}
                      />
                    </div>
                    <span>{formatTime(audioMetadata?.duration || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Image Controls */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Alejar"
            >
              <ZoomOut size={18} />
            </button>
            
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Acercar"
            >
              <ZoomIn size={18} />
            </button>
            
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Rotar"
            >
              <RotateCw size={18} />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(scale * 100)}%
            </span>
            
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Descargar"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
