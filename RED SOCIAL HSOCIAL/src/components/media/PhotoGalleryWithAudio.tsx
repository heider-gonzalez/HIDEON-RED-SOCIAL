// 📸🎵 Photo Gallery with Audio Integration
// Instagram-style gallery with background music support

import React, { useState, useRef } from 'react';
import { X, Upload, Music, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface PhotoGalleryWithAudioProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  audioFile?: File;
  onAudioChange: (audio: File | null) => void;
  audioMetadata?: {
    name: string;
    duration: number;
    size: number;
    type: string;
  } | null;
  className?: string;
}

export function PhotoGalleryWithAudio({ 
  images, 
  onImagesChange,
  audioFile,
  onAudioChange,
  audioMetadata,
  className = ''
}: PhotoGalleryWithAudioProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = [...images, ...files];
    onImagesChange(newImages);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onAudioChange(file);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    if (selectedImageIndex === index) {
      setSelectedImageIndex(null);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const draggedImage = images[draggedIndex];
    const newImages = [...images];
    newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);
    
    onImagesChange(newImages);
    setDraggedIndex(null);
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

  // Initialize audio
  React.useEffect(() => {
    if (audioFile && audioRef.current) {
      const url = URL.createObjectURL(audioFile);
      audioRef.current.src = url;
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioFile]);

  const formatTime = (time: number) => {
    if (!audioMetadata?.duration) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📸 Galería con Música
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Image Upload */}
          <label className="cursor-pointer bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2">
            <Upload size={16} />
            <span className="text-sm">Añadir fotos</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
          
          {/* Audio Upload */}
          <label className="cursor-pointer bg-purple-500 text-white px-3 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center space-x-2">
            <Music size={16} />
            <span className="text-sm">
              {audioFile ? 'Cambiar música' : 'Añadir música'}
            </span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Audio Player */}
      {audioFile && (
        <div className="mb-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Music className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {audioMetadata?.name || 'Audio seleccionado'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {audioMetadata ? 
                    `${formatTime(0)} - ${formatTime(audioMetadata.duration)} • ${(audioFile.size / 1024 / 1024).toFixed(1)} MB` 
                    : 'Procesando audio...'
                  }
                </div>
              </div>
            </div>
            
            {/* Audio Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleAudioPlayPause}
                className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700"
              >
                {isAudioPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={toggleAudioMute}
                  className="text-purple-500 hover:text-purple-700"
                >
                  {isAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isAudioMuted ? 0 : audioVolume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) ${(isAudioMuted ? 0 : audioVolume) * 100}%, hsl(var(--muted)) ${(isAudioMuted ? 0 : audioVolume) * 100}%)`
                  }}
                />
                <span className="text-xs text-purple-500 w-8">
                  {Math.round((isAudioMuted ? 0 : audioVolume) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 ${
              draggedIndex === index ? 'border-purple-500 opacity-50' : 'border-gray-200 dark:border-gray-700'
            }`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => setSelectedImageIndex(index)}
          >
            {/* Image Preview */}
            <img
              src={URL.createObjectURL(image)}
              alt={`Image ${index + 1}`}
              className="w-full h-32 object-cover"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 transition-opacity duration-200"
              >
                <X size={14} />
              </button>
            </div>
            
            {/* Selection Indicator */}
            {selectedImageIndex === index && (
              <div className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none" />
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {images.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500">
            <Upload className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No hay fotos aún</p>
            <p className="text-sm">Arrastra fotos aquí o usa el botón de arriba</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        💡 Arrastra las fotos para reordenar • Click en una foto para ver en grande • La música continuará reproduciendo mientras navegas
      </div>
    </div>
  );
}
