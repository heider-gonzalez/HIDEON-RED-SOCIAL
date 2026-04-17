import { supabase } from "@/integrations/supabase/client";
import { Post } from "@/types/post";
import { getAuthUser } from "@/lib/auth/auth-store";

export interface UserInteractionData {
  id: string;
  user_id: string;
  post_id: string;
  interaction_type: 'view' | 'like' | 'comment' | 'share' | 'save';
  duration_seconds?: number;
  created_at: string;
  author_id?: string;
  post_type?: string;
  content_category?: string;
}

export interface PersonalizedScore {
  postId: string;
  score: number;
  reasons: string[];
  category: 'high_engagement' | 'trending' | 'personalized' | 'diverse' | 'fresh';
}

export class PersonalizedFeedAlgorithm {
  private static instance: PersonalizedFeedAlgorithm;
  
  static getInstance(): PersonalizedFeedAlgorithm {
    if (!PersonalizedFeedAlgorithm.instance) {
      PersonalizedFeedAlgorithm.instance = new PersonalizedFeedAlgorithm();
    }
    return PersonalizedFeedAlgorithm.instance;
  }

  /**
   * Algoritmo principal tipo TikTok - rankea posts basado en múltiples factores
   */
  async generatePersonalizedFeed(posts: Post[], userId: string): Promise<Post[]> {
    try {
      // 1. Obtener datos de interacciones del usuario
      const userInteractions = await this.getUserInteractionHistory(userId);
      
      // 2. Calcular scores personalizados para cada post
      const scoredPosts = await Promise.all(
        posts.map(async (post) => {
          const score = await this.calculatePostScore(post, userId, userInteractions);
          return { post, score };
        })
      );

      // 3. Ordenar por score pero con diversificación
      const rankedPosts = this.diversifyFeed(scoredPosts);

      // 4. Aplicar estrategia de engagement (posts frescos al principio)
      return this.applyEngagementStrategy(rankedPosts);

    } catch (error) {
      console.error('Error generating personalized feed:', error);
      // Fallback: orden cronológico
      return posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }

  /**
   * Calcula score personalizado para un post específico
   */
  private async calculatePostScore(
    post: Post, 
    userId: string, 
    userInteractions: UserInteractionData[]
  ): Promise<PersonalizedScore> {
    let score = 0;
    const reasons: string[] = [];

    // Factor 1: Engagement Score (30% peso)
    const engagementScore = this.calculateEngagementScore(post);
    score += engagementScore * 0.3;
    if (engagementScore > 50) reasons.push('Alto engagement');

    // Factor 2: Relevancia Personal (35% peso)
    const personalRelevance = this.calculatePersonalRelevance(post, userInteractions, userId);
    score += personalRelevance * 0.35;
    if (personalRelevance > 70) reasons.push('Contenido personalizado');

    // Factor 3: Factor Temporal (20% peso)
    const recencyScore = this.calculateRecencyScore(post.created_at);
    score += recencyScore * 0.2;
    if (recencyScore > 80) reasons.push('Contenido reciente');

    // Factor 4: Diversidad de Autor (10% peso)
    const authorDiversity = await this.calculateAuthorDiversity(post.user_id || '', userInteractions);
    score += authorDiversity * 0.1;
    if (authorDiversity > 60) reasons.push('Nuevo creador');

    // Factor 5: Trending Factor (5% peso)
    const trendingScore = await this.calculateTrendingScore(post);
    score += trendingScore * 0.05;
    if (trendingScore > 90) reasons.push('Trending');

    // Determinar categoría
    let category: PersonalizedScore['category'] = 'personalized';
    if (engagementScore > 80) category = 'high_engagement';
    if (trendingScore > 90) category = 'trending';
    if (recencyScore > 95) category = 'fresh';

    return {
      postId: post.id,
      score: Math.min(score, 100),
      reasons,
      category
    };
  }

  /**
   * Calcula engagement score basado en reacciones, comentarios, tiempo
   */
  private calculateEngagementScore(post: Post): number {
    const reactions = post.reactions_count || 0;
    const comments = post.comments_count || 0;
    
    // Score basado en interacciones
    const interactionScore = (reactions * 2 + comments * 3);
    
    // Factor de tiempo - posts más nuevos tienen bonificación
    const hoursOld = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
    const timeFactor = Math.max(0.1, 1 - (hoursOld / 168)); // Decay over a week
    
    return Math.min(100, interactionScore * timeFactor);
  }

  /**
   * Calcula relevancia personal basada en interacciones previas
   */
  private calculatePersonalRelevance(
    post: Post, 
    userInteractions: UserInteractionData[], 
    userId: string
  ): number {
    let relevanceScore = 40; // Base score

    // Factor autor - si el usuario interactúa frecuentemente con este autor
    const authorInteractions = userInteractions.filter(
      i => i.author_id === post.user_id
    ).length;
    
    if (authorInteractions > 0) {
      relevanceScore += Math.min(30, authorInteractions * 5);
    }

    // Factor tiempo de visualización promedio
    const avgViewTime = this.calculateAverageViewTime(userInteractions);
    if (avgViewTime > 10) { // Si ve contenido por más de 10 segundos en promedio
      relevanceScore += 10;
    }

    return Math.min(100, relevanceScore);
  }

  /**
   * Score de recencia - posts más nuevos tienen mayor score
   */
  private calculateRecencyScore(createdAt: string): number {
    const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    
    if (hoursOld < 1) return 100;
    if (hoursOld < 6) return 90;
    if (hoursOld < 24) return 70;
    if (hoursOld < 72) return 50;
    if (hoursOld < 168) return 30; // 1 week
    
    return 10;
  }

  /**
   * Diversificación para evitar que vea siempre los mismos autores
   */
  private async calculateAuthorDiversity(authorId: string, userInteractions: UserInteractionData[]): Promise<number> {
    const recentAuthorViews = userInteractions
      .filter(i => i.author_id === authorId)
      .filter(i => {
        const daysSince = (Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7; // Last week
      });

    // Si ha visto mucho de este autor recientemente, reducir score
    if (recentAuthorViews.length > 10) return 20;
    if (recentAuthorViews.length > 5) return 40;
    if (recentAuthorViews.length > 2) return 60;
    
    return 80; // Nuevo autor o poca interacción reciente
  }

  /**
   * Calcula si un post está trending
   */
  private async calculateTrendingScore(post: Post): Promise<number> {
    try {
      const recentActivity = await supabase
        .from('reactions')
        .select('created_at')
        .eq('post_id', post.id)
        .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());

      if (!recentActivity.data) return 0;

      const recentCount = recentActivity.data.length;
      return Math.min(100, recentCount * 10);
    } catch {
      return 0;
    }
  }

  /**
   * Obtiene historial de interacciones del usuario
   */
  private async getUserInteractionHistory(userId: string): Promise<UserInteractionData[]> {
    try {
      const [reactions, comments] = await Promise.all([
        supabase
          .from('reactions')
          .select(`
            post_id, created_at,
            posts(user_id, post_type, content)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),

        supabase
          .from('comments')
          .select(`
            post_id, created_at,
            posts(user_id, post_type, content)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const interactions: UserInteractionData[] = [];

      (reactions.data as any[] | null | undefined)?.forEach((r: any) => {
        if (!r?.posts) return;
        interactions.push({
          id: `reaction_${r.post_id}`,
          user_id: userId,
          post_id: r.post_id,
          interaction_type: 'like',
          created_at: r.created_at,
          author_id: (r.posts as any).user_id,
          post_type: (r.posts as any).post_type,
        });
      });

      (comments.data as any[] | null | undefined)?.forEach((c: any) => {
        if (!c?.posts) return;
        interactions.push({
          id: `comment_${c.post_id}`,
          user_id: userId,
          post_id: c.post_id,
          interaction_type: 'comment',
          created_at: c.created_at,
          author_id: (c.posts as any).user_id,
          post_type: (c.posts as any).post_type,
        });
      });

      return interactions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      return [];
    }
  }

  /**
   * Calcula tiempo promedio de visualización
   */
  private calculateAverageViewTime(interactions: UserInteractionData[]): number {
    const viewTimes = interactions
      .filter(i => i.duration_seconds && i.duration_seconds > 0)
      .map(i => i.duration_seconds!);

    if (viewTimes.length === 0) return 5;
    return viewTimes.reduce((sum, time) => sum + time, 0) / viewTimes.length;
  }

  /**
   * Diversifica el feed para evitar monotonía
   */
  private diversifyFeed(scoredPosts: { post: Post; score: PersonalizedScore }[]): Post[] {
    const sorted = scoredPosts.sort((a, b) => b.score.score - a.score.score);
    const diversified: Post[] = [];
    const usedAuthors = new Set<string>();
    let authorRepeatCount = 0;

    for (const { post } of sorted) {
      const authorId = post.user_id || '';

      if (usedAuthors.has(authorId)) {
        authorRepeatCount++;
        if (authorRepeatCount > 2) continue;
      } else {
        authorRepeatCount = 0;
        usedAuthors.add(authorId);
      }

      diversified.push(post);

      if (diversified.length % 10 === 0) {
        usedAuthors.clear();
      }
    }

    return diversified;
  }

  /**
   * Aplica estrategia de engagement - mezcla contenido para maximizar tiempo en app
   */
  private applyEngagementStrategy(posts: Post[]): Post[] {
    const result: Post[] = [];
    const highEngagement = posts.slice(0, 3);
    const remaining = posts.slice(3);

    result.push(...highEngagement);

    for (let i = 0; i < remaining.length; i += 5) {
      const batch = remaining.slice(i, i + 5);
      result.push(...this.shuffleArray(batch));
    }

    return result;
  }

  /**
   * Utility: shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Trackea interacción para mejorar el algoritmo
   */
  async trackInteraction(
    postId: string,
    interactionType: UserInteractionData['interaction_type'],
    durationSeconds?: number
  ) {
    try {
      const user = getAuthUser();
      if (!user) return;

      if (interactionType === 'view') {
        try {
          await (supabase as any).rpc('track_post_view', {
            p_post_id: postId,
          });
        } catch {
          // ignore
        }
        return;
      }

      console.log('Tracking interaction:', { postId, interactionType, durationSeconds });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }
}

export const personalizedFeedAlgorithm = PersonalizedFeedAlgorithm.getInstance();