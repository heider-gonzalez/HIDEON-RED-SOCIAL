import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function SecuritySettings() {
  const navigate = useNavigate();
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const expiresAt = data?.session?.expires_at ?? null;
      setSessionExpiresAt(expiresAt);
    };
    void run();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center mb-6 gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Contraseña y seguridad</h1>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Cambiar contraseña</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Actualiza tu contraseña para mantener tu cuenta segura.
          </p>
          <PasswordChangeForm />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-1">Dónde has iniciado sesión</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Revisa la sesión actual.
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sesión actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {sessionExpiresAt
                  ? `Expira: ${new Date(sessionExpiresAt * 1000).toLocaleString()}`
                  : "No se pudo obtener la información de la sesión."}
              </div>
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
