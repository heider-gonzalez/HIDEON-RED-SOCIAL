import { useState, useEffect } from "react";
import { useMatchRecommendations } from "@/hooks/use-match-recommendations";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, X, Star, MapPin, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { getHybridUrl } from "@/lib/hybrid-url";

const Discover = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    currentProfile,
    handleLike,
    handlePass,
    handleSuperLike,
    loading
  } = useMatchRecommendations(user?.id);

  useEffect(() => {
    if (!isMobile) return;
    navigate("/leaderboard", { replace: true });
  }, [isMobile, navigate]);

  const handleAction = async (action: 'like' | 'pass' | 'super_like') => {
    if (!currentProfile) return;

    try {
      switch (action) {
        case 'like':
          await handleLike();
          break;
        case 'pass':
          await handlePass();
          break;
        case 'super_like':
          await handleSuperLike();
          break;
      }

      if (action === 'like') {
        toast({
          title: "¡Like enviado!",
          description: `Le diste like a ${currentProfile.username}`,
        });
      } else if (action === 'super_like') {
        toast({
          title: "¡Super Like enviado!",
          description: `Le diste un Super Like a ${currentProfile.username}`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar la acción",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Cargando perfiles...</span>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <Heart className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">¡No hay más perfiles!</h2>
        <p className="text-muted-foreground mb-4">
          Hemos revisado todos los perfiles disponibles por ahora.
        </p>
        <Button onClick={() => window.location.reload()}>
          Buscar más perfiles
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Descubrir</h1>
          <p className="text-muted-foreground">
            Encuentra personas increíbles cerca de ti
          </p>
        </div>

        <Card className="relative overflow-hidden shadow-lg">
          <div className="aspect-[3/4] relative">
            <img
              src={getHybridUrl(currentProfile.avatar_url) || "/placeholder.svg"}
              alt={currentProfile.username}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{currentProfile.username}</h2>
                {currentProfile.career && (
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {currentProfile.career}
                  </Badge>
                )}
              </div>
              
              {currentProfile.bio && (
                <p className="text-sm opacity-90 mb-3">{currentProfile.bio}</p>
              )}
              
              <div className="flex flex-wrap gap-2">
                {currentProfile.career && (
                  <Badge variant="outline" className="bg-white/10 border-white/30 text-white">
                    {currentProfile.career}
                  </Badge>
                )}
                {currentProfile.semester && (
                  <Badge variant="outline" className="bg-white/10 border-white/30 text-white">
                    Semestre {currentProfile.semester}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center items-center gap-6 mt-8">
          <Button
            size="lg"
            variant="outline"
            className="h-14 w-14 rounded-full p-0 border-2 hover:border-red-500 hover:text-red-500"
            onClick={() => handleAction('pass')}
          >
            <X className="h-6 w-6" />
          </Button>

          <Button
            size="lg"
            className="h-16 w-16 rounded-full p-0 bg-primary hover:bg-primary/90"
            onClick={() => handleAction('like')}
          >
            <Heart className="h-7 w-7" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-14 w-14 rounded-full p-0 border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white"
            onClick={() => handleAction('super_like')}
          >
            <Star className="h-6 w-6" />
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mt-6">
          <div className="text-sm text-muted-foreground">
            Descubriendo perfiles...
          </div>
        </div>
      </div>
    </div>
  );
};

export default Discover;