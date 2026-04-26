import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ImagePlus, User, Camera, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfileImage } from "@/hooks/use-profile-image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function PersonalizationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleImageUpload, loading } = useProfileImage();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, cover_url, bio')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const url = await handleImageUpload('avatar', e);
      if (url) {
        setProfile(prev => ({ ...prev, avatar_url: url }));
        toast({
          title: "Foto actualizada",
          description: "Tu foto de perfil ha sido actualizada correctamente."
        });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const url = await handleImageUpload('cover', e);
      if (url) {
        setProfile(prev => ({ ...prev, cover_url: url }));
        toast({
          title: "Banner actualizado",
          description: "Tu banner de perfil ha sido actualizado correctamente."
        });
      }
    } catch (error) {
      console.error('Error uploading cover:', error);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="mb-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Personalización</h1>
        <p className="text-muted-foreground">Configura tu foto de perfil y banner</p>
      </div>
      
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        {/* Profile Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Vista previa del perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Cover Image */}
              <div className="relative h-32 bg-muted rounded-t-lg overflow-hidden">
                {profile.cover_url ? (
                  <img 
                    src={profile.cover_url} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              
              {/* Avatar */}
              <div className="absolute -bottom-8 left-4">
                <Avatar className="h-16 w-16 border-4 border-background">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            
            <div className="pt-10 pb-4">
              <h3 className="font-semibold text-lg">{profile.username || 'Usuario'}</h3>
              <p className="text-muted-foreground text-sm">{profile.bio || 'Sin biografía'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Foto de perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <p className="font-medium">Imagen de perfil</p>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG o GIF. Máximo 2MB.
                </p>
              </div>
              
              <div>
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={loading}
                />
                <label htmlFor="avatar-upload">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    asChild
                  >
                    <span className="cursor-pointer">
                      {loading ? 'Subiendo...' : 'Cambiar'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5" />
              Banner de perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="w-full h-24 bg-muted rounded-lg overflow-hidden">
                {profile.cover_url ? (
                  <img 
                    src={profile.cover_url} 
                    alt="Banner" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Banner de perfil</p>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG o GIF. Máximo 2MB. Recomendado: 1500x500px
                  </p>
                </div>
                
                <div>
                  <input
                    type="file"
                    id="cover-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={loading}
                  />
                  <label htmlFor="cover-upload">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      asChild
                    >
                      <span className="cursor-pointer">
                        {loading ? 'Subiendo...' : profile.cover_url ? 'Cambiar' : 'Agregar'}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
