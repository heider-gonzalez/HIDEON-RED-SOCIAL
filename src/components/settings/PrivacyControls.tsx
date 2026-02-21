import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Users, Lock, Globe } from "lucide-react";

export function PrivacyControls() {
  const [profilePublic, setProfilePublic] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showBirthDate, setShowBirthDate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('is_public, show_email, show_birth_date')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfilePublic(data?.is_public || false);
      setShowEmail(data?.show_email || false);
      setShowBirthDate(data?.show_birth_date || false);
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const updatePrivacySetting = async (field: string, value: boolean) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      const { error } = await (supabase as any)
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Configuración actualizada",
        description: "Tus preferencias de privacidad han sido guardadas",
      });
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la configuración",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePublicChange = (checked: boolean) => {
    setProfilePublic(checked);
    updatePrivacySetting('is_public', checked);
  };

  const handleShowEmailChange = (checked: boolean) => {
    setShowEmail(checked);
    updatePrivacySetting('show_email', checked);
  };

  const handleShowBirthDateChange = (checked: boolean) => {
    setShowBirthDate(checked);
    updatePrivacySetting('show_birth_date', checked);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Visibilidad del perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="profile-public" className="text-base">Perfil público</Label>
              <p className="text-sm text-muted-foreground">
                Permite que cualquiera vea tu perfil y publicaciones
              </p>
            </div>
            <Switch
              id="profile-public"
              checked={profilePublic}
              onCheckedChange={handleProfilePublicChange}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Información visible
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-email" className="text-base">Mostrar correo electrónico</Label>
              <p className="text-sm text-muted-foreground">
                Permite que otros usuarios vean tu email en tu perfil
              </p>
            </div>
            <Switch
              id="show-email"
              checked={showEmail}
              onCheckedChange={handleShowEmailChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-birthdate" className="text-base">Mostrar fecha de nacimiento</Label>
              <p className="text-sm text-muted-foreground">
                Muestra tu fecha de nacimiento en tu perfil
              </p>
            </div>
            <Switch
              id="show-birthdate"
              checked={showBirthDate}
              onCheckedChange={handleShowBirthDateChange}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Control de datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Tus datos están seguros</h3>
            <p className="text-sm text-muted-foreground">
              • Tus mensajes privados solo son visibles para los participantes
            </p>
            <p className="text-sm text-muted-foreground">
              • Tu información personal nunca se comparte con terceros
            </p>
            <p className="text-sm text-muted-foreground">
              • Puedes eliminar tu cuenta en cualquier momento desde la configuración
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
