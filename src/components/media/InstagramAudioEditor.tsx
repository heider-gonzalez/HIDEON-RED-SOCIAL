import React, { useState, useRef, useEffect } from 'react';
import { X, Music, Play, Pause, Volume2, VolumeX, Scissors, Sparkles } from 'lucide-react';
import { MusicTrack, BestMoment } from '@/lib/api/music/music-library';
import { AudioAnalyzer, BestMomentAnalysis } from '@/lib/audio/audio-analyzer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface InstagramAudioEditorProps {
  track: MusicTrack;
  bestMoment?: BestMoment;
  videoDuration?: number;
  onAudioSelect: (audioData: {
    track: MusicTrack;
    startTime: number;
    endTime: number;
    audioUrl: string;
    duration: number;
  }) => void;
  onClose?: () => void;
  className?: string;
}

export function InstagramAudioEditor({
  track,
  bestMoment,
  videoDuration = 30,
  onAudioSelect,
  onClose,
  className = ''
}: InstagramAudioEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [startTime, setStartTime] = useState(bestMoment?.start_time || 0);
  const [endTime, setEndTime] = useState(bestMoment?.end_time || 30);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<BestMomentAnalysis | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [didInitSelection, setDidInitSelection] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Reset analysis state when changing track
    setAnalysis(null);
    setWaveform([]);
    setIsAnalyzing(false);
    setDidInitSelection(false);
  }, [track.id]);

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const audioSource = track.preview_url || track.file_url;
    if (!audioSource) return;

    audio.src = audioSource;
    audio.load();

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoaded = () => setIsLoading(false);
    const handleLoadStart = () => setIsLoading(true);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('canplay', handleLoaded);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('canplay', handleLoaded);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [track.preview_url, track.file_url]);

  useEffect(() => {
    if (!duration || !Number.isFinite(duration) || duration <= 0) return;

    // iTunes previews are usually 15s or 30s. We default to 30s if possible, otherwise 15s.
    const desiredDefaultLen = duration >= 30 ? 30 : duration >= 15 ? 15 : duration;
    const minLen = duration >= 15 ? 15 : Math.max(1, duration);

    const safeStart = clamp(startTime, 0, Math.max(0, duration - minLen));
    let safeEnd = clamp(endTime, safeStart + minLen, duration);

    // If we haven't initialized selection yet (new track), force a sane default.
    if (!didInitSelection && !bestMoment) {
      const defaultStart = 0;
      const defaultEnd = clamp(defaultStart + desiredDefaultLen, defaultStart + minLen, duration);
      setStartTime(defaultStart);
      setEndTime(defaultEnd);
      setDidInitSelection(true);
      return;
    }

    // Otherwise, just clamp any invalid ranges.
    if (safeStart !== startTime) setStartTime(safeStart);
    if (safeEnd !== endTime) setEndTime(safeEnd);
  }, [duration, startTime, endTime, didInitSelection, bestMoment]);

  useEffect(() => {
    // Auto-analyze track when component mounts
    if (track && !analysis) {
      analyzeTrack();
    }
  }, [track]);

  const analyzeTrack = async () => {
    setIsAnalyzing(true);
    try {
      const audioSource = track.preview_url || track.file_url;
      if (!audioSource) {
        setIsAnalyzing(false);
        return;
      }

      const analyzer = new AudioAnalyzer();
      analyzerRef.current = analyzer;

      // Prevent long analysis from blocking UX (especially with remote previews)
      const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
        return await Promise.race([
          p,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error('ANALYSIS_TIMEOUT')), ms)),
        ]);
      };

      await withTimeout(analyzer.loadAudioFile(audioSource), 8000);
      const analysisData = await withTimeout(analyzer.analyzeAudio(), 8000);
      setAnalysis(analysisData);
      setWaveform(analysisData.waveformPoints);

      // Auto-select best moment if not provided
      if (!bestMoment) {
        const bestMomentForVideo = AudioAnalyzer.getBestMomentForVideo(analysisData, videoDuration);
        setStartTime(bestMomentForVideo.startTime);
        setEndTime(bestMomentForVideo.endTime);
      }
    } catch (error) {
      console.error('Error analyzing track:', error);
      // Fallback: allow user to proceed without analysis/waveform
      setAnalysis(null);
      setWaveform([]);
      toast({
        title: 'Aviso',
        description: 'No se pudo analizar la canción. Puedes recortar manualmente sin forma de onda.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Start from the selected start time
      audio.currentTime = startTime;
      audio.play().catch(() => {
        // Play was prevented
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartTimeChange = (value: number[]) => {
    const newStartTime = value[0];
    const minLen = duration >= 15 ? 15 : Math.max(1, duration);
    const boundedStart = clamp(newStartTime, 0, Math.max(0, endTime - minLen));
    if (boundedStart < endTime) {
      setStartTime(boundedStart);
      if (audioRef.current && isPlaying) {
        audioRef.current.currentTime = boundedStart;
      }
    }
  };

  const handleEndTimeChange = (value: number[]) => {
    const newEndTime = value[0];
    const minLen = duration >= 15 ? 15 : Math.max(1, duration);
    const boundedEnd = clamp(newEndTime, startTime + minLen, duration || newEndTime);
    if (boundedEnd > startTime) {
      setEndTime(boundedEnd);
    }
  };

  const handleUseBestMoment = () => {
    if (analysis) {
      const bestMomentForVideo = AudioAnalyzer.getBestMomentForVideo(analysis, videoDuration);
      setStartTime(bestMomentForVideo.startTime);
      setEndTime(bestMomentForVideo.endTime);
      
      toast({
        title: "Mejor momento seleccionado",
        description: `Se seleccionó automáticamente el ${bestMomentForVideo.type === 'chorus' ? 'estribillo' : 
                     bestMomentForVideo.type === 'drop' ? 'drop' : 
                     bestMomentForVideo.type === 'bridge' ? 'puente' : 'momento peak'}`,
      });
    }
  };

  const handleConfirm = () => {
    const audioSource = track.preview_url || track.file_url;

    const audioData = {
      track,
      startTime,
      endTime,
      audioUrl: audioSource,
      duration: endTime - startTime
    };

    onAudioSelect(audioData);
    onClose?.();
  };

  const getMomentTypeLabel = (type: string) => {
    switch (type) {
      case 'chorus': return 'Estribillo';
      case 'drop': return 'Drop';
      case 'bridge': return 'Puente';
      case 'peak': return 'Momento Peak';
      default: return 'Intro';
    }
  };

  const currentMomentType = bestMoment?.moment_type || 
    (analysis ? AudioAnalyzer.getBestMomentForVideo(analysis, videoDuration).type : 'intro');

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Music className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{track.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{track.artist}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            {getMomentTypeLabel(currentMomentType)}
          </Badge>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Audio Player */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <audio
          ref={audioRef}
          src={track.preview_url || track.file_url}
          preload="metadata"
        />

        <div className="flex items-center space-x-3">
          {/* Play/Pause Button */}
          <Button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={20} className="text-white" />
            ) : (
              <Play size={20} className="text-white ml-0.5" />
            )}
          </Button>

          {/* Track Info and Progress */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                {/* Selection Range */}
                <div 
                  className="absolute top-0 h-full bg-purple-600 opacity-50 rounded-full"
                  style={{
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(duration)}
              </span>
            </div>

            {/* Waveform Visualization */}
            {waveform.length > 0 && (
              <div className="h-12 flex items-center space-x-0.5">
                {waveform.map((point, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-purple-200 dark:bg-purple-800 rounded-full"
                    style={{
                      height: `${point * 100}%`,
                      opacity: index >= Math.floor(startTime * waveform.length / duration) && 
                               index <= Math.floor(endTime * waveform.length / duration) ? 1 : 0.3
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Time Selection Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          {/* Auto-select Best Moment */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Selección automática</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseBestMoment}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Usar mejor momento'
              )}
            </Button>
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Inicio</label>
              <span className="text-sm text-gray-500">{formatTime(startTime)}</span>
            </div>
            <Slider
              value={[startTime]}
              onValueChange={handleStartTimeChange}
              max={Math.min(duration, endTime - 1)}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Fin</label>
              <span className="text-sm text-gray-500">{formatTime(endTime)}</span>
            </div>
            <Slider
              value={[endTime]}
              onValueChange={handleEndTimeChange}
              min={startTime + 1}
              max={duration}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Duration Info */}
          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <Scissors className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Duración seleccionada</span>
            </div>
            <Badge variant="secondary">
              {formatTime(endTime - startTime)}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Preview disponible</span>
            <span>{formatTime(duration || track.duration || 0)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {track.genre && (
            <Badge variant="outline" className="mr-2">
              {track.genre}
            </Badge>
          )}
          {analysis?.features.bpm && (
            <Badge variant="outline" className="mr-2">
              {analysis.features.bpm} BPM
            </Badge>
          )}
          {formatTime(track.duration)}
        </div>
        <Button
          onClick={handleConfirm}
          disabled={isLoading || isAnalyzing}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Confirmar selección
        </Button>
      </div>
    </div>
  );
}
