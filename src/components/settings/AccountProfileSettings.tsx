import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, MapPin, Briefcase } from "lucide-react";

export function AccountProfileSettings() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [location, setlocation] = useState("");
  const [career, setCareer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const blockedWords = [
    'puta',
    'puto',
    'mierda',
    'marica',
    'gonorrea',
    'hijueputa',
  ];

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('username, bio, location, career')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { error: insertError } = await (supabase as any)
          .from('profiles')
          .insert({ id: user.id, updated_at: new Date().toISOString() });

        if (insertError) {
          const code = (insertError as any)?.code as string | undefined;
          const status = (insertError as any)?.status as number | undefined;
          if (code !== '23505' && status !== 409) throw insertError;
        }
      }

      setUsername(data?.username || "");
      setEmail(user.email || "");
      setBio(data?.bio || "");
      setlocation(data?.location || "");
      setCareer(data?.career || "");
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const updateProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found");

      const { data: existingRow, error: existingError } = await (supabase as any)
        .from('profiles')
        .select('username, last_name_change')
        .eq('id', user.id)
        .maybeSingle();

      if (existingError) throw existingError;

      const prevUsername = (existingRow as any)?.username as string | null | undefined;
      const nextUsername = username.trim();
      const nameChanged = Boolean(nextUsername) && nextUsername !== (prevUsername || "");

      if (nameChanged) {
        const lower = nextUsername.toLowerCase();
        if (blockedWords.some((w) => lower.includes(w))) {
          toast({
            variant: "destructive",
            title: "Nombre no permitido",
            description: "Tu nombre de usuario contiene lenguaje no permitido.",
          });
          return;
        }

        const lastChange = (existingRow as any)?.last_name_change as string | null | undefined;
        if (lastChange) {
          const last = new Date(lastChange);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 30) {
            toast({
              variant: "destructive",
              title: "Cambio de nombre limitado",
              description: `Puedes cambiar tu nombre nuevamente en ${30 - diffDays} día(s).`,
            });
            return;
          }
        }
      }

      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          username: nextUsername,
          bio: bio.trim(),
          location: location.trim(),
          career: career.trim(),
          ...(nameChanged ? { last_name_change: new Date().toISOString() } : {}),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Tu información del perfil ha sido guardada",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el perfil",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await updateProfile();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Información del perfil
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nombre de usuario</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu nombre de usuario"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              El correo electrónico no se puede cambiar aquí
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="career">Profesión/Carrera</Label>
            <Input
              id="career"
              value={career}
              onChange={(e) => setCareer(e.target.value)}
              placeholder="Ej: Desarrollador Web, Estudiante de Ingeniería"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setlocation(e.target.value)}
              placeholder="Ej: Ciudad, País"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biografía</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntanos sobre ti..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
