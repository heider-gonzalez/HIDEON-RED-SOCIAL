
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Users, Briefcase, Heart, MessageCircle, Building, TrendingUp, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/pages/Profile";

interface ProfileStatsProps {
  profile: Profile;
  followersCount: number;
  postsCount?: number;
  followingCount?: number;
}

interface ExtendedStats {
  total_views: number;
  project_views: number;
  profile_views: number;
  unique_visitors: number;
  company_views: number;
  total_projects: number;
  completed_projects: number;
  total_reactions: number;
  total_comments: number;
  last_updated: string;
}

export function ProfileStats({ 
  profile,
  followersCount,
  postsCount = 0,
  followingCount = 0
}: ProfileStatsProps) {
  const [extendedStats, setExtendedStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadExtendedStats();
    }
  }, [profile?.id]);

  const loadExtendedStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const defaultStats: ExtendedStats = {
        total_views: 0,
        project_views: 0,
        profile_views: 0,
        unique_visitors: 0,
        company_views: 0,
        total_projects: postsCount,
        completed_projects: 0,
        total_reactions: 0,
        total_comments: 0,
        last_updated: new Date().toISOString()
      };
      
      const query = supabase
        .from('profile_stats')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      const timeout = new Promise<{ data: null; error: { message: string; code: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: 'timeout', code: 'TIMEOUT' } }), 3000);
      });

      const { data, error } = (await Promise.race([query, timeout])) as any;

      if (error) {
        if (error.code === 'PGRST116' || error.code === 'TIMEOUT') {
          setExtendedStats(defaultStats);
          return;
        }

        setExtendedStats(defaultStats);
        setError(null);
        return;
      } else {
        setExtendedStats((data ?? defaultStats) as ExtendedStats);
      }
      
    } catch (error) {
      const defaultStats: ExtendedStats = {
        total_views: 0,
        project_views: 0,
        profile_views: 0,
        unique_visitors: 0,
        company_views: 0,
        total_projects: postsCount,
        completed_projects: 0,
        total_reactions: 0,
        total_comments: 0,
        last_updated: new Date().toISOString()
      };

      setExtendedStats(defaultStats);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getEngagementRate = () => {
    if (!extendedStats || extendedStats.total_views === 0) return 0;
    const totalEngagement = extendedStats.total_reactions + extendedStats.total_comments;
    return ((totalEngagement / extendedStats.total_views) * 100).toFixed(1);
  };

  const getCompanyInterestRate = () => {
    if (!extendedStats || extendedStats.total_views === 0) return 0;
    return ((extendedStats.company_views / extendedStats.total_views) * 100).toFixed(1);
  };

  if (loading) return null;

  if (error) return null;

  if (!extendedStats) return null;

  return (
    <div className="space-y-2">
      {/* Extended Stats - Premium Feature */}
      <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Estadísticas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
              {/* Total Views */}
              <div className="bg-blue-50 p-1 rounded border border-blue-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Eye className="h-2 w-2 text-blue-600" />
                  <span className="font-medium text-blue-900 text-xs">Vistas</span>
                </div>
                <p className="text-sm font-bold text-blue-900">{formatNumber(extendedStats.total_views)}</p>
              </div>

              {/* Profile Views */}
              <div className="bg-green-50 p-1 rounded border border-green-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Users className="h-2 w-2 text-green-600" />
                  <span className="font-medium text-green-900 text-xs">Perfil</span>
                </div>
                <p className="text-sm font-bold text-green-900">{formatNumber(extendedStats.profile_views)}</p>
              </div>

              {/* Project Views */}
              <div className="bg-purple-50 p-1 rounded border border-purple-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Briefcase className="h-2 w-2 text-purple-600" />
                  <span className="font-medium text-purple-900 text-xs">Proyectos</span>
                </div>
                <p className="text-sm font-bold text-purple-900">{formatNumber(extendedStats.project_views)}</p>
              </div>

              {/* Unique Visitors */}
              <div className="bg-orange-50 p-1 rounded border border-orange-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <TrendingUp className="h-2 w-2 text-orange-600" />
                  <span className="font-medium text-orange-900 text-xs">Únicos</span>
                </div>
                <p className="text-sm font-bold text-orange-900">{formatNumber(extendedStats.unique_visitors)}</p>
              </div>

              {/* Company Views */}
              <div className="bg-red-50 p-1 rounded border border-red-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Building className="h-2 w-2 text-red-600" />
                  <span className="font-medium text-red-900 text-xs">Empresas</span>
                </div>
                <p className="text-sm font-bold text-red-900">{formatNumber(extendedStats.company_views)}</p>
              </div>

              {/* Total Reactions */}
              <div className="bg-pink-50 p-1 rounded border border-pink-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Heart className="h-2 w-2 text-pink-600" />
                  <span className="font-medium text-pink-900 text-xs">Reacciones</span>
                </div>
                <p className="text-sm font-bold text-pink-900">{formatNumber(extendedStats.total_reactions)}</p>
              </div>

              {/* Total Comments */}
              <div className="bg-indigo-50 p-1 rounded border border-indigo-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <MessageCircle className="h-2 w-2 text-indigo-600" />
                  <span className="font-medium text-indigo-900 text-xs">Comentarios</span>
                </div>
                <p className="text-sm font-bold text-indigo-900">{formatNumber(extendedStats.total_comments)}</p>
              </div>

              {/* Completed Projects */}
              <div className="bg-teal-50 p-1 rounded border border-teal-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Award className="h-2 w-2 text-teal-600" />
                  <span className="font-medium text-teal-900 text-xs">Completados</span>
                </div>
                <p className="text-sm font-bold text-teal-900">{extendedStats.completed_projects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
