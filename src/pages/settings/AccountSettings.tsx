
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AccountProfileSettings } from "@/components/settings/AccountProfileSettings";
import { PersonalDataSettings } from "@/components/settings/PersonalDataSettings";

export default function AccountSettings() {
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
        <h1 className="text-2xl font-bold">Cuenta</h1>
      </div>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Información del perfil</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Actualiza tu información personal y cómo te presentas en la plataforma.
          </p>
          <AccountProfileSettings />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-1">Datos personales</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Gestiona tu información personal sensible.
          </p>
          <PersonalDataSettings />
        </div>
      </div>
    </div>
  );
}
