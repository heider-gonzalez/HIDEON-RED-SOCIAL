// 🎵 Instagram-style Audio Waveform Editor
// Interactive waveform visualization with clip selection

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Scissors } from 'lucide-react';

interface AudioWaveformProps {
  audioFile: File;
  onClipSelect: (startTime: number, endTime: number) => void;
  startTime?: number;
  endTime?: number;
  maxDuration?: number; // Max clip duration in seconds
}

export function AudioWaveform({ 
  audioFile, 
  onClipSelect, 
  startTime = 0, 
  endTime = 30,
  maxDuration = 60 
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate waveform from audio file
  const generateWaveform = useCallback(async (file: File) => {
    setIsLoading(true);
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const rawData = audioBuffer.getChannelData(0);
    const samples = 500; // Number of samples to display
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }
    
    // Normalize data
    const multiplier = Math.pow(Math.max(...filteredData), -1);
    const normalizedData = filteredData.map(n => n * multiplier);
    
    setWaveformData(normalizedData);
    setIsLoading(false);
  }, []);

  // Draw waveform on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform
    const barWidth = width / waveformData.length;
    
    waveformData.forEach((value, index) => {
      const barHeight = value * height * 0.8;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      
      // Determine color based on selection
      const time = (index / waveformData.length) * duration;
      const isSelected = time >= startTime && time <= endTime;
      
      ctx.fillStyle = isSelected ? '#8b5cf6' : '#e5e7eb'; // Purple for selected, gray for unselected
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
    
    // Draw selection handles
    const startX = (startTime / duration) * width;
    const endX = (endTime / duration) * width;
    
    // Start handle
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(startX - 2, 0, 4, height);
    
    // End handle
    ctx.fillRect(endX - 2, 0, 4, height);
    
    // Selection overlay
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.fillRect(startX, 0, endX - startX, height);
  }, [waveformData, startTime, endTime, duration]);

  // Handle mouse events for selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvas.width) * duration;
    
    // Determine if closer to start or end
    const distToStart = Math.abs(time - startTime);
    const distToEnd = Math.abs(time - endTime);
    
    setIsDragging(distToStart < distToEnd ? 'start' : 'end');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let time = (x / canvas.width) * duration;
    
    // Constrain to valid range
    time = Math.max(0, Math.min(duration, time));
    
    if (isDragging === 'start') {
      const newStartTime = Math.min(time, endTime - 1); // Ensure at least 1s difference
      onClipSelect(newStartTime, endTime);
    } else if (isDragging === 'end') {
      const newEndTime = Math.max(time, startTime + 1); // Ensure at least 1s difference
      const constrainedEnd = Math.min(newEndTime, startTime + maxDuration); // Enforce max duration
      onClipSelect(startTime, constrainedEnd);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  // Play/pause selected clip
  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.currentTime = startTime;
      audio.play();
      setIsPlaying(true);
    }
  };

  // Check if playback reached end time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Stop at end time
      if (audio.currentTime >= endTime && isPlaying) {
        audio.pause();
        audio.currentTime = startTime;
        setIsPlaying(false);
      }
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', () => {
      audio.currentTime = startTime;
      setIsPlaying(false);
    });
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', () => {
        audio.currentTime = startTime;
        setIsPlaying(false);
      });
    };
  }, [startTime, endTime, isPlaying]);

  // Initialize audio and waveform
  useEffect(() => {
    generateWaveform(audioFile);
    
    const audio = audioRef.current;
    if (!audio) return;
    
    const url = URL.createObjectURL(audioFile);
    audio.src = url;
    
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      // Auto-select reasonable default if not provided
      if (startTime === 0 && endTime === 30) {
        const defaultEnd = Math.min(30, audio.duration);
        onClipSelect(0, defaultEnd);
      }
    });
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioFile, generateWaveform, onClipSelect]);

  // Redraw when data changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const clipDuration = endTime - startTime;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Scissors className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {audioFile.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Clip: {formatTime(startTime)} - {formatTime(endTime)} ({formatTime(clipDuration)})
            </div>
          </div>
        </div>
        
        <button
          onClick={togglePlayback}
          disabled={isLoading}
          className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors disabled:opacity-50"
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

      {/* Waveform Canvas */}
      <div className="relative mb-4">
        {isLoading ? (
          <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Generando waveform...
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={600}
            height={100}
            className="w-full h-24 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        )}
      </div>

      {/* Time Display */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Inicio: {formatTime(startTime)}</span>
        <span>Duración: {formatTime(clipDuration)}</span>
        <span>Fin: {formatTime(endTime)}</span>
      </div>

      {/* Instructions */}
      <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        💡 Arrastra los handles para seleccionar el clip • Máximo {maxDuration}s
      </div>
    </div>
  );
}
