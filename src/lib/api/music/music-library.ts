type ItunesTrack = {
  wrapperType?: string;
  kind?: string;
  trackId: number;
  artistName: string;
  collectionName?: string;
  trackName: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
};

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration: number;
  file_url: string;
  cover_art_url?: string;
  preview_url?: string;
  is_active: boolean;
  play_count: number;
  popularity_score: number;
  created_at: string;
  updated_at: string;
}

export interface AudioAnalysis {
  id: string;
  track_id: string;
  bpm?: number;
  key_signature?: string;
  energy_level?: number;
  danceability?: number;
  valence?: number;
  chorus_start?: number;
  chorus_end?: number;
  drop_start?: number;
  drop_end?: number;
  bridge_start?: number;
  bridge_end?: number;
  peak_moments?: number[];
  waveform_data?: any;
  created_at: string;
  updated_at: string;
}

export interface MusicCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface BestMoment {
  start_time: number;
  end_time: number;
  moment_type: 'chorus' | 'drop' | 'bridge' | 'intro';
}

export class MusicLibraryAPI {
  static async itunesSearchTracks(term: string, limit = 20, country = 'US'): Promise<ItunesTrack[]> {
    const url = new URL('/api/itunes/search', window.location.origin);
    url.searchParams.set('term', term || '');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('country', country);
    url.searchParams.set('entity', 'song');

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || 'iTunes search failed');
    }
    const data = await resp.json();
    return (data?.results || []) as ItunesTrack[];
  }

  static async itunesLookupTrack(trackId: string, country = 'US'): Promise<ItunesTrack | null> {
    const url = new URL('/api/itunes/lookup', window.location.origin);
    url.searchParams.set('id', trackId);
    url.searchParams.set('country', country);

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || 'iTunes lookup failed');
    }
    const data = await resp.json();
    const results = (data?.results || []) as ItunesTrack[];
    const first = results.find((r) => r.kind === 'song' && typeof r.trackId === 'number');
    return first || null;
  }

  static async itunesTopSongs(limit = 50, country = 'us'): Promise<Array<{ name: string; artistName: string; url?: string; artworkUrl100?: string; genreNames?: string[] }>> {
    const url = new URL('/api/itunes/top', window.location.origin);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('country', country);

    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || 'iTunes top songs failed');
    }
    const data = await resp.json();
    const results = (data?.feed?.results || []) as any[];
    return results;
  }

  static itunesTrackToMusicTrack(t: ItunesTrack): MusicTrack {
    const durationSeconds = Math.round(((t.trackTimeMillis || 0) / 1000) || 0);
    return {
      id: String(t.trackId),
      title: t.trackName,
      artist: t.artistName,
      album: t.collectionName,
      genre: t.primaryGenreName,
      duration: durationSeconds,
      file_url: t.previewUrl || '',
      cover_art_url: t.artworkUrl100,
      preview_url: t.previewUrl,
      is_active: Boolean(t.previewUrl),
      play_count: 0,
      popularity_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  static normalizeCategoryName(name: string) {
    return (name || '').trim();
  }

  static defaultCategories(): MusicCategory[] {
    const names = ['Pop', 'Latin', 'Hip-Hop/Rap', 'Rock', 'Electronic', 'R&B/Soul', 'Reggaeton', 'Indie'];
    return names.map((n, idx) => ({
      id: n.toLowerCase(),
      name: n,
      description: undefined,
      icon: undefined,
      color: undefined,
      sort_order: idx,
      is_active: true,
      created_at: new Date().toISOString(),
    }));
  }

  static getLocalStorageKey(key: string) {
    return `hsocial_music_${key}`;
  }

  static getLocalList(key: string): string[] {
    try {
      const raw = localStorage.getItem(this.getLocalStorageKey(key));
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  static setLocalList(key: string, ids: string[]) {
    localStorage.setItem(this.getLocalStorageKey(key), JSON.stringify(ids));
  }

  // Search music tracks
  static async searchTracks(query: string, genre?: string, limit = 20) {
    const q = query?.trim() ? query.trim() : (genre?.trim() ? genre.trim() : 'music');
    const tracks = await this.itunesSearchTracks(q, limit);
    return tracks
      .filter((t) => Boolean(t.previewUrl))
      .map((t) => ({
        ...this.itunesTrackToMusicTrack(t),
        audio_analysis: null,
      }));
  }

  // Get popular tracks
  static async getPopularTracks(limit = 20) {
    const top = await this.itunesTopSongs(Math.max(limit, 20));
    const seedTerms = top
      .map((r) => `${r.name} ${r.artistName}`)
      .slice(0, Math.min(limit, 10));

    const results: (MusicTrack & { audio_analysis: AudioAnalysis | null })[] = [];
    for (const term of seedTerms) {
      if (results.length >= limit) break;
      const found = await this.itunesSearchTracks(term, 5);
      for (const t of found) {
        if (results.length >= limit) break;
        if (!t.previewUrl) continue;
        results.push({ ...this.itunesTrackToMusicTrack(t), audio_analysis: null });
      }
    }

    const uniqueById = new Map<string, MusicTrack & { audio_analysis: AudioAnalysis | null }>();
    results.forEach((t) => uniqueById.set(t.id, t));
    return Array.from(uniqueById.values()).slice(0, limit);
  }

  // Get tracks by category
  static async getTracksByCategory(categoryName: string, limit = 20) {
    const genre = this.normalizeCategoryName(categoryName) || 'Pop';
    const tracks = await this.itunesSearchTracks(genre, limit);
    return tracks
      .filter((t) => Boolean(t.previewUrl))
      .map((t) => ({
        ...this.itunesTrackToMusicTrack(t),
        audio_analysis: null,
      }));
  }

  // Get all categories
  static async getCategories() {
    return this.defaultCategories();
  }

  // Get user's favorite tracks
  static async getUserFavorites(userId: string) {
    const ids = this.getLocalList(`favorites_${userId}`);
    if (ids.length === 0) return [];
    const unique = Array.from(new Set(ids)).slice(0, 20);
    const results: (MusicTrack & { audio_analysis: AudioAnalysis | null })[] = [];
    for (const id of unique) {
      try {
        const t = await this.itunesLookupTrack(id);
        if (t?.previewUrl) results.push({ ...this.itunesTrackToMusicTrack(t), audio_analysis: null });
      } catch {
        continue;
      }
    }
    return results;
  }

  // Add track to favorites
  static async addToFavorites(userId: string, trackId: string) {
    const key = `favorites_${userId}`;
    const ids = this.getLocalList(key);
    if (!ids.includes(trackId)) ids.unshift(trackId);
    this.setLocalList(key, ids.slice(0, 200));
  }

  // Remove track from favorites
  static async removeFromFavorites(userId: string, trackId: string) {
    const key = `favorites_${userId}`;
    const ids = this.getLocalList(key).filter((id) => id !== trackId);
    this.setLocalList(key, ids);
  }

  // Get user's recently used tracks
  static async getRecentTracks(userId: string, limit = 10) {
    const ids = this.getLocalList(`recent_${userId}`).slice(0, limit);
    if (ids.length === 0) return [];
    const unique = Array.from(new Set(ids));
    const results: (MusicTrack & { audio_analysis: AudioAnalysis | null })[] = [];
    for (const id of unique) {
      try {
        const t = await this.itunesLookupTrack(id);
        if (t?.previewUrl) results.push({ ...this.itunesTrackToMusicTrack(t), audio_analysis: null });
      } catch {
        continue;
      }
    }
    return results;
  }

  // Track usage and update popularity
  static async trackUsage(userId: string, trackId: string) {
    const key = `recent_${userId}`;
    const ids = this.getLocalList(key);
    const next = [trackId, ...ids.filter((id) => id !== trackId)];
    this.setLocalList(key, next.slice(0, 200));
  }

  // Get best moment for a track
  static async getBestMoment(trackId: string): Promise<BestMoment | null> {
    void trackId;
    return null;
  }

  // Get track by ID
  static async getTrackById(trackId: string) {
    const t = await this.itunesLookupTrack(trackId);
    if (!t?.previewUrl) throw new Error('Track not found or no preview available');
    return { ...this.itunesTrackToMusicTrack(t), audio_analysis: null } as MusicTrack & { audio_analysis: AudioAnalysis | null };
  }

  // Get trending tracks (most played in last 7 days)
  static async getTrendingTracks(limit = 20) {
    return this.getPopularTracks(limit);
  }

  // Get recommended tracks based on user preferences
  static async getRecommendedTracks(userId: string, limit = 20) {
    void userId;
    return this.getPopularTracks(limit);
  }
}
