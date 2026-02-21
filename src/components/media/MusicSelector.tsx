import React, { useState, useEffect, useCallback } from 'react';
import { Search, Music, Clock, TrendingUp, Heart, X, Play, Pause } from 'lucide-react';
import { MusicLibraryAPI, MusicTrack, MusicCategory, BestMoment } from '@/lib/api/music/music-library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface MusicSelectorProps {
  onTrackSelect: (track: MusicTrack, bestMoment?: BestMoment) => void;
  onClose?: () => void;
  className?: string;
}

type TabType = 'search' | 'popular' | 'categories' | 'favorites' | 'recent';

export function MusicSelector({ onTrackSelect, onClose, className = '' }: MusicSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<(MusicTrack & { audio_analysis: any })[]>([]);
  const [categories, setCategories] = useState<MusicCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load tracks based on active tab
  useEffect(() => {
    loadTracks();
  }, [activeTab, searchQuery, selectedCategory]);

  const loadCategories = async () => {
    try {
      const data = await MusicLibraryAPI.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTracks = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let data: (MusicTrack & { audio_analysis: any })[] = [];

      switch (activeTab) {
        case 'search':
          data = await MusicLibraryAPI.searchTracks(searchQuery, undefined, 20);
          break;
        case 'popular':
          data = await MusicLibraryAPI.getPopularTracks(20);
          break;
        case 'categories':
          if (selectedCategory) {
            data = await MusicLibraryAPI.getTracksByCategory(selectedCategory, 20);
          }
          break;
        case 'favorites':
          data = await MusicLibraryAPI.getUserFavorites(user.id);
          break;
        case 'recent':
          data = await MusicLibraryAPI.getRecentTracks(user.id, 20);
          break;
      }

      setTracks(data);
    } catch (error) {
      console.error('Error loading tracks:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las canciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSelect = async (track: MusicTrack & { audio_analysis: any }) => {
    if (!user) return;

    try {
      // Get best moment for the track
      const bestMoment = await MusicLibraryAPI.getBestMoment(track.id);
      
      // Track usage for recommendations
      await MusicLibraryAPI.trackUsage(user.id, track.id);
      
      // Stop any playing preview
      if (audioPreview) {
        audioPreview.pause();
        setAudioPreview(null);
        setCurrentlyPlaying(null);
      }
      
      onTrackSelect(track, bestMoment || undefined);
      onClose?.();
    } catch (error) {
      console.error('Error selecting track:', error);
      toast({
        title: "Error",
        description: "No se pudo seleccionar la canción",
        variant: "destructive"
      });
    }
  };

  const toggleFavorite = async (trackId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) return;

    try {
      if (favorites.includes(trackId)) {
        await MusicLibraryAPI.removeFromFavorites(user.id, trackId);
        setFavorites(prev => prev.filter(id => id !== trackId));
      } else {
        await MusicLibraryAPI.addToFavorites(user.id, trackId);
        setFavorites(prev => [...prev, trackId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const playPreview = async (track: MusicTrack, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Stop current preview if playing
    if (audioPreview) {
      audioPreview.pause();
      if (currentlyPlaying === track.id) {
        setAudioPreview(null);
        setCurrentlyPlaying(null);
        return;
      }
    }

    // Start new preview
    const previewUrl = track.preview_url || track.file_url;
    const audio = new Audio(previewUrl);
    
    audio.addEventListener('ended', () => {
      setAudioPreview(null);
      setCurrentlyPlaying(null);
    });

    try {
      await audio.play();
      setAudioPreview(audio);
      setCurrentlyPlaying(track.id);
    } catch (error) {
      console.error('Error playing preview:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const TrackCard = ({ track }: { track: MusicTrack & { audio_analysis: any } }) => (
    <Card 
      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
      onClick={() => handleTrackSelect(track)}
    >
      <div className="flex items-center space-x-3">
        {/* Cover Art */}
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
          {track.cover_art_url ? (
            <img 
              src={track.cover_art_url} 
              alt={track.title}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Music className="h-6 w-6 text-white" />
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {track.title}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {track.artist}
            {track.album && ` • ${track.album}`}
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {track.genre || 'Pop'}
            </Badge>
            <span className="text-xs text-gray-400">
              {formatDuration(track.duration)}
            </span>
            {track.audio_analysis?.bpm && (
              <span className="text-xs text-gray-400">
                {track.audio_analysis.bpm} BPM
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Play Preview */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => playPreview(track, e)}
            className="w-8 h-8 p-0"
          >
            {currentlyPlaying === track.id ? (
              <Pause size={14} />
            ) : (
              <Play size={14} />
            )}
          </Button>

          {/* Favorite */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => toggleFavorite(track.id, e)}
            className="w-8 h-8 p-0"
          >
            <Heart 
              size={14} 
              className={favorites.includes(track.id) ? 'fill-red-500 text-red-500' : ''}
            />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Seleccionar Música</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Buscar canciones, artistas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'search' as TabType, label: 'Buscar', icon: Search },
          { id: 'popular' as TabType, label: 'Popular', icon: TrendingUp },
          { id: 'categories' as TabType, label: 'Categorías', icon: Music },
          { id: 'favorites' as TabType, label: 'Favoritos', icon: Heart },
          { id: 'recent' as TabType, label: 'Recientes', icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === id
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'categories' && !selectedCategory && (
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: category.color || '#6B7280' }}
                    >
                      <Music className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-sm font-medium text-center">{category.name}</div>
                    {category.description && (
                      <div className="text-xs text-gray-500 text-center line-clamp-2">
                        {category.description}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {(activeTab !== 'categories' || selectedCategory) && (
          <ScrollArea className="h-96">
            <div className="p-4 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : tracks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron canciones
                </div>
              ) : (
                tracks.map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))
              )}
            </div>
          </ScrollArea>
        )}

        {selectedCategory && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={() => setSelectedCategory(null)}
              className="text-sm"
            >
              ← Volver a categorías
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
