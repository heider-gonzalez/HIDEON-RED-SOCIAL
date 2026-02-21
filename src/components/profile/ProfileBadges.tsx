import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Award, Star, Shield, CheckCircle, Trophy, Zap, Target, Rocket, Gem } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/pages/Profile";

interface ProfileBadgesProps {
  profile: Profile;
}

interface BadgeData {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  badge_color: string;
  earned_date: string;
  is_active: boolean;
}

export function ProfileBadges({ profile }: ProfileBadgesProps) {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadBadges();
    }
  }, [profile?.id]);

  const loadBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_badges')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('is_active', true)
        .order('earned_date', { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      crown: <Crown className="h-4 w-4" />,
      award: <Award className="h-4 w-4" />,
      star: <Star className="h-4 w-4" />,
      shield: <Shield className="h-4 w-4" />,
      check: <CheckCircle className="h-4 w-4" />,
      trophy: <Trophy className="h-4 w-4" />,
      zap: <Zap className="h-4 w-4" />,
      target: <Target className="h-4 w-4" />,
      rocket: <Rocket className="h-4 w-4" />,
      gem: <Gem className="h-4 w-4" />,
    };
    return iconMap[iconName] || <Award className="h-4 w-4" />;
  };

  const getBadgeVariant = (color: string) => {
    const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline" | "premium"> = {
      primary: "default",
      secondary: "secondary",
      gold: "premium",
      silver: "outline",
      bronze: "secondary",
      success: "default",
      warning: "secondary",
      error: "destructive",
    };
    return variantMap[color] || "default";
  };

  const getBadgePriority = (badgeType: string) => {
    const priorityMap: Record<string, number> = {
      special: 1,
      verified: 2,
      achievement: 3,
      milestone: 4,
      expert: 5,
    };
    return priorityMap[badgeType] || 999;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insignias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-16 h-6 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (badges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insignias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Este perfil aún no ha obtenido insignias</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar badges por prioridad
  const sortedBadges = badges
    .filter((b) => b.badge_type !== 'premium')
    .sort((a, b) => getBadgePriority(a.badge_type) - getBadgePriority(b.badge_type));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Insignias</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Badges Especiales */}
          {sortedBadges.filter(b => b.badge_type === 'special').map((badge) => (
            <div key={badge.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="p-2 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full text-white">
                {getBadgeIcon(badge.badge_icon)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-blue-900">{badge.badge_name}</h4>
                  <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">Especial</Badge>
                </div>
                <p className="text-sm text-blue-700">{badge.badge_description}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Obtenida: {new Date(badge.earned_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}

          {/* Badges de Logros */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Logros</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedBadges.filter(b => b.badge_type === 'achievement' || b.badge_type === 'milestone').map((badge) => (
                <div key={badge.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                  <div className="p-2 bg-muted rounded-full">
                    {getBadgeIcon(badge.badge_icon)}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{badge.badge_name}</h5>
                    <p className="text-xs text-muted-foreground">{badge.badge_description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(badge.earned_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estadísticas de Badges */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total de insignias:</span>
              <span className="font-semibold">{sortedBadges.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Logros desbloqueados:</span>
              <span className="font-semibold text-blue-600">
                {badges.filter(b => b.badge_type === 'achievement' || b.badge_type === 'milestone').length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
