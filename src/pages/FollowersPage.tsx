import React, { useMemo, useState, useEffect } from "react";
import { FullScreenPageLayout } from "@/components/layout/FullScreenPageLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { getFollowers, getFollowing, type Follower, type Following } from "@/lib/api/followers";
import { FollowButton } from "@/components/FollowButton";
import { useBatchFollowingStatus } from "@/hooks/use-batch-following-status";
import { useLocation } from "react-router-dom";

const FollowersPage = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("followers");
  const [authError, setAuthError] = useState<string | null>(null);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Auth error:', error);
          setAuthError('Error de autenticación. Por favor, inicia sesión nuevamente.');
          return;
        }
        if (user) {
          setCurrentUserId(user.id);
          setAuthError(null);

          const params = new URLSearchParams(location.search);
          const resolvedTargetUserId = params.get("userId") || user.id;
          setTargetUserId(resolvedTargetUserId);
          const tab = params.get("tab");
          if (tab === "followers" || tab === "following") {
            setActiveTab(tab);
          }
          
          // Load followers and following for the target profile
          const [followersData, followingData] = await Promise.all([
            getFollowers(resolvedTargetUserId),
            getFollowing(resolvedTargetUserId)
          ]);
          
          setFollowers(followersData);
          setFollowing(followingData);
        } else {
          setAuthError('No hay usuario autenticado');
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setAuthError('Error al cargar el usuario');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [location.search]);

  const isViewingOwnList = !!currentUserId && !!targetUserId && currentUserId === targetUserId;
  const pageTitle = isViewingOwnList ? "Seguidores" : "Seguidores del usuario";

  // Optimización: obtener todos los IDs para batch following status
  const followerIds = followers.map(f => f.id);
  const followingIds = following.map(f => f.id);
  const allUserIds = useMemo(() => [...followerIds, ...followingIds], [followerIds.join('|'), followingIds.join('|')]);
  
  const { 
    getFollowingStatus, 
    updateFollowingStatus, 
    isLoading: batchLoading 
  } = useBatchFollowingStatus(allUserIds);

  const renderFollowers = () => {
    if (loading || batchLoading) {
      return (
        <div className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Cargando seguidores...</p>
        </div>
      );
    }

    if (!followers.length) {
      return (
        <div className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">
            {isViewingOwnList ? "No tienes seguidores todavía" : "Aún no tiene seguidores"}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {isViewingOwnList
              ? "Cuando otros usuarios te sigan, aparecerán aquí"
              : "Cuando otros usuarios lo sigan, aparecerán aquí"}
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y">
        {followers.map(follower => (
          <div key={follower.id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={follower.avatar_url || undefined} />
                <AvatarFallback>
                  {follower.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{follower.username}</p>
                <p className="text-xs text-muted-foreground">
                  Te sigue desde {new Date(follower.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <FollowButton 
              targetUserId={follower.id} 
              size="sm" 
              batchFollowingStatus={getFollowingStatus(follower.id)}
              onBatchFollowingUpdate={updateFollowingStatus}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderFollowing = () => {
    if (loading || batchLoading) {
      return (
        <div className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Cargando seguidos...</p>
        </div>
      );
    }

    if (!following.length) {
      return (
        <div className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <UserPlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">
            {isViewingOwnList ? "No sigues a nadie todavía" : "Aún no sigue a nadie"}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {isViewingOwnList
              ? "Encuentra personas interesantes para seguir"
              : "Cuando siga a alguien, aparecerá aquí"}
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y">
        {following.map(user => (
          <div key={user.id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground">
                  Lo sigues desde {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <FollowButton 
              targetUserId={user.id} 
              size="sm" 
              batchFollowingStatus={getFollowingStatus(user.id)}
              onBatchFollowingUpdate={updateFollowingStatus}
            />
          </div>
        ))}
      </div>
    );
  };

  if (authError) {
    return (
      <FullScreenPageLayout title={pageTitle}>
        <div className="container px-4 max-w-4xl">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold">Error de autenticación</h3>
                <p className="text-sm text-muted-foreground mt-1">{authError}</p>
              </div>
              <Button onClick={() => window.location.reload()}>
                Intentar de nuevo
              </Button>
            </div>
          </Card>
        </div>
      </FullScreenPageLayout>
    );
  }

  return (
    <ErrorBoundary>
      <FullScreenPageLayout title={pageTitle}>
        <div className="container px-4 max-w-4xl pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full grid grid-cols-2">
              <TabsTrigger value="followers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Seguidores</span>
                <span className="sm:hidden">Seguidores</span>
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                  {followers.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="following" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Siguiendo</span>
                <span className="sm:hidden">Siguiendo</span>
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                  {following.length}
                </span>
              </TabsTrigger>
            </TabsList>
            
            <Card className="overflow-hidden">
              <TabsContent value="followers" className="m-0">
                {renderFollowers()}
              </TabsContent>
              
              <TabsContent value="following" className="m-0">
                {renderFollowing()}
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </FullScreenPageLayout>
    </ErrorBoundary>
  );
};

export default FollowersPage;