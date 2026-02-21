
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";

export default function SecuritySettings() {
  const navigate = useNavigate();

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
          <h2 className="text-lg font-semibold mb-1">Consejos de seguridad</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Usa una contraseña única y difícil de adivinar</p>
            <p>• No compartas tu contraseña con nadie</p>
            <p>• Cambia tu contraseña regularmente</p>
            <p>• Usa autenticación de dos factores cuando esté disponible</p>
          </div>
        </div>
      </div>
    </div>
  );
}
